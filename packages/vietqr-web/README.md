# vietqr-web

Next.js client for vietqr-api. See `.env.example` for all runtime settings.

    pnpm install
    cp .env.example .env.local
    pnpm dev

Scripts: dev, build, start, lint, format, format:check, typecheck, test.

Layout: `src/app` routes, `src/components` (`ui/` shadcn, `layout/`), `src/lib` (`config/` runtime config), `src/config/nav.ts` page/nav registry.

Config: server code `getConfig()` from `@/lib/config/server`; client components `useConfig()` from `@/lib/config`.
