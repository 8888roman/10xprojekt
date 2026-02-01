# Plan implementacji widoku Generowanie

## 1. Przegląd
Widok „Generowanie” umożliwia wklejenie tekstu, wygenerowanie propozycji fiszek przez AI oraz ich przegląd (akceptacja/edycja/odrzucenie) przed zapisem. Widok pozostaje aktywny po zapisie, pokazując potwierdzenie i link do „Moje fiszki”.

## 2. Routing widoku
`/generate`

## 3. Struktura komponentów
```
GeneratePage
├─ GenerateForm
│  ├─ TextareaWithCounter
│  ├─ GenerateButton
│  └─ ErrorBanner
├─ ProposalsToolbar
│  ├─ DecisionsFilter
│  └─ AcceptedCounter
├─ ProposalsList
│  ├─ ProposalCard (xN)
│  │  ├─ ProposalActions (accept/edit/reject)
│  │  └─ ProposalEditSheet (on demand)
│  └─ EmptyState
└─ SaveAcceptedBar
   ├─ SaveButton
   └─ SuccessToast/LinkToFlashcards
```

## 4. Szczegóły komponentów

### GeneratePage
- Opis komponentu: Kontener widoku, orkiestruje stan, wywołania API i układ.
- Główne elementy: sekcja formularza, toolbar propozycji, lista propozycji, pasek zapisu.
- Obsługiwane interakcje: inicjalizacja widoku, reset stanu po zapisie.
- Obsługiwana walidacja: brak bezpośredniej, delegacja do GenerateForm.
- Typy: `GenerateViewState`, `FlashcardProposalViewModel`.
- Propsy: brak (route-level).

### GenerateForm
- Opis komponentu: Formularz wprowadzania tekstu i generowania propozycji.
- Główne elementy: textarea, licznik znaków, przycisk „Generuj”, komunikaty błędów.
- Obsługiwane interakcje: onChange tekstu, submit generowania.
- Obsługiwana walidacja:
  - `text` po trimie musi mieć długość 1000–10000 znaków (zgodnie z `generateFlashcardsSchema`).
  - Blokada przycisku poza zakresem.
- Typy: `GenerateFlashcardsCommand`, `GenerateFlashcardsInput`, `FormErrorViewModel`.
- Propsy:
  - `value: string`
  - `onChange(value: string): void`
  - `onSubmit(): void`
  - `isSubmitting: boolean`
  - `error?: FormErrorViewModel`

### ProposalsToolbar
- Opis komponentu: Pasek narzędzi nad listą propozycji.
- Główne elementy: filtr decyzji, licznik zaakceptowanych/wygenerowanych.
- Obsługiwane interakcje: zmiana filtra.
- Obsługiwana walidacja: brak.
- Typy: `DecisionFilter`, `AcceptedCounterViewModel`.
- Propsy:
  - `filter: DecisionFilter`
  - `onFilterChange(filter: DecisionFilter): void`
  - `acceptedCount: number`
  - `totalCount: number`

### ProposalsList
- Opis komponentu: Lista propozycji z możliwością edycji i decyzji.
- Główne elementy: lista kart, empty state.
- Obsługiwane interakcje: wybór akcji na karcie.
- Obsługiwana walidacja: delegacja do ProposalCard.
- Typy: `FlashcardProposalViewModel[]`.
- Propsy:
  - `items: FlashcardProposalViewModel[]`
  - `onAccept(id: string): void`
  - `onReject(id: string): void`
  - `onEdit(id: string, payload: ProposalEditPayload): void`

### ProposalCard
- Opis komponentu: Pojedyncza propozycja fiszki.
- Główne elementy: front/back, badge statusu, akcje.
- Obsługiwane interakcje: akceptuj, odrzuć, edytuj.
- Obsługiwana walidacja:
  - `front` max 200 znaków
  - `back` max 500 znaków
- Typy: `FlashcardProposalViewModel`, `ProposalEditPayload`.
- Propsy:
  - `item: FlashcardProposalViewModel`
  - `onAccept(): void`
  - `onReject(): void`
  - `onEdit(payload: ProposalEditPayload): void`

### ProposalEditSheet
- Opis komponentu: Modal/sheet do edycji propozycji.
- Główne elementy: pola front/back, przycisk zapisu.
- Obsługiwane interakcje: onSave, onCancel.
- Obsługiwana walidacja: limity znaków front/back.
- Typy: `ProposalEditPayload`.
- Propsy:
  - `open: boolean`
  - `initialValue: ProposalEditPayload`
  - `onSave(payload: ProposalEditPayload): void`
  - `onOpenChange(open: boolean): void`

### SaveAcceptedBar
- Opis komponentu: Pasek zapisu zaakceptowanych propozycji.
- Główne elementy: przycisk zapisu, komunikat sukcesu, link do „Moje fiszki”.
- Obsługiwane interakcje: onSave.
- Obsługiwana walidacja: blokada zapisu, gdy brak zaakceptowanych.
- Typy: `AcceptedCounterViewModel`.
- Propsy:
  - `acceptedCount: number`
  - `isSaving: boolean`
  - `onSave(): void`
  - `success?: boolean`

## 5. Typy

### Typy istniejące (DTO)
- `GenerateFlashcardsCommand` `{ text: string }`
- `GenerateFlashcardsResponseDto` `{ proposals: FlashcardProposalDto[] }`
- `FlashcardProposalDto` `{ front: string; back: string }`
- `GenerateFlashcardsInput` z `generateFlashcardsSchema`
- `ErrorResponseDto` dla błędów API

### Nowe typy ViewModel
- `FlashcardProposalViewModel`
  - `id: string` (lokalne ID dla UI)
  - `front: string`
  - `back: string`
  - `status: 'pending' | 'accepted' | 'rejected' | 'edited'`
- `DecisionFilter` = `'all' | 'pending' | 'accepted' | 'rejected' | 'edited'`
- `ProposalEditPayload`
  - `front: string`
  - `back: string`
- `FormErrorViewModel`
  - `message: string`
  - `code?: string`
  - `field?: 'text'`
- `GenerateViewState`
  - `text: string`
  - `proposals: FlashcardProposalViewModel[]`
  - `filter: DecisionFilter`
  - `isGenerating: boolean`
  - `isSaving: boolean`
  - `error?: FormErrorViewModel`
  - `success?: boolean`

## 6. Zarządzanie stanem
- Lokalny stan w `GeneratePage` (React state lub custom hook).
- Sugerowany custom hook: `useGenerateFlashcards`
  - Enkapsuluje wywołanie `/api/flashcards/generate`, mapowanie DTO → ViewModel, obsługę błędów i loading.
- Stan `proposals` przechowuje decyzje użytkownika i edycje.
- Filtr decyzji wpływa na widoczną listę bez modyfikacji źródłowych danych.

## 7. Integracja API
- Endpoint: `POST /api/flashcards/generate`
- Request: `GenerateFlashcardsCommand` (`text` po trimie 1000–10000 znaków)
- Response: `GenerateFlashcardsResponseDto` (`proposals` list)
- Mapowanie:
  - `proposals` → `FlashcardProposalViewModel[]` z lokalnym `id` i `status: 'pending'`.
- Błędy do obsługi:
  - `400` (walidacja), `401` (autoryzacja), `429`, `502`, `503`, `500`.
- Implementacja backendowa: `generateFlashcardProposals` zwraca mock; UI nie zależy od implementacji.

## 8. Interakcje użytkownika
1. Wpisanie tekstu → aktualizacja licznika znaków.
2. Kliknięcie „Generuj” → loading, blokada przycisku, wywołanie API.
3. Otrzymanie propozycji → render listy, status „pending”.
4. Akceptacja/odrzucenie → aktualizacja statusu propozycji.
5. Edycja → otwarcie sheet, zapis zmian, status „edited”.
6. Zapis zaakceptowanych → wyświetlenie potwierdzenia i link do „Moje fiszki”.
7. Retry po błędzie → ponowne wywołanie API.

## 9. Warunki i walidacja
- `text` po trimie musi mieć 1000–10000 znaków (blokada przycisku + komunikat).
- `front` max 200 znaków, `back` max 500 znaków przy edycji propozycji.
- Zapisywanie zaakceptowanych tylko gdy `acceptedCount > 0`.
- Filtr działa wyłącznie na `status` propozycji.

## 10. Obsługa błędów
- `400`: komunikat walidacji (np. długość tekstu), podświetlenie pola.
- `401`: globalne przekierowanie do `/login` z komunikatem.
- `429`: komunikat o limicie i sugestia ponowienia po czasie.
- `502/503/500`: ogólny komunikat + przycisk „Spróbuj ponownie”.
- Brak propozycji: empty state z informacją i zachętą do ponowienia.

## 11. Kroki implementacji
1. Utwórz widok `/generate` (Astro/React) i podłącz do nawigacji.
2. Zaimplementuj `GenerateForm` z licznikiem znaków i walidacją 1000–10000.
3. Dodaj `useGenerateFlashcards` integrujący `POST /api/flashcards/generate`.
4. Zmapuj odpowiedź API na `FlashcardProposalViewModel[]`.
5. Zaimplementuj listę propozycji z akcjami i filtrami decyzji.
6. Dodaj `ProposalEditSheet` z walidacją długości front/back.
7. Dodaj `SaveAcceptedBar` z blokadą zapisu i stanem sukcesu.
8. Zaimplementuj obsługę błędów i retry.
9. Dodaj obsługę 401 z przekierowaniem do logowania.
10. Przetestuj scenariusze: poprawne generowanie, błędy 400/401/429/5xx, brak propozycji.
