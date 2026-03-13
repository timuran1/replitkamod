# Workspace

## Overview

pnpm workspace monorepo using TypeScript. AI Media Suite — a full-stack web application for generating AI images and videos using the fal.ai API. Accessible on both mobile and desktop.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: fal.ai client (`@fal-ai/client`) — single API for all models

## AI Models Supported

### Image Models
- `fal-ai/nano-banana-2` — Google Nano Banana 2 (Imagen)
- `fal-ai/nano-banana-pro` — Google Nano Banana Pro (Imagen premium)

### Video Models
- `fal-ai/kling-video/v3/pro/text-to-video` — KLING 3.0 Pro (Text→Video)
- `fal-ai/kling-video/v3/pro/image-to-video` — KLING 3.0 Pro (Image→Video)
- `fal-ai/veo3` — Google VEO 3.1 (Text→Video)
- `fal-ai/sora-2/text-to-video` — OpenAI Sora 2 (Text→Video)
- `fal-ai/sora-2/image-to-video` — OpenAI Sora 2 (Image→Video)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (fal.ai proxy)
│   ├── ai-suite/           # React + Vite frontend (AI Media Suite)
│   └── mockup-sandbox/     # UI prototyping sandbox
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Environment Variables / Secrets

- `FAL_KEY` — fal.ai API key (required for all AI model calls)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)

## API Routes

All routes under `/api`:

- `GET /api/healthz` — health check
- `GET /api/models` — list all available AI models
- `POST /api/generate/image` — start image generation job
- `POST /api/generate/video` — start video generation job
- `GET /api/jobs/:jobId/status?requestId=...&modelId=...` — poll job status

## Frontend Pages

- `/` — Explore page: model cards with filter tabs
- `/generate` — Studio: model selector, prompt, settings, real-time output
- `/gallery` — User gallery (localStorage, stores last 50 generations)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas from OpenAPI spec
