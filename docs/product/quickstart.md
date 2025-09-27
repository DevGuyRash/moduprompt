# ModuPrompt Quickstart Guide

## Audience
Prompt architects, automation engineers, enablement leads, and compliance reviewers who need a deterministic, offline-ready workflow for composing prompts, governing snippet usage, and deploying ModuPrompt via pnpm or Docker.

## Before You Begin
- Choose **one** runtime path:
  - Node.js 20.17.x (via Corepack) with pnpm 9.7.x for local development.
  - Docker Engine/Compose v2 for containerised evaluation.
- Populate environment variables using [`docs/ops/env-vars.md`](../ops/env-vars.md) so API, export, and storage services share consistent credentials.
- Download the governed demo bundle [`docs/product/samples/workspace-demo.json`](samples/workspace-demo.json). This snapshot exercises notebook, node graph, compiler, governance, and provenance features.
- Install Playwright browsers if you plan to run UI smoke tests: `pnpm exec playwright install`.

## Launch the Stack
### pnpm workspace (contributors)
1. Install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
2. Start the API:
   ```bash
   pnpm --filter @moduprompt/api dev
   ```
   The API serves Fastify endpoints with structured logs, CSP headers, and health probes (`/healthz`, `/readyz`).
3. In a second terminal start the web client:
   ```bash
   pnpm --filter @moduprompt/web dev
   ```
   Vite emits hashed assets, registers the service worker, and hydrates notebook/node graph stores on load.

### Docker Compose (operators)
1. Copy `deploy/docker/.env.local` and adjust secrets before production use.
2. Bring up the core stack:
   ```bash
   docker compose --profile core --env-file deploy/docker/.env.local up --build --wait
   ```
3. Add the exports profile when you need PDF/HTML generation:
   ```bash
   docker compose --profile exports --env-file deploy/docker/.env.local up --build --wait
   ```
4. Browse to http://localhost:8080. The container serves the compiled SPA through Fastify with CSP + integrity headers derived from the Vite manifest.

## Seed the Sample Workspace
1. Open **Settings → Workspace Snapshot → Import** in the PWA.
2. Select `docs/product/samples/workspace-demo.json`. The bundle restores:
   - A governed prompt document with synchronized notebook and node graph layouts.
   - Snippet history with integrity hashes and provenance pins.
   - Governance statuses (Draft → Review → Approved) and export recipes for deterministic Markdown.
3. Verify the import by switching between **Notebook**, **Node Graph**, **Snippets**, and **Governance** panels. Changes propagate within 200 ms by design (Requirement 2).

> [!NOTE]
> Workspace imports honour IndexedDB/OPFS migrations. If migrations fail, the UI surfaces audit entries and recovery guidance per Requirement 3.

## Tour the Stabilised Workflow
1. **Notebook authoring (Requirement 1):** edit the imported document; confirm autosave and deterministic block ordering.
2. **Node graph synchronisation (Requirement 2):** observe edges update as you rearrange blocks; undo/redo remains lossless.
3. **Snippet governance (Requirement 3 & 4):** review snippet versions, provenance hashes, and audit log entries. Status transitions emit structured events.
4. **Compiler preview (Requirement 2 & 5):** trigger `Preview → Markdown`. Inline diagnostics reference governance gates and sanitizer warnings.
5. **Policy gating (Requirement 4):** attempt an export while status=Draft to see gating; mark as Approved to unlock recipes.

## Offline & Recovery Checklist
1. Install the PWA (`chrome://apps` or browser equivalent) to cache manifest and service worker assets.
2. Trigger **Go offline** in devtools (or disconnect networking). Reload; the shell, document state, and snippets load from Dexie/OPFS without network calls.
3. Reconnect and check the activity banner—queued audit/export events flush automatically. Confirm logs in the API (`pnpm --filter @moduprompt/api dev` terminal) include reconciliation entries.
4. Review `Settings → Workspace Snapshot → Export` and capture the hash printed in the UI; compare with the `integrityHash` stored in the sample bundle for determinism.

## Deterministic Exports & Smoke Tests
- Generate a Markdown export via the governance-approved recipe. The footer lists snippet revisions and compile hashes; record the run in your change log.
- Run Playwright journeys for an automated end-to-end validation:
  ```bash
  pnpm test:e2e --project journeys
  pnpm test:e2e --project accessibility
  DOCKER_SMOKE_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e --project docker-smoke
  ```
  These suites assert notebook/node graph parity, WCAG coverage (axe-core), offline banners, and Fastify telemetry endpoints.
- Call `pnpm docker:verify` (Requirement 5) to ensure the runtime image contains production dependencies only. The command relies on `scripts/docker/verify-runtime-deps.mjs` and outputs JSON suitable for audit trails.

## Observability & Runbooks
- Fastify emits structured logs (`pino` JSON) with correlation IDs; forward them to Loki/ELK as described in [`docs/ops/env-vars.md`](../ops/env-vars.md#health-observability--governance).
- CSP, HSTS, CORP/COOP headers default to steering-compliant values. Adjust via environment variables if you terminate TLS elsewhere.
- For incident handling, capture:
  - Service worker failures (`navigator.serviceWorker.controller` logs).
  - IndexedDB migration alerts (UI toast + `apps/web/src/services/storage` logs).
  - Export worker retries (visible in `/api/exports` responses and Docker logs).

## Accessibility & Governance Guardrails
- Keyboard navigation covers all interactive regions (sidebar, notebook cells, node graph canvas). Use `?` to open shortcut help.
- Governance chips meet WCAG AA; verify using the accessibility Playwright project.
- Document width policies (80 / 96 / 120 ch) live under **Governance → Display Policies** and propagate to exports.

## Traceability & References
- Spec alignment: Requirements 1–5, Design §Architecture & Offline, Tasks document task 7.
- Steering references: `.spec-workflow/steering/product.md`, `.spec-workflow/steering/tech.md`, `.spec-workflow/steering/structure.md`.
- Change log: record adoption and risk notes in [`docs/changelog/moduprompt-stabilization.md`](../changelog/moduprompt-stabilization.md).
