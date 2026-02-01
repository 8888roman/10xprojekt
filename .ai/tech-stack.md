# Tech Stack – 10x Projekt

Dokument opisuje języki, frameworki i narzędzia użyte w projekcie.

---

## Języki

| Język        | Wersja / kontekst | Zastosowanie                          |
|--------------|-------------------|----------------------------------------|
| **TypeScript** | 5 (strict)        | Cały kod źródłowy, typy, Astro/React  |
| **JSX**        | React JSX         | Komponenty React (`tsx`, `jsx`)        |
| **SQL**        | PostgreSQL        | Migracje Supabase (`supabase/migrations/`) |
| **CSS**        | —                 | Stylowanie (Tailwind, zmienne w `global.css`) |

---

## Frameworki i runtime

| Technologia   | Wersja   | Rola |
|---------------|----------|------|
| **Astro**     | 5.x      | Framework główny: strony, layouty, SSR, routing, middleware |
| **React**     | 19.x     | Komponenty interaktywne (integracja `@astrojs/react`) |
| **Node.js**   | 22.x     | Runtime (`.nvmrc`: 22.14.0), adapter SSR (`@astrojs/node`, standalone) |
| **Vite**      | (via Astro) | Bundler i dev server |

---

## Stylowanie i UI

| Technologia        | Wersja | Zastosowanie |
|--------------------|--------|--------------|
| **Tailwind CSS**   | 4.x    | Utility-first CSS, plugin Vite `@tailwindcss/vite` |
| **shadcn/ui**      | (new-york) | Komponenty UI (Radix, style New York, zmienne CSS, neutral) |
| **Radix UI**       | (slot) | Prymitywy w komponentach (np. `@radix-ui/react-slot`) |
| **Lucide React**   | 0.487+ | Ikony (ustawione w `components.json` jako `iconLibrary`) |
| **class-variance-authority (CVA)** | 0.7.x | Warianty klas komponentów |
| **clsx**           | 2.x    | Warunkowe klasy |
| **tailwind-merge** | 3.x    | Łączenie klas Tailwind bez konfliktów |
| **tw-animate-css** | 1.2.x  | Animacje CSS w stylu Tailwind |

---

## Baza danych i backend

| Technologia   | Wersja | Zastosowanie |
|---------------|--------|--------------|
| **Supabase**  | CLI 2.74+, client 2.93+ | BaaS: Auth (`auth.users`), Postgres, migracje, klient JS (`@supabase/supabase-js`) |
| **PostgreSQL** | (Supabase) | Schemat, RLS, triggery – zgodnie z `db-plan.md` |

---

## Jakość kodu i formatowanie

| Narzędzie        | Wersja / konfiguracja | Zastosowanie |
|------------------|------------------------|--------------|
| **ESLint**       | 9.x (flat config)      | Linting: JS/TS, Astro, React, React Hooks, jsx-a11y, React Compiler, Prettier |
| **TypeScript ESLint** | 8.28+ (strict, stylistic) | Reguły TypeScript |
| **Prettier**     | (eslint-config-prettier, prettier-plugin-astro) | Formatowanie (JSON, CSS, MD, Astro/TS/TSX) |
| **Husky**        | 9.x                    | Hooki Git (np. pre-commit) |
| **lint-staged**  | 15.x                   | ESLint --fix i Prettier na staged plikach |

---

## Środowisko i konwencje

- **Node:** wersja z `.nvmrc` (22.14.0).
- **Moduły:** `"type": "module"` (ESM).
- **Ścieżki:** alias `@/*` → `./src/*` (w `tsconfig.json` i `components.json`).
- **Styl shadcn:** `new-york`, `baseColor: neutral`, `cssVariables: true`, komponenty w `src/components/ui`, utils w `src/lib/utils`.
