# API Endpoint Implementation Plan: DELETE /api/flashcards/[id]

## 1. Przegląd punktu końcowego
Endpoint usuwa fiszkę o wskazanym `id`, należącą do zalogowanego użytkownika. Dostęp kontrolowany przez Supabase Auth i RLS. Zwraca `204 No Content`.

## 2. Szczegóły żądania
- Metoda HTTP: `DELETE`
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id` (path param)
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy
- DTOs:
  - `ErrorResponseDto`
- Command / Param modele:
  - `FlashcardIdParamDto`

## 3. Szczegóły odpowiedzi
- `204 No Content`: fiszka usunięta
- `401 Unauthorized`: brak/niepoprawny token
- `404 Not Found`: fiszka nie istnieje lub nie należy do użytkownika
- `500 Internal Server Error`: błąd serwera/Supabase

## 4. Przepływ danych
1. Odczyt `id` z parametru ścieżki i walidacja (liczba całkowita > 0).
2. Odczyt tokenu z `Authorization: Bearer <token>` lub cookies.
3. Autoryzacja użytkownika przez `context.locals.supabase.auth.getUser()`.
4. Usunięcie rekordu:
   - `from('flashcards').delete().eq('id', id).select('id').single()`
   - RLS ogranicza do rekordów użytkownika.
5. Zwrócenie `204` przy sukcesie lub `404`, jeśli brak rekordu (RLS).

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie (JWT Supabase).
- RLS wymusza dostęp tylko do własnych rekordów (`auth.uid() = user_id`).
- Walidacja `id` zapobiega nieprawidłowym zapytaniom.

## 6. Obsługa błędów
- `400 Bad Request`: nieprawidłowy format `id` (np. nie-liczba lub <= 0).
- `401 Unauthorized`: brak/niepoprawny token.
- `404 Not Found`: rekord nie istnieje lub brak dostępu (RLS).
- `500 Internal Server Error`: błąd Supabase lub nieoczekiwany wyjątek.
- Brak logowania do `generation_error_logs` (dotyczy tylko LLM).

## 7. Wydajność
- Operacja po PK (`id`) jest szybka; indeks główny wspiera lookup.
- Brak dodatkowych zapytań i minimalny payload.

## 8. Kroki implementacji
1. Dodać Zod schema dla `FlashcardIdParamDto` (id jako number > 0) w `src/lib/schemas/flashcards.ts`.
2. Utworzyć/rozszerzyć service w `src/lib/services/flashcards.ts` (np. `deleteFlashcard`).
3. Dodać endpoint `src/pages/api/flashcards/[id].ts` z `export const prerender = false` i handlerem `DELETE`.
4. W handlerze użyć `context.locals.supabase`, autoryzacji (`getUser`) oraz walidacji `id`.
5. Wykonać `delete` i zwrócić `204` lub `404`.
6. Dodać/zweryfikować testy integracyjne (jeśli repo zawiera testy).
