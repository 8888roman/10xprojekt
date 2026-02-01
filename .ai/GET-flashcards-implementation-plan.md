# API Endpoint Implementation Plan: GET /api/flashcards

## 1. Przegląd punktu końcowego
Endpoint zwraca listę fiszek zalogowanego użytkownika z paginacją, opcjonalnym filtrowaniem (`source`, `generation_id`) i sortowaniem (`created_at`, `updated_at`). Dostęp kontrolowany przez Supabase Auth i RLS.

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/flashcards`
- Parametry (query):
  - Wymagane: brak
  - Opcjonalne:
    - `page` (domyślnie 1)
    - `limit` (domyślnie 20)
    - `source` (`ai-full | ai-edited | manual`)
    - `generation_id` (number)
    - `sort` (`created_at | updated_at`)
    - `order` (`asc | desc`)
- Request Body: brak

## 3. Wykorzystywane typy
- DTOs:
  - `FlashcardDto`
  - `FlashcardListResponseDto`
  - `ErrorResponseDto`
- Command / Query modele:
  - `FlashcardListQueryDto`
- Wspierające:
  - `FlashcardSource`
  - `PaginationMeta`
  - `SortOrder`

## 3. Szczegóły odpowiedzi
- `200 OK`: lista fiszek + `meta` z paginacją
- `401 Unauthorized`: brak/niepoprawny token
- `500 Internal Server Error`: błąd serwera/Supabase

## 4. Przepływ danych
1. Odczyt tokenu z nagłówka `Authorization: Bearer <token>` lub cookies.
2. Autoryzacja użytkownika przez `context.locals.supabase.auth.getUser()`.
3. Walidacja i normalizacja query params:
   - `page` i `limit` jako liczby całkowite ≥ 1
   - `source` zgodny z `FlashcardSource`
   - `generation_id` jako liczba całkowita (jeśli podany)
   - `sort` z dozwolonych pól, `order` z `asc|desc`
4. Zbudowanie zapytania Supabase:
   - `from('flashcards').select('*', { count: 'exact' })`
   - RLS automatycznie ogranicza do `user_id`
   - `eq('source', ...)`, `eq('generation_id', ...)` gdy podane
   - `order(sort, { ascending })`
   - `range((page-1)*limit, page*limit-1)` dla paginacji
5. Zwrócenie `FlashcardListResponseDto` z `meta` (page, limit, total).

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie (JWT Supabase); brak tokenu → `401`.
- RLS wymusza dostęp tylko do własnych rekordów (`auth.uid() = user_id`).
- Walidacja query parametrów zapobiega nieprawidłowym filtrom i sortowaniu.
- Brak dostępu do danych innych użytkowników bezpośrednio (RLS).

## 6. Obsługa błędów
- `400 Bad Request`:
  - nieprawidłowe typy lub wartości `page`, `limit`, `generation_id`
  - niedozwolone `source`, `sort`, `order`
- `401 Unauthorized`: brak/niepoprawny token
- `500 Internal Server Error`: błąd Supabase lub nieoczekiwany wyjątek
- Brak logowania do `generation_error_logs` (dotyczy tylko LLM).

## 7. Wydajność
- Indeks `idx_flashcards_user_id` oraz `idx_flashcards_generation_id` wspierają filtrowanie.
- Paginacja ogranicza rozmiar payloadu.
- Użycie `count: 'exact'` dla `total` może być kosztowne przy dużych danych; rozważyć `count: 'estimated'` jako opcję, jeśli zajdzie potrzeba.

## 8. Kroki implementacji
1. Dodać Zod schema dla `FlashcardListQueryDto` w `src/lib/schemas/flashcards.ts`.
2. Utworzyć/uzupełnić service w `src/lib/services/flashcards.ts` (np. `listFlashcards`) do budowy zapytania i paginacji.
3. Dodać endpoint `src/pages/api/flashcards/index.ts` z `export const prerender = false` i handlerem `GET`.
4. W handlerze użyć `context.locals.supabase` i uwierzytelnienia (`getUser`).
5. Walidować query params przez Zod; w razie błędów zwrócić `400` z `ErrorResponseDto`.
6. Zwrócić `FlashcardListResponseDto` z `meta` i `data` (mapowanie `source` do `FlashcardSource`).
7. Dodać/zweryfikować testy (jeśli repo zawiera testy integracyjne).
