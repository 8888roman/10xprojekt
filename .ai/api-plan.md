# REST API Plan

## 1. Zasoby
- **Flashcards** → `public.flashcards`
- **Generations** → `public.generations`
- **Generation error logs** → `public.generation_error_logs`
- **Auth / Users** → `auth.users` (Supabase Auth, not exposed as REST resource)

## 2. Punkty końcowe
All endpoints live under `/api` (Astro `src/pages/api`). Authentication via Supabase JWT; RLS enforces `user_id` scoping. List endpoints support pagination and optional filtering/sorting.

### 2.1 Flashcards
**GET** `/api/flashcards`  
List the authenticated user's flashcards.

- **Query parameters:** `page` (default 1), `limit` (default 20), `source` (`ai-full|ai-edited|manual`), `generation_id`, `sort` (`created_at|updated_at`), `order` (`asc|desc`)
- **Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "front": "string",
      "back": "string",
      "source": "ai-full",
      "created_at": "2025-01-31T12:00:00Z",
      "updated_at": "2025-01-31T12:00:00Z",
      "generation_id": 1,
      "user_id": "uuid"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```
- **Success:** `200 OK`
- **Errors:** `401 Unauthorized`, `500 Internal Server Error`

**GET** `/api/flashcards/[id]`  
Get a single flashcard by id (owned by the user).

- **Response (200):**
```json
{
  "id": 1,
  "front": "string",
  "back": "string",
  "source": "ai-full",
  "created_at": "2025-01-31T12:00:00Z",
  "updated_at": "2025-01-31T12:00:00Z",
  "generation_id": 1,
  "user_id": "uuid"
}
```
- **Success:** `200 OK`
- **Errors:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

**POST** `/api/flashcards`  
Create a flashcard (manual or AI-accepted).

- **Request body:**
```json
{
  "front": "string",
  "back": "string",
  "source": "manual",
  "generation_id": null
}
```
- **Response (201):** created flashcard (same shape as GET)
- **Success:** `201 Created`
- **Errors:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found` (invalid `generation_id`), `500 Internal Server Error`

**PATCH** `/api/flashcards/[id]`  
Update a flashcard (only provided fields).

- **Request body:**
```json
{
  "front": "string",
  "back": "string",
  "source": "ai-edited"
}
```
- **Response (200):** updated flashcard (same shape as GET)
- **Success:** `200 OK`
- **Errors:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

**DELETE** `/api/flashcards/[id]`  
Delete a flashcard.

- **Response (204):** no body
- **Success:** `204 No Content`
- **Errors:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

### 2.2 Generations
**GET** `/api/generations`  
List generation sessions (history/stats).

- **Query parameters:** `page`, `limit`, `sort` (`created_at|updated_at`), `order`
- **Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "model": "string",
      "generated_count": 10,
      "accepted_unedited_count": 5,
      "accepted_edited_count": 2,
      "source_text_hash": "string",
      "source_text_length": 5000,
      "generation_duration": 3000,
      "created_at": "2025-01-31T12:00:00Z",
      "updated_at": "2025-01-31T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```
- **Success:** `200 OK`
- **Errors:** `401 Unauthorized`, `500 Internal Server Error`

**POST** `/api/generations`  
Record a completed AI generation session (analytics + linking to flashcards).

- **Request body:**
```json
{
  "model": "string",
  "generated_count": 10,
  "accepted_unedited_count": 5,
  "accepted_edited_count": 2,
  "source_text_hash": "string",
  "source_text_length": 5000,
  "generation_duration": 3000
}
```
- **Response (201):** created generation
- **Success:** `201 Created`
- **Errors:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

### 2.3 Generation error logs
**GET** `/api/generation-error-logs`  
List error log entries (append-only).

- **Query parameters:** `page`, `limit`, `sort` (`created_at`), `order`
- **Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "model": "string",
      "source_text_hash": "string",
      "source_text_length": 5000,
      "error_code": "string",
      "error_message": "string",
      "created_at": "2025-01-31T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2 }
}
```
- **Success:** `200 OK`
- **Errors:** `401 Unauthorized`, `500 Internal Server Error`

**POST** `/api/generation-error-logs`  
Append an error log entry when LLM call fails.

- **Request body:**
```json
{
  "model": "string",
  "source_text_hash": "string",
  "source_text_length": 5000,
  "error_code": "string",
  "error_message": "string"
}
```
- **Response (201):** created log entry
- **Success:** `201 Created`
- **Errors:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

### 2.4 Business logic: AI flashcard generation
**POST** `/api/flashcards/generate`  
Generate flashcard proposals from input text (no persistence).

- **Request body:**
```json
{
  "text": "string"
}
```
- **Response (200):**
```json
{
  "proposals": [
    { "front": "string", "back": "string" }
  ]
}
```
- **Success:** `200 OK`
- **Errors:** `400 Bad Request`, `401 Unauthorized`, `429 Too Many Requests`, `502 Bad Gateway`, `503 Service Unavailable`, `500 Internal Server Error`

### 2.5 Account
**DELETE** `/api/account`  
Delete the authenticated user account (GDPR erasure).

- **Response (204):** no body
- **Success:** `204 No Content`
- **Errors:** `401 Unauthorized`, `500 Internal Server Error`

## 3. Uwierzytelnianie i autoryzacja
- **Mechanism:** Supabase Auth (email/password), JWT passed via `Authorization: Bearer <access_token>` or cookie.
- **Authorization:** RLS policies enforce `auth.uid() = user_id` for `flashcards`, `generations`, `generation_error_logs`.
- **API behavior:** Validate JWT on each request; return `401 Unauthorized` for missing/invalid tokens.
- **Account deletion:** requires server-side service role or Supabase admin API to delete the user, cascading to related data.

## 4. Walidacja i logika biznesowa
### 4.1 Validation per resource
- **Flashcards**
  - `front`: required, max 200 chars.
  - `back`: required, max 500 chars.
  - `source`: required, `ai-full|ai-edited|manual`.
  - `generation_id`: optional; if present must reference a generation owned by the user.
  - `user_id`: set from JWT; never accepted in request body.
- **Generations**
  - `model`: required, max 100 chars.
  - `generated_count`: required, integer ≥ 0.
  - `accepted_unedited_count`, `accepted_edited_count`: optional, integer ≥ 0.
  - `source_text_hash`: required, length 64 (SHA-256).
  - `source_text_length`: required, 1000–10000.
  - `generation_duration`: required, integer ≥ 0.
  - `user_id`: set from JWT.
- **Generation error logs**
  - `model`: required, max 100 chars.
  - `source_text_hash`: required, length 64.
  - `source_text_length`: required, 1000–10000.
  - `error_code`: required, max 100 chars.
  - `error_message`: required, text.
  - `user_id`: set from JWT.
- **Generate proposals**
  - `text`: required, trimmed length 1000–10000.

### 4.2 Business logic mapping
- **AI generation flow:** `POST /api/flashcards/generate` validates input length, calls LLM API, returns proposals; user accepts/edits/rejects; on save the client calls `POST /api/generations` and then `POST /api/flashcards` for each accepted card with `source` and `generation_id`.
- **Manual flashcards:** `POST /api/flashcards` with `source: "manual"` and `generation_id: null`.
- **Editing/Deleting:** `PATCH /api/flashcards/[id]` and `DELETE /api/flashcards/[id]` operate only on user-owned records.
- **Stats:** Use `generations` to track generated vs accepted counts; list endpoints power dashboards.
- **Error logging:** On LLM failures, create `generation_error_logs` via server-side logic.
