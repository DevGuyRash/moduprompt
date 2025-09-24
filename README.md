# ModuPrompt

ModuPrompt is a self-hosted, Docker-first prompt authoring studio that unifies
notebook and node-based editing, governed snippet management, and deterministic
export pipelines. This repository contains the full monorepo (client modules,
API service, compiler, worker sandboxes, and deployment assets) described in the
`moduprompt-overview` specification and the steering documents.

> If you are new to the project, review the steering artifacts first:
> - Product strategy: `.spec-workflow/steering/product.md`
> - Technical guardrails: `.spec-workflow/steering/tech.md`
> - Repository conventions: `.spec-workflow/steering/structure.md`
>
> The spec handoff package lives under
> `.spec-workflow/specs/moduprompt-overview/`.

## Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local Development (pnpm workspace)](#local-development-pnpm-workspace)
- [Docker Compose Stack](#docker-compose-stack)
- [Testing & QA Matrix](#testing--qa-matrix)
- [Environment Configuration](#environment-configuration)
- [Observability & Debugging](#observability--debugging)
- [Repository Layout](#repository-layout)
- [Reference Documentation](#reference-documentation)

## Prerequisites
- **Node.js:** 20.17.0 (aligns with `.github/workflows/pipeline.yml`). Use
  Corepack or install manually.
- **pnpm:** 9.7.x (workspace uses lockfile pinning).
- **Docker & Docker Compose v2:** required for the hardened runtime and
  integration profiles.
- **Playwright browsers:** Install with `pnpm exec playwright install` before
  running end-to-end tests.

## Installation
```bash
pnpm install --frozen-lockfile
```
- Use `--frozen-lockfile` to respect supply-chain pinning and keep SBOMs valid.
- The workspace is large; prefer enabling pnpm disk cache to avoid repeated
  downloads (`pnpm config set store-dir ~/.pnpm-store`).

## Local Development (pnpm workspace)
Most engineers iterate with pnpm scripts while keeping the Docker stack for
system-level validation.

1. **Generate build artefacts** (compiles shared packages, worker bundles, and
   API output):
   ```bash
   pnpm build
   ```
2. **Run the API service** (serves REST endpoints, exports, and health probes):
   ```bash
   pnpm --filter @moduprompt/api dev
   ```
   - Defaults: `PORT=3000`, in-memory export stub (`EXPORT_PDF_RENDERER=stub`).
   - Provide a `.env` or shell exports before launching (see
     [Environment Configuration](#environment-configuration)).
3. **Iterate on client modules**:
   - UI components, document stores, and governance logic live under `apps/web`
     and `packages/*`. Use Vitest + Testing Library for fast feedback (`pnpm
     --filter @moduprompt/web test --watch`).
   - To exercise the UI interactively, reuse the Playwright harness:
     ```bash
     pnpm exec vite dev --config tests/e2e/harness/vite.config.ts --host 127.0.0.1 --port 4173
     ```
     Open http://127.0.0.1:4173 once the harness reports ready.
4. **Database migrations** (if working on the API):
   ```bash
   pnpm --filter @moduprompt/api prisma:generate
   pnpm --filter @moduprompt/api prisma:migrate
   ```
5. **Linting (API only for now):**
   ```bash
   pnpm --filter @moduprompt/api lint
   ```

## Docker Compose Stack
The Docker profiles deliver a production-like runtime with hardened containers.
All commands below run from `deploy/docker/`.

1. Create a secrets file (never commit it):
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
   - Replace defaults before deploying to shared environments. Treat all
     `*_PASSWORD`, `*_SECRET*`, and access keys as **Confidential**.
   - Review `docs/ops/env-vars.md` for the full matrix and classification.
2. **Core authoring profile** (API + Postgres only):
   ```bash
   docker compose --profile core --env-file .env.local up --build --wait
   ```
   - App becomes available on http://localhost:8080 once `/healthz` returns `200`.
   - Temporary caches mount to `app-cache` volume; clean with `docker volume rm`.
3. **Exports profile** (adds exporter worker, MinIO, Redis):
   ```bash
   docker compose --profile exports --env-file .env.local up --build --wait
   ```
   - Enables deterministic PDF/HTML export jobs. Monitor worker logs with
     `docker compose logs exporter`.
4. Shut down stacks with `docker compose down --volumes` when finished (drops
   Postgres/MinIO data).

## Testing & QA Matrix
| Command | Purpose | Notes |
| --- | --- | --- |
| `pnpm typecheck` | TypeScript strict mode across workspace | Run before commits to keep CI green. |
| `pnpm test` | Unit + integration suites (Vitest, jsdom, fake-indexeddb) | Covers compiler, document store, governance policies. |
| `pnpm build` | Compile artefacts; ensures the build graph stays reproducible | Mirrors CI `quality` job. |
| `pnpm test:e2e` | Playwright flows + axe-core accessibility audits | Spins a harness Vite server automatically. Requires browsers installed. |
| `pnpm test:perf` | Compiler performance benchmarks | Validates latency budgets; review results before merging perf-sensitive changes. |
| `docker build -f deploy/docker/Dockerfile .` + Trivy scan | Optional local image scan matching the CI `container-security` job | Requires Trivy (`aquasecurity/trivy`). |

- All tests are deterministic: random seeds live in fixtures under `tests/`.
- Golden fixtures guard deterministic compiler output—update intentionally and
  record rationale in `docs/changelog/moduprompt-overview.md` if regenerated.

## Environment Configuration
- Canonical reference: `docs/ops/env-vars.md` (includes data classification and
  profile guidance).
- Minimum required variables for local API/compose flows:
  - `DATABASE_URL` (include `schema=public` when using Prisma).
  - `PORT` (API listener; defaults to `8080` inside Docker, `3000` in pnpm dev).
  - `STORAGE_*` credentials when exports or MinIO enabled.
  - `MINIO_ROOT_*` for Docker profile with MinIO.
- Optional toggles:
  - `EXPORT_PDF_RENDERER=puppeteer` when Chromium is available on the host.
  - `LOG_LEVEL=trace|debug|info|warn|error|fatal` for structured logging depth.
  - `EXPORT_QUEUE_CONCURRENCY` and retry/backoff parameters (see
    `apps/api/src/config/env.ts`).
- Secrets stay out of Git: use `docker compose --env-file` or secret managers.

## Observability & Debugging
- Health probes: `GET /healthz` (liveness) and `GET /readyz` (readiness).
- Logs: Fastify uses pino JSON. When running via pnpm, logs stream to stdout; in
  Docker use `docker compose logs app`.
- Export metrics/audit events emit via webhook dispatcher when backend is
  enabled; configure destinations under Admin > Integrations (see
  `docs/admin/governance.md`).
- Keep document layout within `80ch`, `96ch`, or `120ch` as enforced by
  governance policies. Toggle widths in the UI preview panel and ensure exports
  remain within the chosen budget.

## Repository Layout
| Path | Purpose |
| --- | --- |
| `apps/web` | React component modules, document stores, governance UI (library form). |
| `apps/api` | Fastify service, Prisma schema, export pipeline, webhooks. |
| `packages/compiler` | Deterministic compiler, preflight diagnostics, worker adapters. |
| `packages/snippet-store` | Dexie/OPFS adapters, governance policy engine, audit logging. |
| `packages/ui` | Shared UI primitives and Tailwind tokens. |
| `packages/workers` | Sandboxed workers for filters, formatters, sanitizer guards. |
| `packages/types` | Source of truth for data contracts + JSON Schema emitters. |
| `deploy/docker` | Dockerfile, Compose profiles, runtime entrypoints. |
| `docs/` | Product, admin, developer guides, changelog, ADR references. |
| `tests/` | Playwright E2E suites, accessibility checks, performance benches. |

## Reference Documentation
- Quickstart workflow: `docs/product/quickstart.md`
- Governance administration: `docs/admin/governance.md`
- Compiler internals: `docs/developer/compiler.md`
- Environment matrix: `docs/ops/env-vars.md`
- Spec changelog & handoff: `docs/changelog/moduprompt-overview.md`
- Approved spec artefacts: `.spec-workflow/specs/moduprompt-overview/`

Keep documentation updates synchronized with the decision log and ensure any
process change feeds back into steering or spec artefacts before implementation.
