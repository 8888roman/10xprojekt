# Plan implementacji widoku Moje fiszki

## 1. Przegląd
Widok „Moje fiszki” służy do przeglądania, filtrowania, sortowania i zarządzania zapisanymi fiszkami użytkownika. Umożliwia edycję oraz usuwanie fiszek, a także ręczne dodawanie nowych.

## 2. Routing widoku
`/flashcards`

## 3. Struktura komponentów
```
FlashcardsPage
├─ FlashcardsToolbar
│  ├─ SourceFilter
│  ├─ SortSelect
│  └─ AddManualButton
├─ FlashcardsList
│  ├─ FlashcardCard (xN)
│  │  ├─ FlashcardActions (edit/delete)
│  │  └─ DeleteConfirmDialog (per item)
│  └─ EmptyState
├─ Pagination
└─ FlashcardEditSheet
└─ FlashcardCreateSheet
└─ ErrorBanner
└─ LoadingSkeleton
```

## 4. Szczegóły komponentów

### FlashcardsPage
- Opis komponentu: Kontener widoku, pobiera dane, zarządza filtrowaniem/sortowaniem, stanem listy i modalami.
- Główne elementy: toolbar, lista fiszek, paginacja, modale edycji i dodawania, bannery błędów.
- Obsługiwane interakcje: inicjalne pobranie listy, zmiana filtrów/sortowania/strony, otwieranie modali, akcje edycji/usuwania.
- Obsługiwana walidacja: brak bezpośredniej, delegacja do formularzy i walidacji zapytań.
- Typy: `FlashcardDto`, `FlashcardListResponseDto`, `FlashcardListQueryDto`, `FlashcardsViewState`.
- Propsy: brak (route-level).

### FlashcardsToolbar
- Opis komponentu: Pasek narzędzi do sterowania listą.
- Główne elementy: filtr źródła, sortowanie, stały przycisk „Dodaj ręcznie”.
- Obsługiwane interakcje: zmiana filtra źródła, zmiana sortowania, otwarcie modalu tworzenia.
- Obsługiwana walidacja: dopuszczalne wartości filtrów zgodne z API.
- Typy: `FlashcardSource`, `FlashcardsSortOption`.
- Propsy:
  - `source?: FlashcardSource`
  - `sort: FlashcardsSortOption`
  - `onSourceChange(source?: FlashcardSource): void`
  - `onSortChange(sort: FlashcardsSortOption): void`
  - `onAddManual(): void`

### FlashcardsList
- Opis komponentu: Renderuje listę fiszek lub pusty stan.
- Główne elementy: lista kart, empty state.
- Obsługiwane interakcje: przekazywanie akcji edycji i usuwania do rodzica.
- Obsługiwana walidacja: brak.
- Typy: `FlashcardListItemViewModel[]`.
- Propsy:
  - `items: FlashcardListItemViewModel[]`
  - `onEdit(item: FlashcardListItemViewModel): void`
  - `onDelete(item: FlashcardListItemViewModel): void`

### FlashcardCard
- Opis komponentu: Pojedyncza fiszka z metadanymi.
- Główne elementy: front/back, badge źródła, daty utworzenia/aktualizacji, akcje edycji/usuwania.
- Obsługiwane interakcje: klik edycji, klik usuwania.
- Obsługiwana walidacja: brak (wyświetlanie).
- Typy: `FlashcardListItemViewModel`.
- Propsy:
  - `item: FlashcardListItemViewModel`
  - `onEdit(): void`
  - `onDelete(): void`

### DeleteConfirmDialog
- Opis komponentu: Potwierdzenie usunięcia fiszki.
- Główne elementy: opis konsekwencji, przyciski „Anuluj”/„Usuń”.
- Obsługiwane interakcje: potwierdzenie, anulowanie.
- Obsługiwana walidacja: brak.
- Typy: brak dodatkowych.
- Propsy:
  - `open: boolean`
  - `onConfirm(): void`
  - `onOpenChange(open: boolean): void`
  - `isDeleting: boolean`

### FlashcardEditSheet
- Opis komponentu: Sheet do edycji istniejącej fiszki.
- Główne elementy: pola front/back, etykieta źródła, przycisk zapisu.
- Obsługiwane interakcje: zapis, anulowanie.
- Obsługiwana walidacja:
  - `front` wymagane, max 200 znaków.
  - `back` wymagane, max 500 znaków.
- Typy: `UpdateFlashcardCommand`, `FlashcardSource`.
- Propsy:
  - `open: boolean`
  - `initialValue: FlashcardListItemViewModel`
  - `onSave(payload: UpdateFlashcardCommand): void`
  - `onOpenChange(open: boolean): void`
  - `isSaving: boolean`
  - `error?: FormErrorViewModel`

### FlashcardCreateSheet
- Opis komponentu: Sheet do ręcznego dodawania fiszki.
- Główne elementy: pola front/back, przycisk zapisu, opcja „Zapisz i dodaj kolejną”.
- Obsługiwane interakcje: zapis, zapis i kontynuacja, anulowanie.
- Obsługiwana walidacja:
  - `front` wymagane, max 200 znaków.
  - `back` wymagane, max 500 znaków.
  - `source` zawsze `manual`.
- Typy: `CreateFlashcardCommand`.
- Propsy:
  - `open: boolean`
  - `onSave(payload: CreateFlashcardCommand, keepOpen?: boolean): void`
  - `onOpenChange(open: boolean): void`
  - `isSaving: boolean`
  - `error?: FormErrorViewModel`

### Pagination
- Opis komponentu: Kontroluje nawigację po stronach.
- Główne elementy: przyciski poprzednia/następna, numery stron.
- Obsługiwane interakcje: zmiana strony.
- Obsługiwana walidacja: blokada wyjścia poza zakres.
- Typy: `PaginationMeta`.
- Propsy:
  - `meta: PaginationMeta`
  - `onPageChange(page: number): void`

### ErrorBanner
- Opis komponentu: Wyświetla komunikaty błędów zapytań/operacji.
- Główne elementy: tekst błędu, opcjonalny przycisk ponowienia.
- Obsługiwane interakcje: retry.
- Obsługiwana walidacja: brak.
- Typy: `FormErrorViewModel`.
- Propsy:
  - `error: FormErrorViewModel`
  - `onRetry?(): void`

## 5. Typy

### DTO i istniejące typy
- `FlashcardDto` – pojedyncza fiszka z API.
- `FlashcardListResponseDto` – odpowiedź listy z `data` i `meta`.
- `FlashcardListQueryDto` – parametry zapytania listy.
- `CreateFlashcardCommand` – payload tworzenia fiszki.
- `UpdateFlashcardCommand` – payload aktualizacji fiszki.
- `FlashcardSource` – `ai-full | ai-edited | manual`.
- `ErrorResponseDto` – standardowy payload błędu API.
- `PaginationMeta` – metadane paginacji.

### Nowe typy ViewModel
- `FlashcardListItemViewModel`
  - `id: number`
  - `front: string`
  - `back: string`
  - `source: FlashcardSource`
  - `createdAt: string` (sformatowany do UI)
  - `updatedAt: string` (sformatowany do UI)
  - `isDeleting?: boolean`
  - `isUpdating?: boolean`
- `FlashcardsSortOption`
  - `field: 'created_at' | 'updated_at'`
  - `order: 'asc' | 'desc'`
- `FormErrorViewModel`
  - `message: string`
  - `code?: string`
  - `field?: 'front' | 'back'`
- `FlashcardsViewState`
  - `items: FlashcardListItemViewModel[]`
  - `meta: PaginationMeta`
  - `query: FlashcardListQueryDto`
  - `isLoading: boolean`
  - `error?: FormErrorViewModel`
  - `isCreateOpen: boolean`
  - `editTarget?: FlashcardListItemViewModel`

## 6. Zarządzanie stanem
- Lokalny stan w `FlashcardsPage` lub custom hook `useFlashcards`.
- `useFlashcards` odpowiada za:
  - synchronizację `FlashcardListQueryDto` z UI (source, sort, page, limit),
  - pobieranie listy i mapowanie DTO → ViewModel,
  - operacje CRUD (create/update/delete) z optymistycznymi aktualizacjami,
  - obsługę błędów i stanu ładowania.
- Stany modalne (`isCreateOpen`, `editTarget`) przechowywane na poziomie strony.

## 7. Integracja API
- `GET /api/flashcards`
  - Request: `FlashcardListQueryDto`
  - Response: `FlashcardListResponseDto`
- `POST /api/flashcards`
  - Request: `CreateFlashcardCommand` (`source: "manual"`)
  - Response: `FlashcardDto`
- `PATCH /api/flashcards/[id]`
  - Request: `UpdateFlashcardCommand` (pola opcjonalne)
  - Response: `FlashcardDto`
- `DELETE /api/flashcards/[id]`
  - Response: `204 No Content`

## 8. Interakcje użytkownika
1. Wejście na `/flashcards` → pobranie listy z domyślnym `page=1`, `limit=20`.
2. Zmiana filtra źródła → odświeżenie listy i reset `page` do 1.
3. Zmiana sortowania → odświeżenie listy i reset `page` do 1.
4. Klik „Dodaj ręcznie” → otwarcie `FlashcardCreateSheet`.
5. Zapis nowej fiszki → wysłanie `POST`, dodanie do listy, zamknięcie/pozostanie w sheet (opcjonalne).
6. Klik „Edytuj” → otwarcie `FlashcardEditSheet` z danymi fiszki.
7. Zapis edycji → wysłanie `PATCH`, aktualizacja fiszki na liście.
8. Klik „Usuń” → otwarcie `DeleteConfirmDialog`.
9. Potwierdzenie usunięcia → optymistyczne usunięcie z listy, `DELETE` w tle, rollback na błąd.
10. Paginacja → pobranie kolejnej strony listy.

## 9. Warunki i walidacja
- Zapytania listy:
  - `page >= 1`, `limit >= 1`.
  - `source` tylko `ai-full | ai-edited | manual`.
  - `sort` tylko `created_at | updated_at`, `order` tylko `asc | desc`.
- Tworzenie/edycja:
  - `front` wymagane, max 200 znaków.
  - `back` wymagane, max 500 znaków.
  - `source` dla tworzenia zawsze `manual`.
- Usuwanie:
  - Potwierdzenie dialogiem przed wywołaniem API.

## 10. Obsługa błędów
- `401 Unauthorized`: globalne przekierowanie do `/login` z komunikatem.
- `400 Bad Request`: komunikaty walidacyjne per pole (front/back) oraz dla filtrów.
- `404 Not Found`: informacja o nieistniejącej fiszce (np. po edycji/usuwaniu).
- `500 Internal Server Error`: ogólny banner z retry.
- Błędy sieciowe: fallback do stanu błędu z możliwością ponowienia.

## 11. Kroki implementacji
1. Utwórz stronę `src/pages/flashcards.astro` i osadź komponent React `FlashcardsPage`.
2. Zaimplementuj `FlashcardsPage` wraz z `useFlashcards` do pobierania listy i obsługi CRUD.
3. Dodaj `FlashcardsToolbar` (filtry, sortowanie, przycisk dodawania).
4. Dodaj `FlashcardsList` i `FlashcardCard` z akcjami edycji/usuwania.
5. Dodaj `FlashcardCreateSheet` i `FlashcardEditSheet` z walidacją front/back.
6. Dodaj `DeleteConfirmDialog` z optymistycznym usuwaniem i rollbackiem.
7. Dodaj `Pagination` spiętą z `meta` i `query.page`.
8. Dodaj `ErrorBanner` i `LoadingSkeleton` do obsługi błędów i ładowania.
9. Zadbaj o obsługę 401 (redirect) i mapowanie błędów na `FormErrorViewModel`.
10. Przetestuj: filtrowanie, sortowanie, paginację, tworzenie/edycję/usuwanie, błędy 400/401/404/500.
