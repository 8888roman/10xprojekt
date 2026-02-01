# 10x-cards

An educational flashcard application that enables users to quickly create and manage flashcard sets. The app leverages LLM models (via API) to generate flashcard suggestions from provided text, streamlining the creation of high-quality study materials.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Manual creation of high-quality flashcards requires significant time and effort, which discourages the use of effective learning methods such as spaced repetition. **10x-cards** addresses this by:

- **AI-powered generation** — Paste text and let the LLM suggest flashcards
- **Manual creation** — Add and manage your own flashcards
- **Spaced repetition** — Use an open-source algorithm for efficient learning sessions
- **User accounts** — Secure registration, login, and data ownership (GDPR compliant)

## Tech Stack

- **[Astro](https://astro.build/)** 5 — Modern web framework
- **[TypeScript](https://www.typescriptlang.org/)** 5 — Type-safe development
- **[React](https://react.dev/)** 19 — Interactive UI components
- **[Tailwind CSS](https://tailwindcss.com/)** 4 — Utility-first styling
- **[Shadcn/ui](https://ui.shadcn.com/)** — Accessible UI components
- **[Supabase](https://supabase.com/)** — Database and authentication
- **OpenRouter API** — LLM integration for flashcard generation

## Getting Started Locally

### Prerequisites

- **Node.js** v22.14.0 (see [`.nvmrc`](.nvmrc))
- **npm** (included with Node.js)

We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions:

```bash
nvm use
```

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/10x-cards.git
cd 10x-cards
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anonymous/public key |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM access |

Optional OpenRouter variables:

| Variable | Description |
|----------|-------------|
| `OPENROUTER_BASE_URL` | Override OpenRouter base URL |
| `OPENROUTER_DEFAULT_MODEL` | Default model for chat completions |
| `OPENROUTER_TIMEOUT_MS` | Request timeout in milliseconds |
| `OPENROUTER_APP_NAME` | App name header for OpenRouter |
| `OPENROUTER_APP_URL` | App URL header for OpenRouter |

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### OpenRouter Chat Endpoint

Send a chat completion request:

```bash
curl -X POST http://localhost:4321/api/openrouter/chat \
  -H "Content-Type: application/json" \
  -d '{
    "system": "You are a helpful assistant. Reply in Polish.",
    "user": "Stworz 3 pytania do nauki o Astro 5.",
    "params": { "temperature": 0.2, "max_tokens": 300 }
  }'
```

Structured response (JSON schema):

```bash
curl -X POST http://localhost:4321/api/openrouter/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user": "Zwroc dane w JSON.",
    "schema": {
      "type": "object",
      "properties": { "ok": { "type": "boolean" } },
      "required": ["ok"],
      "additionalProperties": false
    }
  }'
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run astro` | Run Astro CLI commands |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |

## Project Scope

### Features (MVP)

- **AI flashcard generation** — Paste text (1000–10,000 chars); LLM proposes questions and answers for review
- **Manual flashcard creation** — Add, edit, and delete flashcards with front/back content
- **User authentication** — Registration, login, and account deletion (with associated data)
- **Study sessions** — Spaced repetition learning with an open-source algorithm
- **Statistics** — Track AI-generated vs. accepted flashcards

### Out of Scope (MVP)

- Custom spaced repetition algorithms (using an existing library)
- Gamification
- Mobile apps (web only)
- Multi-format document import (PDF, DOCX)
- Public API
- Sharing flashcards between users
- Advanced notifications
- Advanced keyword search

## Project Status

**Version:** 0.0.1  
**Status:** Early development / MVP in progress

The project is actively evolving. Core features from the [Product Requirements Document](.ai/prd.md) are being implemented.

## License

MIT
