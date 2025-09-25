# ModuPrompt

ModuPrompt is a local-first prompt authoring studio that lets teams design,
test, and ship governed prompt flows without depending on hosted services. The
platform bridges notebook-style editing with a visual node graph, provides a
versioned snippet library, and produces deterministic exports that carry full
provenance.

---

## Why ModuPrompt
- **Unified editing** – switch instantly between notebook and node graph views
  while working on the same source of truth.
- **Governed snippets** – track metadata, history, and provenance pins for every
  reusable fragment.
- **Deterministic exports** – compile Markdown/HTML/PDF/chat transcripts with
  stable hashes so audits can rely on them.
- **Local-first by default** – run everything on your machine or docker host;
  add optional services only when collaboration is needed.

The product, technical, and structure steering documents live in
`.spec-workflow/steering/`. The full approved specification (requirements,
design, tasks) is available under `.spec-workflow/specs/moduprompt-overview/`.

---

## Quick Start (≈10 minutes)
Follow the path that matches how you want to explore ModuPrompt.

### Option A – Docker (recommended for evaluators & end users)
1. **Install prerequisites**: Docker Desktop or Docker Engine with Compose v2.
2. **Create an environment file** (keep it local, do not commit):
   ```bash
   cd deploy/docker
   cat <<'ENV' > .env.local
   DATABASE_URL=postgresql://moduprompt:moduprompt@postgres:5432/moduprompt?schema=public
   POSTGRES_PASSWORD=moduprompt
   STORAGE_ACCESS_KEY=minioadmin
   STORAGE_SECRET_KEY=minioadmin
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin
   ENV
   ```
   Change the secrets before sharing with a team.
3. **Launch the core stack** (app + Postgres):
   ```bash
   docker compose --profile core --env-file .env.local up --build --wait
   ```
> **Troubleshooting (spec fix-typescript-workspace-build – Requirement 3):** The Docker build runs `pnpm build` inside the image and expects the workspace to resolve the shared package `@moduprompt/types`. If a cached layer still emits `TS2307` errors, rebuild with `docker compose --profile core --env-file .env.local build --no-cache` and run `pnpm install --frozen-lockfile && pnpm build` once on the host to regenerate shared type artifacts before re-running Docker. Keep secrets in `.env.local` out of version control.
4. Open **http://localhost:8080** in your browser. The PWA runs entirely in your
   browser even if you stop Docker later.
5. To try exports and artifact storage, add supporting services:
   ```bash
   docker compose --profile exports --env-file .env.local up --build --wait
   ```
   This starts the export worker, MinIO (S3-compatible), and Redis queue.

Stop the stack with `docker compose down --volumes` when you are done. This
removes generated data (snippets, documents, exports).

### Option B – Run from source (for contributors & advanced users)
1. **Install prerequisites**:
   - Node.js 20.17.x (Corepack recommended so pnpm is managed for you).
   - pnpm 9.7.x (workspace is pinned to this version).
   - Optional: `pnpm exec playwright install` for UI tests.
2. **Install dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```
3. **Build everything once**:
   ```bash
   pnpm build
   ```
4. **Start the API** (uses in-memory export stub by default):
   ```bash
   pnpm --filter @moduprompt/api dev
   ```
   The service listens on http://localhost:3000. Configure environment variables
   as described in [Configuration](#configuration-cheat-sheet) before pointing
   real storage or queues at it.
5. **Work on the client packages** (modules under `apps/web` and `packages/*`).
   Use Vitest for fast feedback while you develop:
   ```bash
   pnpm --filter @moduprompt/web test --watch
   ```
6. To preview the UI interactively without Docker, reuse the Playwright harness:
   ```bash
   pnpm exec vite dev --config tests/e2e/harness/vite.config.ts --host 127.0.0.1 --port 4173
   ```
   Visit http://127.0.0.1:4173 and the harness will serve the app shell backed
   by your local packages.

---

## Everyday Workflows
- **Compose prompts** in the notebook view with formatter toolbars, snippet drop
  zones, and command palette shortcuts.
- **Visualise flows** in the node graph to sanity-check branches, dependency
  edges, and governance status chips.
- **Manage snippets** with frontmatter metadata, smart folders, and append-only
  history. Pin a revision to lock a prompt to a known version.
- **Preflight & export** using the live preview panel. Resolve any blocking
  diagnostics, then choose an export recipe to produce Markdown, HTML, PDF, or
  chat-ready text with provenance.
- **Stay deterministic** by keeping document width within the allowed 80/96/120
  character choices and by pinning snippet revisions before export.

For a guided walkthrough, see `docs/product/quickstart.md`.

---

## Quality Gate Checklist
These commands mirror the CI pipeline defined in
`.github/workflows/pipeline.yml`.

| Command | What it verifies |
| --- | --- |
| `pnpm typecheck` | TypeScript strict mode across all workspace packages. |
| `pnpm test` | Unit + integration suites (Vitest, jsdom, fake-indexeddb, Prisma). |
| `pnpm build` | Ensures packages compile and bundler configuration stays valid. |
| `pnpm test:e2e` | Playwright end-to-end flows with axe-core accessibility checks. |
| `pnpm test:perf` | Deterministic compiler benchmarks (keep latency budgets). |
| `docker build -f deploy/docker/Dockerfile .` | Builds the production image. |
| `trivy image moduprompt/app:TAG` | Optional local security scan matching the CI “container-security” job. |

All tests are deterministic—fixtures set explicit seeds to fulfil
<determinism-and-reproducibility/>.

---

## Configuration Cheat Sheet
Full details live in `docs/ops/env-vars.md`. The table below lists the most
common variables.

| Variable | Component | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | API / exporter | `postgresql://moduprompt:…` | Include `schema=public` for Prisma. Treat as **Confidential**. |
| `PORT` | API | `8080` (Docker) / `3000` (dev) | Adjust when running behind proxies. |
| `STORAGE_ENDPOINT` | API / exporter | `http://minio:9000` | Required for deterministic export artifacts. |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | API / exporter | `minioadmin` (dev) | Rotate before sharing instances. |
| `EXPORT_QUEUE_URL` | API / exporter | `redis://redis:6379` | Leave unset to disable background export jobs. |
| `EXPORT_PDF_RENDERER` | Exporter | `stub` | Switch to `puppeteer` when Chromium is available. |
| `LOG_LEVEL` | All services | `info` | Structured logs follow pino format. |

Never commit secrets or `.env` files. Use Compose `--env-file` or your preferred
secret manager.

---

## Observability & Troubleshooting
- Health checks live at `GET /healthz` (liveness) and `GET /readyz` (readiness).
- Logs use JSON by default. Tail them with `docker compose logs app` or straight
  from the pnpm dev server.
- Governance and export events emit via the webhook dispatcher when optional
  services are enabled. Configure destinations under **Admin › Integrations**.
- If exports stall, confirm the exporter container can reach MinIO/S3 and that
  `EXPORT_QUEUE_URL` is set.

---

## Repository Map
| Path | What lives here |
| --- | --- |
| `apps/web` | Client UI modules, document stores, governance panels. |
| `apps/api` | Fastify service, Prisma schema, export pipeline, webhooks. |
| `packages/compiler` | Deterministic compiler and preflight diagnostics. |
| `packages/snippet-store` | Offline storage adapters, governance policy engine. |
| `packages/workers` | Sandboxed workers for filters/formatters and sanitisation. |
| `packages/ui` | Reusable React/Tailwind primitives. |
| `packages/types` | Shared TypeScript interfaces + JSON Schema emitters. |
| `deploy/docker` | Dockerfile, Compose profiles, runtime entrypoints. |
| `docs/` | Product, admin, developer guides, changelog, ADRs. |
| `tests/` | Playwright E2E flows, accessibility checks, performance benches. |

---

## Additional Resources
- Product walkthrough: `docs/product/quickstart.md`
- Governance administration: `docs/admin/governance.md`
- Compiler internals & extension guide: `docs/developer/compiler.md`
- Environment matrix & data classification: `docs/ops/env-vars.md`
- Changelog & readiness notes: `docs/changelog/moduprompt-overview.md`

For implementation details or future enhancements, consult the spec package in
`.spec-workflow/specs/moduprompt-overview/` and keep updates aligned with the
steering documents before merging changes.
