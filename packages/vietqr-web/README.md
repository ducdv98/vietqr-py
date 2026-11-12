# vietqr-web

Next.js web client for [vietqr-api](../vietqr-api). Pages:

| Page | Path | What it does |
| :-- | :-- | :-- |
| Studio | `/` | Create a QR: choose a QR type (static or dynamic), a bank, payment details and a template, then explicitly Generate. |
| Inspect | `/inspect` | Read a QR from a pasted payload or an uploaded image. |
| Banks | `/banks`, `/banks/<bin-or-code>` | Browse the bank catalog. |
| Pay | `/pay?bank=...&account=...` | Payer-facing page for a Pay link. Off by default. |

The client is stateless (ADR 0001), talks to the API through a same-origin `/api/*` proxy
(ADR 0002) and serves bank logos first-party (ADR 0003). The ADRs are in `../../docs/adr`;
terminology is in `../../CONTEXT.md`.

## Run

Needs Node 24, pnpm and a running vietqr-api (`uv run vietqr-api` from the repo root).

    pnpm install
    cp .env.example .env.local    # VIETQR_API_URL=http://localhost:8000
    pnpm dev

To run it together with the API in containers, use `docker compose up --build` from the repo root.

## Configuration

All settings are `VIETQR_*` environment variables read at server start (not baked into the build).
`.env.example` documents each one; the table is in the repository README.

- Server code: `getConfig()` from `@/lib/config/server`.
- Client components: `useConfig()` from `@/lib/config`.

## Scripts

| Script | Purpose |
| :-- | :-- |
| `dev`, `build`, `start` | Next.js dev server, production build, production server. |
| `lint`, `format`, `format:check`, `typecheck` | ESLint, Prettier, TypeScript. |
| `test` | Vitest unit and component tests. |
| `test:e2e` | Playwright specs in `e2e/`, including axe accessibility checks. Needs a running API (`E2E_API_URL`). |
| `api:generate`, `api:check` | Regenerate the typed API client in `src/lib/api/schema.d.ts` from the API's OpenAPI schema, or fail if it is stale. |
| `i18n:check` | Fail when a locale's message keys differ from `messages/en.json`. |

## Layout

- `src/app`: routes, including the `/api/[...path]` proxy and the `/api/logos/[code]` logo route.
- `src/components`: `ui/` (shadcn primitives), `layout/`, `studio/`, `inspect/`, `banks/`, `pay/`, `status/`.
- `src/lib`: `config/` (runtime config), `api/` (generated client, `/health` version check), `studio/` (form fields, query-string contract, validation), `banks/`, `inspect/`, `logos/`, `pay/`, `format/`.
- `src/config/nav.ts`: page and nav registry.
- `messages/`: translations. See [`docs/i18n.md`](docs/i18n.md) for locales, adding a language and theming.
- `e2e/`: Playwright specs.
