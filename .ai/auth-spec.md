# Specyfikacja architektury modułu uwierzytelniania

Zakres: US-001 (Rejestracja konta) i US-002 (Logowanie) z PRD oraz odzyskiwanie hasla. Specyfikacja jest zgodna z Astro 5, TypeScript 5, React 19, Supabase Auth oraz obecnym sposobem dzialania aplikacji.

## 1. ARCHITEKTURA INTERFEJSU UZYTKOWNIKA

### 1.1 Strony i layouty (Astro)
- Nowe strony (Astro):
  - `src/pages/register.astro` — ekran rejestracji.
  - `src/pages/login.astro` — ekran logowania.
  - `src/pages/recover.astro` — ekran rozpoczecia odzyskiwania hasla (email).
  - `src/pages/reset-password.astro` — ekran ustawienia nowego hasla po linku.
- Istniejace strony do rozszerzenia o gating auth:
  - `src/pages/generate.astro` — dostep tylko dla zalogowanych (US-002: przekierowanie po logowaniu).
  - `src/pages/flashcards.astro` — dostep tylko dla zalogowanych.
- Layouty:
  - `src/layouts/Layout.astro` pozostaje baza dla obu trybow.
  - Dodac lekka sekcje nawigacji z przyciskami "Zaloguj" / "Zarejestruj" w trybie non-auth oraz "Wyloguj" w trybie auth.

### 1.2 Komponenty client-side (React)
- Formularze React (interaktywne):
  - `src/components/auth/RegisterForm.tsx` — pola email + haslo, walidacja, wysylka do API.
  - `src/components/auth/LoginForm.tsx` — pola email + haslo, walidacja, logowanie, obsluga bledow.
  - `src/components/auth/RecoverForm.tsx` — tylko email, wysylka linku resetu.
  - `src/components/auth/ResetPasswordForm.tsx` — nowe haslo + potwierdzenie.
- Komponenty pomocnicze:
  - `AuthErrorBanner` — ujednolicony komunikat bledu.
  - `AuthSubmitButton` — stan loading i disabled.

### 1.3 Odpowiedzialnosci (Astro vs React)
- Astro:
  - Renderuje strony i zapewnia routing.
  - Pobiera stan sesji z cookies i decyduje o przekierowaniach (np. zalogowany uzytkownik -> `/generate`).
  - Udostepnia bezpieczne endpointy server-side dla akcji auth.
- React:
  - Zbiera dane z formularzy i wysyla je do endpointow API.
  - Obsluguje walidacje po stronie klienta i komunikaty bledu.
  - Zarzadza stanem loading/sukces.

### 1.4 Walidacja i komunikaty bledow
- Walidacja frontend:
  - Email: format RFC (prosty regex), wymagany.
  - Haslo: wymagane, minimalna dlugosc (np. 8 znakow).
  - Potwierdzenie hasla: zgodnosc z haslem.
- Bledy:
  - `VALIDATION_ERROR`: komunikat kontekstowy (np. "Nieprawidlowy email").
  - `UNAUTHORIZED`: "Nieprawidlowy email lub haslo".
  - `RATE_LIMITED`: "Zbyt wiele prob, sprobuj pozniej".
  - `INTERNAL_ERROR`: "Wystapil blad serwera".
- UX:
  - Po rejestracji:
    - Jezeli w Supabase wylaczona jest weryfikacja email, automatyczne logowanie i przekierowanie do `/generate`.
    - Jezeli weryfikacja email jest wlaczona, pokazanie komunikatu o koniecznosci potwierdzenia oraz logowanie po weryfikacji (zgodnie z US-001: konto aktywowane po weryfikacji).
  - Po logowaniu: przekierowanie do `/generate` (US-002).
  - Po odzyskaniu hasla: informacja o wyslaniu maila.

### 1.5 Scenariusze
- Rejestracja (US-001):
  - Uzytkownik wypelnia email + haslo -> walidacja -> POST `/api/auth/register`.
  - Sukces:
    - Gdy email verification OFF: sesja aktywna, przekierowanie do `/generate`.
    - Gdy email verification ON: komunikat "Sprawdz skrzynke" i aktywacja konta po kliknieciu linku; po weryfikacji logowanie i przekierowanie do `/generate`.
- Logowanie (US-002):
  - Uzytkownik wypelnia email + haslo -> POST `/api/auth/login`.
  - Sukces: sesja aktywna, przekierowanie do `/generate`.
  - Blad: komunikat o nieprawidlowych danych.
- Odzyskiwanie hasla:
  - Uzytkownik podaje email -> POST `/api/auth/recover`.
  - Po kliknieciu linku -> `reset-password.astro` + POST `/api/auth/reset`.

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura endpointow API
Endpointy Astro (`src/pages/api/auth/`):
- `POST /api/auth/register` — rejestracja i utworzenie sesji.
- `POST /api/auth/login` — logowanie i utworzenie sesji.
- `POST /api/auth/logout` — wylogowanie (czyszczenie cookies).
- `POST /api/auth/recover` — wysylka linku resetu hasla.
- `POST /api/auth/reset` — ustawienie nowego hasla po linku.
- `GET /api/auth/session` — zwrot podstawowego stanu sesji (do UI i guardow).

### 2.2 Modele danych i kontrakty
- Supabase Auth:
  - `auth.users` jako podstawowy store kont.
- DTO i schematy (Zod) w `src/lib/schemas/auth.ts`:
  - `RegisterInput`, `LoginInput`, `RecoverInput`, `ResetInput`.
- DTO w `src/types.ts`:
  - `AuthResponseDto` (np. `user`, `session`, `message`).

### 2.3 Walidacja danych wejsciowych
- Walidacja server-side przez Zod dla wszystkich endpointow.
- Guard clauses: brak JSON, brak wymaganych pol, nieprawidlowy format.

### 2.4 Obsluga wyjatkow
- Mapowanie bledow Supabase Auth na spojnosc API:
  - Bledy loginu: `UNAUTHORIZED` + 401.
  - Bledy rejestracji: 400/409 w zaleznosci od przyczyny (np. email zajety).
  - Reset: 400 dla niepoprawnego tokenu, 500 dla bledow systemowych.
- Ujednolicone odpowiedzi przez `src/lib/api-responses.ts`.

### 2.5 SSR i routing
- `export const prerender = false` dla endpointow auth.
- Strony wymagajace sesji:
  - SSR sprawdza cookies, w razie braku sesji przekierowuje do `/login`.
  - Strony auth (login/register) przekierowuja zalogowanych do `/generate`.
- Uwzglednienie adaptera SSR z `astro.config.mjs` (Node standalone).

## 3. SYSTEM AUTENTYKACJI (Supabase + Astro)

### 3.1 Supabase Auth
- Rejestracja: `supabase.auth.signUp({ email, password })`.
- Logowanie: `supabase.auth.signInWithPassword({ email, password })`.
- Wylogowanie: `supabase.auth.signOut()`.
- Recover: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Reset: `supabase.auth.updateUser({ password })` po sesji z linku.

### 3.2 Integracja z Astro
- Uzywanie `context.locals.supabase` (middleware).
- Przechowywanie sesji w cookies (supabase-js), z bezpiecznymi flagami (HttpOnly/Secure) po stronie server-side.
- Odczyt sesji w SSR (np. `supabase.auth.getUser()`).

### 3.3 Bezpieczenstwo i zgodnosc
- Hasla i tokeny sa przechowywane przez Supabase.
- Wylacznie server-side dostep do sekretow (env).
- RLS zapewnia izolacje danych per user (US-009).
- Wyswietlanie bledow bez ujawniania szczegolow (bez informacji czy email istnieje).

## 4. Wykaz komponentow, modulow i serwisow

### Frontend (Astro/React)
- Strony Astro: `login.astro`, `register.astro`, `recover.astro`, `reset-password.astro`.
- Komponenty React: `RegisterForm`, `LoginForm`, `RecoverForm`, `ResetPasswordForm`.
- UI: `src/components/ui` (shadcn/ui) + `Button`, `Input`, `Label`, `Alert`.

### Backend (Astro API)
- Endpointy: `src/pages/api/auth/*`.
- Schematy Zod: `src/lib/schemas/auth.ts`.
- Serwis auth: `src/lib/services/auth.ts` (wrapper na Supabase Auth).
- Helpery: `ensureAuthenticated` w `src/lib/auth.ts` dla guardow.

## 5. Kontrakty i przeplywy

### Rejestracja
- UI -> `POST /api/auth/register` -> Supabase.
  - Email verification OFF: set-cookie -> 201 -> redirect `/generate`.
  - Email verification ON: 200 + komunikat o weryfikacji -> klikniecie linku -> sesja -> redirect `/generate`.

### Logowanie
- UI -> `POST /api/auth/login` -> Supabase -> set-cookie -> 200 -> redirect `/generate`.

### Odzyskiwanie hasla
- UI -> `POST /api/auth/recover` -> Supabase wysyla email -> 200.
- Link z emaila -> `reset-password.astro` -> `POST /api/auth/reset` -> 200.

## 6. Uwagi o zgodnosci z istniejacym dzialaniem
- Nie zmienia sie mechanizm generowania fiszek ani API flashcards.
- Wszystkie nowe strony i API sa addytywne.
- Guardy auth nie naruszaja funkcjonalnosci publicznych stron (np. landing page).
