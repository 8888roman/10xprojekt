# API Endpoint Implementation Plan: POST /api/flashcards/generate

## 1. Przegląd punktu końcowego
This endpoint accepts raw text, invokes the LLM service to generate flashcard proposals, and returns a list of `{ front, back }` pairs. It does not persist flashcards or generations; persistence happens in separate endpoints.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/flashcards/generate`
- Parametry:
  - Wymagane: none in path/query
  - Opcjonalne: none
- Request Body:
```json
{
  "text": "string"
}
```

## 3. Wykorzystywane typy
- `GenerateFlashcardsCommand` (request body)
- `FlashcardProposalDto` (proposal item)
- `GenerateFlashcardsResponseDto` (response body)

## 3. Szczegóły odpowiedzi
- `200 OK` on success:
```json
{
  "proposals": [
    { "front": "string", "back": "string" }
  ]
}
```
- `400 Bad Request` on validation errors (text missing or length outside 1000–10000 after trim)
- `401 Unauthorized` when JWT is missing/invalid
- `429 Too Many Requests` when rate limit exceeded
- `502 Bad Gateway` when LLM API returns an upstream error
- `503 Service Unavailable` when LLM API is unavailable/timeouts
- `500 Internal Server Error` on unhandled server errors

## 4. Przepływ danych
1. Astro API route receives the request and retrieves `supabase` from `context.locals`.
2. Validate auth (Supabase JWT). Reject unauthenticated requests with `401`.
3. Parse and validate body with Zod:
   - `text` required.
   - `text.trim().length` must be 1000–10000.
4. Call existing service `src/lib/services/flashcard-generate.ts` to:
   - Normalize input text.
   - Call LLM provider.
   - Map results to `FlashcardProposalDto[]`.
5. If LLM call fails, log to `generation_error_logs` (see section 6) and return a `502` or `503` depending on error class.
6. Respond with `GenerateFlashcardsResponseDto`.

## 5. Względy bezpieczeństwa
- **Authentication:** Use Supabase Auth; return `401` for missing/invalid JWT.
- **Authorization:** RLS is not used directly here because no DB reads/writes are required for success, but `generation_error_logs` insert should include `user_id` from JWT so RLS permits it.
- **Input validation:** Zod schema enforces length bounds to protect LLM cost and prevent abuse.
- **Rate limiting:** Apply per-user rate limiting (existing `src/lib/rate-limit.ts` or middleware) to control LLM usage.
- **Data privacy:** Do not persist raw input text; only hash/length if logging is needed.

## 6. Obsługa błędów
Potential failures and responses:
- Invalid body / missing text / text length out of range → `400`.
- Unauthenticated request → `401`.
- Rate limit exceeded → `429`.
- Upstream LLM error (HTTP error/invalid response) → `502`.
- LLM timeout/unavailable → `503`.
- Unexpected server error → `500`.

Error logging to `generation_error_logs` when LLM fails:
- Use `CreateGenerationErrorLogCommand` values derived from the request:
  - `model`: LLM model name used by the service.
  - `source_text_hash`: SHA-256 hash of trimmed text.
  - `source_text_length`: trimmed length.
  - `error_code` / `error_message`: normalized error details.
- Insert via `supabase` client in API route or service layer. Ensure `user_id` is set from JWT (not in payload).

## 7. Wydajność
- Avoid persisting proposals; return directly.
- Enforce strict input length and rate limiting to reduce LLM cost.
- Keep LLM calls in service layer to allow retries or caching later.
- Consider adding request timeout around the LLM call to fail fast and return `503`.

## 8. Kroki implementacji
1. Create or update the Astro API route `src/pages/api/flashcards/generate.ts` with `export const prerender = false`.
2. Define Zod schema for `GenerateFlashcardsCommand`:
   - `text`: string, required, trim, length 1000–10000.
3. In the handler:
   - Read `supabase` from `context.locals`.
   - Validate JWT and fail with `401` when missing/invalid.
4. Call `flashcard-generate` service with sanitized text.
5. On LLM failure:
   - Map error to `error_code`/`error_message`.
   - Insert log into `generation_error_logs`.
   - Return `502` or `503`.
6. Return `200` with `GenerateFlashcardsResponseDto`.
7. Add or reuse rate limiter middleware (per-user) for this route.
8. Add tests (unit for service, integration for route) for:
   - Valid request.
   - Text length validation.
   - Auth required.
   - LLM failure paths and error logging.
