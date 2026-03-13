# Workspace

## Overview

pnpm workspace monorepo using TypeScript. AI Media Suite — a full-stack web application for generating AI images, videos, voice, lip sync, and motion transfer using the fal.ai API. Accessible on both mobile and desktop.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod` (api-server uses manual validation)
- **File uploads**: multer (api-server)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: fal.ai client (`@fal-ai/client`) — single API for all models

## AI Models Supported (20 models)

### Image Models (6)
- `fal-ai/nano-banana-2` — Google Nano Banana 2 (Imagen 3)
- `fal-ai/nano-banana-pro` — Google Nano Banana Pro
- `fal-ai/flux/schnell` — FLUX Schnell (fast)
- `fal-ai/flux-pro` — FLUX Pro
- `fal-ai/recraft-v3` — Recraft V3
- `fal-ai/ideogram/v2` — Ideogram V2

### Video Models (7)
- `fal-ai/kling-video/v3/pro/text-to-video` — KLING 3.0 Pro (Text→Video)
- `fal-ai/veo3` — VEO 3.1 (Text→Video)
- `fal-ai/sora-2/text-to-video` — Sora 2 (Text→Video)
- `fal-ai/wan/v2.2-a14b/text-to-video` — Wan 2.2 (Text→Video)
- `fal-ai/kling-video/v3/pro/image-to-video` — KLING 3.0 Pro (Image→Video)
- `fal-ai/sora-2/image-to-video` — Sora 2 (Image→Video)
- `fal-ai/wan/v2.2-a14b/image-to-video` — Wan 2.2 (Image→Video)

### Motion Control Models (2)
- `fal-ai/kling-video/v3/pro/motion-control` — KLING Motion 3.0 Pro
- `fal-ai/kling-video/v3/standard/motion-control` — KLING Motion 3.0 Standard
  - Input: character image + reference motion video + character_orientation

### Lip Sync Models (2)
- `fal-ai/sync-lipsync` — Sync Labs Lipsync
- `fal-ai/sync-lipsync/v2` — Sync Labs Lipsync v2
  - Input: face video + audio to sync

### Text to Speech Models (3)
- `fal-ai/f5-tts` — F5-TTS (voice cloning)
- `fal-ai/tada/3b/text-to-speech` — TADA 3B TTS
- `fal-ai/tada/1b/text-to-speech` — TADA 1B TTS

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (fal.ai proxy)
│   │   └── src/routes/
│   │       ├── generate.ts # All generation routes (image/video/motion/lipsync/tts)
│   │       ├── models.ts   # Models list
│   │       ├── upload.ts   # File upload to fal.ai storage
│   │       └── health.ts
│   ├── ai-suite/           # React + Vite frontend
│   │   └── src/
│   │       ├── pages/      # ExplorePage, GeneratePage, GalleryPage
│   │       ├── components/ # FileUpload component + shadcn/ui
│   │       └── lib/        # api.ts, gallery.ts
│   └── mockup-sandbox/     # UI prototyping sandbox
├── lib/
│   ├── api-spec/           # OpenAPI spec v0.2 + Orval config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM
```

## Environment Variables / Secrets

- `FAL_KEY` — fal.ai API key (required for all AI model calls)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)

## API Routes

All routes under `/api`:

- `GET /api/healthz` — health check
- `GET /api/models` — list all 20 available AI models
- `POST /api/upload` — upload file to fal.ai storage (multipart/form-data)
- `POST /api/generate/image` — start image generation job
- `POST /api/generate/video` — start video generation job (text-to-video or image-to-video)
- `POST /api/generate/motion` — start motion control job (requires imageUrl + videoUrl)
- `POST /api/generate/lipsync` — start lip sync job (requires videoUrl + audioUrl)
- `POST /api/generate/tts` — start TTS job (tries direct fal.run first, then queues)
- `GET /api/jobs/:jobId/status?requestId=...&modelId=...` — poll job status

## Frontend Pages

- `/` — Explore page: model cards with category filter tabs (Images, Video, Motion, Lip Sync, Voice)
- `/generate` — Studio: model selector, specialized UI per model type, real-time output
- `/gallery` — User gallery (localStorage, stores last 50 generations — images, videos, audio)

## Key Frontend Components

- `FileUpload` — drag-and-drop file upload with URL paste fallback; uploads via `/api/upload`
- Generate page has specialized UI for each model category:
  - image/video: prompt + aspect ratio + duration/numImages
  - motion-control: character image upload + reference video upload + orientation selector
  - lipsync: face video upload + audio upload
  - tts: text textarea + optional reference audio (for F5-TTS voice cloning)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas from OpenAPI spec
