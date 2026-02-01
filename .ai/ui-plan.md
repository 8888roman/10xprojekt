# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Architektura UI opiera się na trzech głównych obszarach funkcjonalnych: „Generowanie”, „Moje fiszki” i „Sesja nauki”. Po zalogowaniu użytkownik trafia do widoku generowania, gdzie przechodzi przez proces tworzenia fiszek z AI, a następnie może zarządzać zapisanymi fiszkami lub rozpocząć sesję nauki. Nawigacja jest stała i mobile-first, z wyraźnym statusem sesji oraz łatwym dostępem do ustawień konta i usunięcia konta (RODO). W całej aplikacji obowiązuje spójna walidacja i obsługa błędów zgodnie z API.

## 2. Lista widoków

### 2.1. Logowanie
- **Ścieżka widoku:** `/login`
- **Główny cel:** Uwierzytelnienie użytkownika.
- **Kluczowe informacje do wyświetlenia:** Formularz e-mail/hasło, komunikaty o błędach.
- **Kluczowe komponenty widoku:** Formularz logowania, przycisk „Zaloguj”, link do rejestracji.
- **UX, dostępność i względy bezpieczeństwa:** Walidacja pól, komunikaty 401, focus states, obsługa klawiaturą.

### 2.2. Rejestracja
- **Ścieżka widoku:** `/register`
- **Główny cel:** Utworzenie nowego konta.
- **Kluczowe informacje do wyświetlenia:** Formularz e-mail/hasło, potwierdzenie sukcesu.
- **Kluczowe komponenty widoku:** Formularz rejestracji, przycisk „Utwórz konto”.
- **UX, dostępność i względy bezpieczeństwa:** Walidacja pól, jasne komunikaty, obsługa klawiaturą.

### 2.3. Generowanie fiszek (AI)
- **Ścieżka widoku:** `/generate`
- **Główny cel:** Generowanie propozycji fiszek z tekstu.
- **Kluczowe informacje do wyświetlenia:** Pole tekstowe 1000–10000 znaków, licznik znaków, status generowania.
- **Kluczowe komponenty widoku:** Pole tekstowe, przycisk „Generuj”, lista propozycji z akcjami akceptuj/edytuj/odrzuć, filtr decyzji, licznik zaakceptowanych/wygenerowanych, przycisk zapisu.
- **UX, dostępność i względy bezpieczeństwa:** Prewalidacja długości, wyraźne stany błędów (400/401/429/5xx), możliwość retry, pełna obsługa klawiaturą, focus states.

### 2.4. Moje fiszki
- **Ścieżka widoku:** `/flashcards`
- **Główny cel:** Zarządzanie zapisanymi fiszkami.
- **Kluczowe informacje do wyświetlenia:** Lista fiszek, źródło (`source`), daty utworzenia/aktualizacji.
- **Kluczowe komponenty widoku:** Lista z paginacją, filtry (source), sortowanie (created_at/updated_at), stały przycisk „Dodaj ręcznie”, akcje edycji/usuwania, potwierdzenie usunięcia.
- **UX, dostępność i względy bezpieczeństwa:** Paginacja zgodna z API, optymistyczne aktualizacje z rollbackiem, focus states, obsługa klawiaturą.

### 2.5. Modal/Sheet edycji fiszki
- **Ścieżka widoku:** kontekstowy (otwierany z listy)
- **Główny cel:** Edycja fiszki (AI lub manualnej).
- **Kluczowe informacje do wyświetlenia:** Pola „Przód” i „Tył”, etykieta źródła.
- **Kluczowe komponenty widoku:** Formularz edycji, przycisk „Zapisz”, opcjonalnie „Zapisz i dodaj kolejną”.
- **UX, dostępność i względy bezpieczeństwa:** Limity długości (front 200, back 500), obsługa klawiaturą.

### 2.6. Modal/Sheet dodawania fiszki ręcznej
- **Ścieżka widoku:** kontekstowy (z „Moje fiszki”)
- **Główny cel:** Ręczne dodanie fiszki.
- **Kluczowe informacje do wyświetlenia:** Pola „Przód” i „Tył”.
- **Kluczowe komponenty widoku:** Formularz tworzenia, przycisk „Zapisz”, opcja „Zapisz i dodaj kolejną”.
- **UX, dostępność i względy bezpieczeństwa:** Walidacja i limity zgodne z API.

### 2.7. Sesja nauki
- **Ścieżka widoku:** `/study`
- **Główny cel:** Realizacja sesji nauki spaced repetition.
- **Kluczowe informacje do wyświetlenia:** Przód fiszki, po interakcji tył fiszki, postęp (X z Y).
- **Kluczowe komponenty widoku:** Ekran startowy, karta fiszki, przyciski oceny, licznik postępu, empty state.
- **UX, dostępność i względy bezpieczeństwa:** Tryb immersyjny, pełna obsługa klawiaturą, focus states, wyraźny empty state z CTA do generowania/dodania.

### 2.8. Ustawienia konta
- **Ścieżka widoku:** `/account`
- **Główny cel:** Zarządzanie kontem i zgodność z RODO.
- **Kluczowe informacje do wyświetlenia:** Informacje o koncie, ostrzeżenie przy usuwaniu.
- **Kluczowe komponenty widoku:** Przycisk „Usuń konto”, modal potwierdzenia.
- **UX, dostępność i względy bezpieczeństwa:** Wyraźne ostrzeżenia, potwierdzenie akcji, obsługa 401.

## 3. Mapa podróży użytkownika

1. **Rejestracja / Logowanie → Generowanie**
   - Użytkownik rejestruje konto lub loguje się, po czym trafia do „Generowanie”.
2. **Generowanie → Przegląd propozycji**
   - Wprowadza tekst (1000–10000), generuje propozycje, akceptuje/edytuje/odrzuca.
3. **Zapis → Pozostanie w Generowaniu**
   - Zapisuje zaakceptowane fiszki, pozostaje w widoku z potwierdzeniem i linkiem do „Moje fiszki”.
4. **Moje fiszki**
   - Przegląda listę, filtruje/sortuje, edytuje w modalu, usuwa z potwierdzeniem.
5. **Sesja nauki**
   - Rozpoczyna sesję, przechodzi przez karty, ocenia, obserwuje postęp.
6. **Ustawienia konta**
   - Opcjonalnie usuwa konto, z pełnym potwierdzeniem.

## 4. Układ i struktura nawigacji

- **Nawigacja stała (górny pasek lub dolny na mobile):** „Generowanie”, „Moje fiszki”, „Sesja nauki”.
- **Poziom konta:** status sesji oraz skrót do „Ustawienia konta”.
- **Przekierowania:** 401 → logowanie z komunikatem; po zapisie w generowaniu pozostanie w widoku z CTA do „Moje fiszki”.

## 5. Kluczowe komponenty

- **Formularze auth** – logowanie/rejestracja z walidacją i komunikatami błędów.
- **Generator AI** – pole tekstowe z licznikiem znaków, przycisk generowania, loader.
- **Lista propozycji** – karty propozycji z akcjami akceptuj/edytuj/odrzuć i filtrami decyzji.
- **Lista fiszek** – paginowana lista z filtrami, sortowaniem i akcjami.
- **Modal/Sheet edycji** – formularz wspólny dla AI i manualnych fiszek.
- **Sesja nauki** – karta fiszki, przyciski oceny, licznik postępu.
- **Komunikaty systemowe** – toasty/bannery dla błędów i retry.
