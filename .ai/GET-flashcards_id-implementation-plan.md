# API Endpoint Implementation Plan: GET /api/flashcards/[id]

## 1. Przegląd punktu końcowego
Endpoint zwraca pojedynczą fiszkę o podanym `id`, należącą do zalogowanego użytkownika. Dostęp kontrolowany przez Supabase Auth i RLS.

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id` (path param)
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy
- DTOs:
  - `FlashcardDto`
  - `ErrorResponseDto`
- Command / Param modele:
  - `FlashcardIdParamDto`

## 3. Szczegóły odpowiedzi
- `200 OK`: zwrócona fiszka
- `401 Unauthorized`: brak/niepoprawny token
- `404 Not Found`: fiszka nie istnieje lub nie należy do użytkownika
- `500 Internal Server Error`: błąd serwera/Supabase

## 4. Przepływ danych
1. Odczyt `id` z parametru ścieżki i walidacja (liczba całkowita > 0).
2. Odczyt tokenu z `Authorization: Bearer <token>` lub cookies.
3. Autoryzacja użytkownika przez `context.locals.supabase.auth.getUser()`.
4. Zapytanie Supabase:
   - `from('flashcards').select('*').eq('id', id).single()`
   - RLS ogranicza do rekordów użytkownika.
5. Zwrócenie `FlashcardDto` przy sukcesie, albo `404` gdy brak rekordu.

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie (JWT Supabase).
- RLS wymusza dostęp tylko do własnych rekordów (`auth.uid() = user_id`).
- Walidacja parametru `id` zapobiega nieprawidłowym zapytaniom.

## 6. Obsługa błędów
- `400 Bad Request`: nieprawidłowy format `id` (np. nie-liczba lub <= 0).
- `401 Unauthorized`: brak/niepoprawny token.
- `404 Not Found`: rekord nie istnieje lub brak dostępu (RLS).
- `500 Internal Server Error`: błąd Supabase lub nieoczekiwany wyjątek.
- Brak logowania do `generation_error_logs` (dotyczy tylko LLM).

## 7. Wydajność
- Zapytanie po PK (`id`) jest szybkie; indeks główny wspiera lookup.
- Brak paginacji i ciężkich operacji.

## 8. Kroki implementacji
1. Dodać Zod schema dla `FlashcardIdParamDto` (np. `id` jako number > 0) w `src/lib/schemas/flashcards.ts`.
2. Utworzyć/uzupełnić service w `src/lib/services/flashcards.ts` (np. `getFlashcardById`).
3. Dodać endpoint `src/pages/api/flashcards/[id].ts` z `export const prerender = false` i handlerem `GET`.
4. W handlerze użyć `context.locals.supabase` i uwierzytelnienia (`getUser`).
5. Walidować `id`; zwrócić `400` przy błędnym parametrze.
6. Wykonać zapytanie `select` i zwrócić `200` z `FlashcardDto` lub `404` gdy brak.
7. Dodać/zweryfikować testy (jeśli repo zawiera testy integracyjne).
