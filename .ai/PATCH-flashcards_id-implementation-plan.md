# API Endpoint Implementation Plan: PATCH /api/flashcards/[id]

## 1. Przegląd punktu końcowego
Endpoint aktualizuje wskazaną fiszkę użytkownika. Modyfikowane są wyłącznie pola dostarczone w payloadzie. Dostęp kontrolowany przez Supabase Auth i RLS.

## 2. Szczegóły żądania
- Metoda HTTP: `PATCH`
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id` (path param)
  - Opcjonalne: brak
- Request Body (przykład):
```json
{
  "front": "string",
  "back": "string",
  "source": "ai-edited"
}
```

## 3. Wykorzystywane typy
- DTOs:
  - `FlashcardDto`
  - `ErrorResponseDto`
- Command / Param modele:
  - `UpdateFlashcardCommand`
  - `FlashcardIdParamDto`
- Wspierające:
  - `FlashcardSource`

## 3. Szczegóły odpowiedzi
- `200 OK`: zaktualizowana fiszka
- `400 Bad Request`: błędy walidacji lub pusty payload
- `401 Unauthorized`: brak/niepoprawny token
- `404 Not Found`: fiszka nie istnieje lub nie należy do użytkownika
- `500 Internal Server Error`: błąd serwera/Supabase

## 4. Przepływ danych
1. Odczyt `id` z parametru ścieżki i walidacja (liczba całkowita > 0).
2. Odczyt tokenu z `Authorization: Bearer <token>` lub cookies.
3. Autoryzacja użytkownika przez `context.locals.supabase.auth.getUser()`.
4. Walidacja payloadu Zod:
   - wszystkie pola opcjonalne, ale wymagane co najmniej jedno z `front`, `back`, `source`, `generation_id` (jeśli wspierane)
   - `front`: max 200
   - `back`: max 500
   - `source`: `ai-full | ai-edited | manual`
5. Opcjonalnie: jeśli payload zawiera `generation_id`, sprawdzić istnienie rekordu w `generations` należącego do użytkownika.
6. Aktualizacja rekordu:
   - `from('flashcards').update(updatePayload).eq('id', id).select('*').single()`
7. Zwrócenie `200` z `FlashcardDto` lub `404`, jeśli brak rekordu (RLS).

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie (JWT Supabase).
- RLS wymusza dostęp tylko do własnych rekordów (`auth.uid() = user_id`).
- Walidacja `id` i payloadu chroni przed nieprawidłowymi danymi.
- Nigdy nie akceptować `user_id` z payloadu.

## 6. Obsługa błędów
- `400 Bad Request`: nieprawidłowy `id`, puste body, błędne typy/limity, niedozwolony `source`.
- `401 Unauthorized`: brak/niepoprawny token.
- `404 Not Found`: brak rekordu lub brak dostępu (RLS).
- `500 Internal Server Error`: błąd Supabase lub nieoczekiwany wyjątek.
- Brak logowania do `generation_error_logs` (dotyczy tylko LLM).

## 7. Wydajność
- Jedno zapytanie `update` po PK (`id`).
- Indeks PK zapewnia szybki lookup.
- Brak paginacji, niewielki payload.

## 8. Kroki implementacji
1. Dodać Zod schema dla `UpdateFlashcardCommand` i `FlashcardIdParamDto` w `src/lib/schemas/flashcards.ts`.
2. Utworzyć/rozszerzyć service w `src/lib/services/flashcards.ts` (np. `updateFlashcard`).
3. Dodać endpoint `src/pages/api/flashcards/[id].ts` z `export const prerender = false` i handlerem `PATCH`.
4. W handlerze użyć `context.locals.supabase`, autoryzacji (`getUser`) oraz walidacji payloadu.
5. Wykonać `update` i zwrócić `200` z `FlashcardDto` lub `404`.
6. Dodać/zweryfikować testy integracyjne (jeśli repo zawiera testy).
