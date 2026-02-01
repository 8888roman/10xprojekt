# REST API Plan

## 1. Resources

| Resource | Database table | Description |
|----------|----------------|-------------|
| **Flashcards** | `public.flashcards` | User-owned flashcard items (front, back, source, optional link to generation). |
| **Generations** | `public.generations` | AI generation sessions (model, counts, source hash, duration) for analytics. |
| **Generation error logs** | `public.generation_error_logs` | Append-only log of failed AI generation attempts. |
| **Auth / Users** | `auth.users` (Supabase) | Managed by Supabase Auth; not exposed as a REST resource. Identity is used for authorization (RLS and API). |

---

## 2. Endpoints

All API routes are assumed to live under `/api` (e.g. `src/pages/api/` in Astro). The authenticated user is inferred from the Supabase JWT (`auth.uid()`); RLS enforces that users only access their own rows. All list endpoints support pagination and, where relevant, filtering and sorting.

---

### 2.1 Flashcards

#### List flashcards

- **Method:** `GET`
- **Path:** `/api/flashcards`
- **Description:** Returns the authenticated user's flashcards with optional pagination, filtering by `source` and/or `generation_id`, and sorting.
- **Query parameters:**

  | Name | Type | Required | Description |
  |------|------|----------|-------------|
  | `page` | integer | No | Page number (1-based). Default: `1`. |
  | `limit` | integer | No | Page size (e.g. 10–100). Default: `20`. |
  | `source` | string | No | Filter by `source`: `ai-full`, `ai-edited`, `manual`. |
  | `generation_id` | integer | No | Filter by generation ID. |
  | `sort` | string | No | Sort field: `created_at`, `updated_at`. Default: `created_at`. |
  | `order` | string | No | `asc` or `desc`. Default: `desc`. |

- **Request body:** None.
- **Response body (200):**

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
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

- **Success:** `200 OK` — list and meta returned.
- **Errors:** `401 Unauthorized` — missing or invalid auth; `500 Internal Server Error` — server/database error.

---

#### Get one flashcard

- **Method:** `GET`
- **Path:** `/api/flashcards/[id]`
- **Description:** Returns a single flashcard by ID for the authenticated user.
- **Path parameters:** `id` (integer) — flashcard ID.
- **Query parameters:** None.
- **Request body:** None.
- **Response body (200):**

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

- **Success:** `200 OK`.
- **Errors:** `401 Unauthorized`; `404 Not Found` — flashcard not found or not owned by user; `500 Internal Server Error`.

---

#### Create flashcard

- **Method:** `POST`
- **Path:** `/api/flashcards`
- **Description:** Creates a new flashcard. `user_id` is set from the authenticated user; `generation_id` and `source` are optional (used when saving AI-generated cards).
- **Query parameters:** None.
- **Request body:**

```json
{
  "front": "string",
  "back": "string",
  "source": "manual",
  "generation_id": null
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `front` | string | Yes | Max length 200. |
| `back` | string | Yes | Max length 500. |
| `source` | string | Yes | One of: `ai-full`, `ai-edited`, `manual`. |
| `generation_id` | integer \| null | No | Must reference an existing generation owned by the user if provided. |

- **Response body (201):** Same shape as "Get one flashcard" (created row).
- **Success:** `201 Created`.
- **Errors:** `400 Bad Request` — validation failure (e.g. length, invalid `source`); `401 Unauthorized`; `404 Not Found` — invalid `generation_id`; `500 Internal Server Error`.

---

#### Update flashcard

- **Method:** `PATCH`
- **Path:** `/api/flashcards/[id]`
- **Description:** Updates an existing flashcard owned by the authenticated user. Only provided fields are updated.
- **Path parameters:** `id` (integer).
- **Query parameters:** None.
- **Request body:**

```json
{
  "front": "string",
  "back": "string",
  "source": "ai-full"
}
```

All fields optional. Same constraints as create for `front` (max 200), `back` (max 500), `source` (`ai-full` \| `ai-edited` \| `manual`).

- **Response body (200):** Same shape as "Get one flashcard" (updated row).
- **Success:** `200 OK`.
- **Errors:** `400 Bad Request` — validation failure; `401 Unauthorized`; `404 Not Found`; `500 Internal Server Error`.

---

#### Delete flashcard

- **Method:** `DELETE`
- **Path:** `/api/flashcards/[id]`
- **Description:** Permanently deletes a flashcard owned by the authenticated user.
- **Path parameters:** `id` (integer).
- **Query parameters:** None.
- **Request body:** None.
- **Response body (204):** No body.
- **Success:** `204 No Content`.
- **Errors:** `401 Unauthorized`; `404 Not Found`; `500 Internal Server Error`.

---

### 2.2 Generations

#### List generations

- **Method:** `GET`
- **Path:** `/api/generations`
- **Description:** Returns the authenticated user's generation sessions (for stats/history). Supports pagination and sorting.
- **Query parameters:**

  | Name | Type | Required | Description |
  |------|------|----------|-------------|
  | `page` | integer | No | Page number (1-based). Default: `1`. |
  | `limit` | integer | No | Page size. Default: `20`. |
  | `sort` | string | No | `created_at` or `updated_at`. Default: `created_at`. |
  | `order` | string | No | `asc` or `desc`. Default: `desc`. |

- **Request body:** None.
- **Response body (200):**

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
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

- **Success:** `200 OK`.
- **Errors:** `401 Unauthorized`; `500 Internal Server Error`.

---

#### Create generation

- **Method:** `POST`
- **Path:** `/api/generations`
- **Description:** Records a completed AI generation session (called after user accepts/rejects proposals). Used for analytics and linking flashcards via `generation_id`.
- **Query parameters:** None.
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

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `model` | string | Yes | Max length 100. |
| `generated_count` | integer | Yes | ≥ 0. |
| `accepted_unedited_count` | integer | No | ≥ 0. |
| `accepted_edited_count` | integer | No | ≥ 0. |
| `source_text_hash` | string | Yes | Length 64 (e.g. SHA-256 hex). |
| `source_text_length` | integer | Yes | Between 1000 and 10000 (inclusive). |
| `generation_duration` | integer | Yes | ≥ 0 (e.g. milliseconds). |

- **Response body (201):** Same shape as one item in the list response (created row).
- **Success:** `201 Created`.
- **Errors:** `400 Bad Request` — validation failure (e.g. `source_text_length` out of range); `401 Unauthorized`; `500 Internal Server Error`.

---

### 2.3 Generation error logs

#### List generation error logs

- **Method:** `GET`
- **Path:** `/api/generation-error-logs`
- **Description:** Returns the authenticated user's error log entries (for debugging/support). Append-only resource; no update/delete in API.
- **Query parameters:** `page`, `limit`, `sort` (`created_at`), `order`. Same semantics as generations list.
- **Request body:** None.
- **Response body (200):**

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
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

- **Success:** `200 OK`.
- **Errors:** `401 Unauthorized`; `500 Internal Server Error`.

---

#### Create generation error log

- **Method:** `POST`
- **Path:** `/api/generation-error-logs`
- **Description:** Appends a record when an AI generation request fails (e.g. LLM API error). Server-only or trusted client use.
- **Query parameters:** None.
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

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `model` | string | Yes | Max length 100. |
| `source_text_hash` | string | Yes | Length 64. |
| `source_text_length` | integer | Yes | Between 1000 and 10000. |
| `error_code` | string | Yes | Max length 100. |
| `error_message` | string | Yes | No max (text). |

- **Response body (201):** Created row (same shape as one item in list).
- **Success:** `201 Created`.
- **Errors:** `400 Bad Request` — validation failure; `401 Unauthorized`; `500 Internal Server Error`.

---

### 2.4 Business logic: AI flashcard generation

#### Generate flashcard proposals

- **Method:** `POST`
- **Path:** `/api/flashcards/generate`
- **Description:** Accepts raw text, calls the LLM API (server-side), and returns a list of proposed front/back pairs. The client then lets the user accept, edit, or reject; accepted cards are saved via `POST /api/flashcards` with optional `generation_id` and `source`. This endpoint does not persist flashcards or generations; it only returns proposals.
- **Query parameters:** None.
- **Request body:**

```json
{
  "text": "string"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `text` | string | Yes | Length between 1000 and 10000 characters (trimmed). |

- **Response body (200):**

```json
{
  "proposals": [
    {
      "front": "string",
      "back": "string"
    }
  ]
}
```

- **Success:** `200 OK` — proposals returned (may be empty if LLM returns none).
- **Errors:** `400 Bad Request` — text length out of range or missing; `401 Unauthorized`; `502 Bad Gateway` / `503 Service Unavailable` — LLM API failure (optionally log via `POST /api/generation-error-logs`); `429 Too Many Requests` — rate limit exceeded; `500 Internal Server Error`.

**Note:** Rate limiting is recommended on this endpoint (e.g. per user per minute) due to LLM cost and abuse. On LLM failure, the server may call `POST /api/generation-error-logs` (with service context) to record the error.

---

### 2.5 Account (optional server-side)

#### Delete account

- **Method:** `DELETE`
- **Path:** `/api/account`
- **Description:** Deletes the authenticated user's account and all related data (flashcards, generations, generation_error_logs) to satisfy GDPR right to erasure. Implementation uses Supabase Auth admin API or a service-role client to delete the user (cascade is enforced by the database).
- **Query parameters:** None.
- **Request body:** None.
- **Response body (204):** No body.
- **Success:** `204 No Content`.
- **Errors:** `401 Unauthorized`; `500 Internal Server Error`.

**Assumption:** Auth itself (sign up, sign in, sign out) is handled by the Supabase Auth client (e.g. `signUp`, `signInWithPassword`, `signOut`). This endpoint is for account deletion only when implemented as a server route.

---

## 3. Authentication and authorization

- **Mechanism:** Supabase Auth (email/password). The client obtains a JWT after sign-in; the JWT is sent with each request (e.g. `Authorization: Bearer <access_token>` or cookie, depending on integration).
- **API usage:** For routes under `/api`, the server validates the JWT (e.g. via Supabase `getUser()` or similar). If valid, `auth.uid()` identifies the user; if missing or invalid, respond with `401 Unauthorized`.
- **Authorization:** All data access is scoped by `user_id`:
  - **Flashcards, generations, generation_error_logs:** Use the Supabase client with the user's JWT so that RLS (`auth.uid() = user_id`) restricts rows automatically. API logic does not need to filter by `user_id` in application code for reads/writes; RLS enforces it.
  - **Create operations:** Set `user_id` to the authenticated user's id when inserting.
- **Anonymous users:** RLS policies deny access for `anon`; unauthenticated requests to protected endpoints return `401`.

---

## 4. Validation and business logic

### 4.1 Validation (per resource)

- **Flashcards**
  - `front`: required, string, max length 200.
  - `back`: required, string, max length 500.
  - `source`: required, one of `ai-full`, `ai-edited`, `manual`.
  - `generation_id`: optional integer; if present, must reference a generation owned by the current user (exists and `user_id = auth.uid()`).
  - `user_id`: set server-side from JWT; not accepted in request body.

- **Generations**
  - `model`: required, string, max length 100.
  - `source_text_hash`: required, string, length exactly 64.
  - `source_text_length`: required, integer, between 1000 and 10000 (inclusive).
  - `generated_count`: required, integer ≥ 0.
  - `accepted_unedited_count`, `accepted_edited_count`: optional, integer ≥ 0.
  - `generation_duration`: required, integer ≥ 0.
  - `user_id`: set server-side from JWT.

- **Generation error logs**
  - Same as generations for `model`, `source_text_hash`, `source_text_length`.
  - `error_code`: required, string, max length 100.
  - `error_message`: required, string (text).
  - `user_id`: set server-side from JWT.

- **Generate proposals (`POST /api/flashcards/generate`)**
  - `text`: required, string; after trim, length between 1000 and 10000.

### 4.2 Business logic in the API

- **AI generation flow:** Client sends text to `POST /api/flashcards/generate`. Server validates length, calls LLM API, returns proposals. Client displays them; user accepts (possibly after edit) or rejects. On "save", client calls `POST /api/generations` with session data (model, counts, source_text_hash, source_text_length, duration), then for each accepted card calls `POST /api/flashcards` with `front`, `back`, `source` (`ai-full` or `ai-edited`), and `generation_id`. On LLM failure, server can create a row in `generation_error_logs` (e.g. from a server-side or service-role context).
- **Manual flashcards:** Created via `POST /api/flashcards` with `source: "manual"` and `generation_id: null`. Edits and deletes use `PATCH /api/flashcards/[id]` and `DELETE /api/flashcards/[id]`.
- **Stats:** "How many generated and accepted" is derived from `generations` (and optionally counts of flashcards per `generation_id` and `source`). List endpoints for generations and error logs support dashboards and debugging.
- **Account deletion:** `DELETE /api/account` triggers deletion of the user in Supabase Auth; database cascades remove the user's flashcards, generations, and generation_error_logs. Implements GDPR right to erasure.

### 4.3 Error response shape

Use a consistent JSON body for errors, e.g.:

```json
{
  "error": "Bad Request",
  "message": "Human-readable detail (e.g. validation message).",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

`details` can carry per-field validation errors when applicable. Use appropriate HTTP status and `code` (e.g. `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`).
