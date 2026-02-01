# API Endpoint Implementation Plan: POST /api/flashcards

## 1. Przegląd punktu końcowego
Endpoint tworzy nową fiszkę dla zalogowanego użytkownika. Ustawia `user_id` po stronie serwera, respektuje RLS w Supabase i opcjonalnie wiąże fiszkę z rekordem `generations` przez `generation_id`.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/flashcards`
- Parametry:
  - Wymagane: `front`, `back`, `source`
  - Opcjonalne: `generation_id`
- Request Body:
```json
{
  "front": "string",
  "back": "string",
  "source": "manual",
  "generation_id": null
}
```

## 3. Wykorzystywane typy
- DTOs:
  - `FlashcardDto`
  - `ErrorResponseDto`
- Command modele:
  - `CreateFlashcardCommand`
- Wspierające:
  - `FlashcardSource`

## 3. Szczegóły odpowiedzi
- `201 Created`: utworzona fiszka (ten sam kształt co `GET /api/flashcards/[id]`)
- `400 Bad Request`: błędy walidacji wejścia lub nieprawidłowy `generation_id`
- `401 Unauthorized`: brak/niepoprawny token
- `404 Not Found`: `generation_id` nie istnieje lub nie należy do użytkownika
- `500 Internal Server Error`: błąd serwera/Supabase

## 4. Przepływ danych
1. Odczyt tokenu z nagłówka `Authorization: Bearer <token>` lub cookies (zgodnie z middleware).
2. Walidacja payloadu Zod zgodnie z ograniczeniami bazy:
   - `front`: string, max 200
   - `back`: string, max 500
   - `source`: `'ai-full' | 'ai-edited' | 'manual'`
   - `generation_id`: opcjonalny integer lub null
3. Autoryzacja użytkownika przez `supabase.auth.getUser()` na `context.locals.supabase`.
4. Jeśli podano `generation_id`, weryfikacja istnienia rekordu w `generations` dla bieżącego użytkownika (select z RLS).
5. Insert do `flashcards` z `user_id` ustawionym po stronie serwera.
6. Zwrócenie `201` z utworzonym rekordem.

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie (JWT Supabase); brak tokenu → `401`.
- RLS wymusza dostęp tylko do własnych rekordów (`auth.uid() = user_id`).
- Nigdy nie akceptować `user_id` z payloadu.
- Walidacja Zod blokuje nadmiarowe pola i nieprawidłowe typy.
- Weryfikacja `generation_id` zapobiega przypięciu do cudzej generacji.

## 6. Obsługa błędów
- `400`: brak wymaganych pól, przekroczenie długości, niepoprawny `source`, `generation_id` w złym formacie.
- `401`: brak/niepoprawny token.
- `404`: `generation_id` nie istnieje lub nie należy do użytkownika.
- `500`: nieoczekiwane błędy Supabase/serwera.
- Ten endpoint nie zapisuje logów do `generation_error_logs` (dotyczy tylko LLM).

## 7. Wydajność
- Pojedynczy insert i opcjonalny select na `generations`.
- Indeksy na `generation_id` i `user_id` wspierają zapytania.
- Zwraca tylko utworzony rekord — brak ciężkich operacji.

## 8. Kroki implementacji
1. Utworzyć schema Zod w `src/lib/schemas/flashcards.ts` dla `CreateFlashcardCommand`.
2. Dodać endpoint `src/pages/api/flashcards/index.ts` z `export const prerender = false`.
3. Wykorzystać `context.locals.supabase` (nie importować klienta bezpośrednio).
4. Zaimplementować autoryzację: odczyt tokenu i `supabase.auth.getUser()`.
5. Jeśli `generation_id` podany: sprawdzić istnienie rekordu w `generations` dla użytkownika (RLS).
6. Wykonać `insert` do `flashcards` z `user_id`.
7. Zwrócić `201` i `FlashcardDto`; obsłużyć błędy zgodnie z mapą kodów.
8. Dodać/zweryfikować testy integracyjne (opcjonalne, jeśli repo ma testy).
