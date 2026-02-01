# OpenRouter Service Implementation Plan

## 1. Opis uslugi
Usluga OpenRouter to serwisowa warstwa aplikacji, ktora obsluguje komunikacje z API OpenRouter i dostarcza spojnosc integracji LLM (chat completions) dla warstwy API Astro. Usluga enkapsuluje konfiguracje, budowanie promptow, obsluge `response_format`, walidacje danych, retry/backoff, oraz mapowanie bledow na spójne odpowiedzi aplikacyjne.

Kluczowe komponenty uslugi (numerowane):
1. Konfiguracja i sekrety (API key, base URL, default model).
2. HTTP klient i transport (fetch + timeout + retry/backoff).
3. Budowanie payloadu chat (messages, model, params).
4. `response_format` i walidacja JSON Schema.
5. Parsowanie odpowiedzi i mapowanie bledow.
6. Observability (logi, metryki, trace-id).
7. Ochrona i polityki bezpieczenstwa (PII redaction, rate-limit).

## 2. Opis konstruktora
Konstruktor powinien przyjmowac konfiguracje i zaleznosci, aby ulatwic testy i kontrolowac zachowanie:
- `apiKey: string` (z `import.meta.env.OPENROUTER_API_KEY`)
- `baseUrl: string` (domyslnie `https://openrouter.ai/api/v1`)
- `defaultModel: string` (np. `openai/gpt-4.1-mini`)
- `defaultParams: ModelParams` (np. `temperature`, `max_tokens`, `top_p`)
- `timeoutMs: number` (np. 20000)
- `fetchImpl?: typeof fetch` (wstrzykiwany w testach)
- `appName?: string` i `appUrl?: string` (naglowki `HTTP-Referer`, `X-Title`)

Konstruktor powinien walidowac konfiguracje (guard clauses) i od razu ustawiac zaleznosci prywatne, np. `this.fetch`, `this.baseUrl`.

## 3. Publiczne metody i pola
1. `createChatCompletion(input: ChatInput): Promise<ChatResult>`
   - Funkcja bazowa do wysylki wiadomosci `system` + `user` + opcjonalne `assistant`.
   - Powinna wspierac per-request `model`, `params`, `response_format`.

2. `createStructuredCompletion(input: StructuredChatInput, schema: JsonSchema): Promise<StructuredResult>`
   - Wysylka z `response_format` typu `json_schema` oraz walidacja otrzymanego JSON.
   - Zwraca poprawny obiekt zgodny ze schematem albo blad walidacji.

3. `healthCheck(): Promise<HealthStatus>`
   - Lekki request (np. `models` lub minimalny chat) do weryfikacji dostepnosci API.

4. `getDefaultModel(): string`
   - Publiczny getter uzywany w warstwie API.

Publiczne pola (opcjonalnie):
- `defaultModel`, `defaultParams` (tylko do odczytu).

## 4. Prywatne metody i pola
1. `buildHeaders(): HeadersInit`
   - Dodaje `Authorization: Bearer <apiKey>`, `Content-Type: application/json`.
   - Opcjonalnie `HTTP-Referer` i `X-Title` wg wymagan OpenRouter.

2. `buildMessages(system: string, user: string, history?: Message[]): Message[]`
   - Waliduje i uklada kolejnosc: system -> history -> user.

3. `buildRequestBody(input: ChatInput): OpenRouterPayload`
   - Doklada `model`, `messages`, `response_format`, `temperature`, `max_tokens`, itd.

4. `request<T>(path: string, body: unknown): Promise<T>`
   - Obsluguje timeout, retry/backoff, mapowanie bledow HTTP.

5. `parseResponse(raw: OpenRouterResponse): ChatResult`
   - Wyciaga `choices[0].message.content` oraz meta.

6. `parseStructuredResponse(raw: OpenRouterResponse, schema: JsonSchema): StructuredResult`
   - Parsuje JSON z tresci i waliduje zgodnosc ze schematem.

7. `mapError(error: unknown): OpenRouterError`
   - Normalizuje bledy (network, timeout, 4xx, 5xx, schema).

Pola prywatne:
- `apiKey`, `baseUrl`, `defaultModel`, `defaultParams`, `timeoutMs`, `fetch`.

## 5. Obsluga bledow
Potencjalne scenariusze bledow (numerowane):
1. Brak `OPENROUTER_API_KEY` lub pusty string.
2. Bledna nazwa modelu (4xx).
3. Niepoprawny `response_format` (4xx).
4. Timeout polaczenia lub brak sieci.
5. Przekroczenie limitow (429).
6. Bledy serwera OpenRouter (5xx).
7. Niepoprawny JSON w odpowiedzi modelu.
8. Niezgodnosc odpowiedzi z `json_schema`.
9. Przekroczenie limitu tokenow.

Zalecenia:
- Mapuj bledy na spójny typ `OpenRouterError` z polami `code`, `message`, `status`.
- Dodaj retry z exponential backoff dla 429 i 5xx.
- Zawsze loguj `requestId` i `model` (bez tresci promptow).

## 6. Kwestie bezpieczenstwa
- Przechowuj `OPENROUTER_API_KEY` tylko po stronie serwera (Astro API routes).
- Nigdy nie loguj tresci promptow ani kluczy API.
- Dodaj rate limiting na endpointach korzystajacych z uslugi (np. w `src/lib/rate-limit.ts`).
- Opcjonalnie maskuj PII przed wyslaniem (email, telefon).
- Stosuj timeout i limituj `max_tokens`.
- Waliduj wejscie uzytkownika (Zod) przed wyslaniem do LLM.

## 7. Plan wdrozenia krok po kroku
1. Konfiguracja srodowiska
   - Dodaj zmienne srodowiskowe do `.env` i `.env.example`:
     - `OPENROUTER_API_KEY`
     - `OPENROUTER_BASE_URL` (domyslnie `https://openrouter.ai/api/v1`)
     - `OPENROUTER_DEFAULT_MODEL` (np. `openai/gpt-4.1-mini`)
     - `OPENROUTER_TIMEOUT_MS` (np. `20000`)

2. Definicje typow (TypeScript)
   - Utworz typy w `src/types.ts`:
     - `Message`, `ModelParams`, `ChatInput`, `StructuredChatInput`
     - `OpenRouterPayload`, `OpenRouterResponse`, `OpenRouterError`

3. Implementacja serwisu
   - Dodaj plik `src/lib/services/openrouter.ts`.
   - Zaimplementuj konstruktor oraz publiczne/prywatne metody.
   - Uzyj `fetch` z timeoutem i retry/backoff.

4. Integracja z API Astro
   - Dodaj/zmien endpoint w `src/pages/api` (np. `chat.ts`).
   - W endpointach waliduj wejscie Zod i wywoluj `OpenRouterService`.

5. Przykłady konfiguracji kluczowych elementow
   1) Komunikat systemowy:
      - `system: "You are a helpful assistant. Reply in Polish."`
   2) Komunikat uzytkownika:
      - `user: "Stworz 3 pytania do nauki o Astro 5."`
   3) `response_format` (JSON Schema):
      - `{ type: "json_schema", json_schema: { name: "Flashcards", strict: true, schema: { type: "object", properties: { cards: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } } }, required: ["cards"] } } }`
   4) Nazwa modelu:
      - `model: "openai/gpt-4.1-mini"`
   5) Parametry modelu:
      - `temperature: 0.2`, `max_tokens: 700`, `top_p: 0.9`

6. Walidacja `response_format`
   - Po odebraniu odpowiedzi sparsuj JSON z `choices[0].message.content`.
   - Zweryfikuj zgodnosc ze schematem (np. Ajv).

7. Testy i monitoring
   - Testy jednostkowe serwisu (mock fetch).
   - Testy integracyjne endpointow (mock OpenRouter).
   - Loguj `requestId`, `model`, `durationMs`, `status`.

8. Hardening i rollout
   - Ustaw limity rate i cache na wynikach (opcjonalnie).
   - Dodaj feature flag, aby latwo wylaczyc usluge.
   - Zweryfikuj konfiguracje w srodowisku staging.
