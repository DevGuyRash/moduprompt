# Tasks Document

- [x] 1. Add Fastify static assets plugin
  - Files: apps/api/src/plugins/staticAssets.ts, apps/api/src/config/env.ts
  - Create `staticAssetsPlugin` registering `@fastify/static`, configure SPA fallback, validate static root from env schema.
  - Update env loader/schema to expose `STATIC_ROOT` with default `/srv/moduprompt/apps/web/dist` and ensure startup fails if directory missing.
  - _Leverage: apps/api/src/plugins/exportPipeline.ts, apps/api/src/config/env.ts, @fastify/static docs_
  - _Requirements: 1.1, 1.2, 3.1_
  - _Prompt: Implement the task for spec docker-pwa-serving, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Platform Engineer specializing in Fastify | Task: Add a reusable static assets plugin that serves files from the built PWA directory, wires SPA fallback for non-API routes, and validates configuration via env schema updates | Restrictions: Do not alter existing API route behaviour, keep plugin side-effect free beyond registration, follow existing plugin structure patterns | _Leverage: apps/api/src/plugins/exportPipeline.ts, apps/api/src/config/env.ts, @fastify/static documentation_ | _Requirements: 1.1, 1.2, 3.1_ | Success: Plugin serves `/` with index.html, SPA fallback works for deep links, API 404 responses unchanged, missing static directory causes startup failure_

- [x] 2. Wire plugin into Fastify bootstrap
  - Files: apps/api/src/app.ts, apps/api/src/index.ts
  - Register `staticAssetsPlugin` before API routes, ensure logging surfaces configured static root, preserve health endpoints.
  - _Leverage: apps/api/src/plugins/security.ts, apps/api/src/app.ts existing registrations_
  - _Requirements: 1.1, 2.1_
  - _Prompt: Implement the task for spec docker-pwa-serving, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer focused on Fastify lifecycle management | Task: Integrate the new static assets plugin into the Fastify bootstrap so SPA assets are served while API behaviour and health endpoints remain unchanged | Restrictions: Maintain plugin registration order, avoid modifying route handlers except for necessary SPA catch-all, ensure logging stays consistent | _Leverage: apps/api/src/app.ts, apps/api/src/plugins/security.ts_ | _Requirements: 1.1, 2.1_ | Success: `/` returns PWA bundle, `/api/*` routes operate unchanged, health endpoints continue emitting JSON 200_

- [x] 3. Ensure Docker runtime exposes static root
  - Files: deploy/docker/Dockerfile, deploy/docker/docker-compose.yml, scripts/docker/verify-runtime-deps.mjs (if needed)
  - Verify runtime stage copies PWA bundle and set `STATIC_ROOT` env; adjust compose env passthrough while keeping read-only filesystem constraints.
  - _Leverage: deploy/docker/Dockerfile, deploy/docker/docker-compose.yml, existing docker-build-hardening spec_
  - _Requirements: 1.1, 3.1_
  - _Prompt: Implement the task for spec docker-pwa-serving, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer specializing in Docker hardening | Task: Confirm and adjust Docker artefacts so the runtime container exposes the PWA bundle via STATIC_ROOT without violating read-only or verification policies | Restrictions: Do not relax security options (no-new-privileges, read_only), keep multi-stage build deterministic, update verification script only if required | _Leverage: deploy/docker/Dockerfile, deploy/docker/docker-compose.yml, scripts/docker/verify-runtime-deps.mjs_ | _Requirements: 1.1, 3.1_ | Success: Runtime container contains `/srv/moduprompt/apps/web/dist`, STATIC_ROOT env is set, verification pipeline still passes_

- [x] 4. Add automated coverage for SPA serving
  - Files: apps/api/src/plugins/staticAssets.test.ts (or similar), tests/e2e/docker/spa-smoke.test.ts, package.json scripts if needed
  - Write Vitest unit tests for SPA fallback and API 404 separation; add docker/web smoke test validating status 200 at `/` and core assets.
  - _Leverage: apps/api/tests (pattern), tests/e2e/harness, docker-build-hardening verification commands_
  - _Requirements: 1.1, 1.3, 2.1, 3.2_
  - _Prompt: Implement the task for spec docker-pwa-serving, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with experience in Fastify and Playwright | Task: Add automated tests ensuring the Docker runtime serves the SPA homepage, static assets stream correctly, and API routes still return JSON 404 for unknown endpoints | Restrictions: Keep tests deterministic (fixed ports, seeds), reuse existing harness utilities, ensure new tests run in CI without flaky network dependencies | _Leverage: apps/api/tests, tests/e2e/harness, docker compose utilities_ | _Requirements: 1.1, 1.3, 2.1, 3.2_ | Success: Unit and E2E tests fail on regressions where `/` returns 404 or API responses change, tests integrated into existing scripts_

- [x] 5. Update documentation and readiness checks
  - Files: README.md, docs/ops/env-vars.md, .spec-workflow/specs/docker-pwa-serving/tasks.md
  - Document new behaviour, note STATIC_ROOT env var, ensure docker quickstart references SPA availability and smoke test command.
  - _Leverage: README.md docker section, docs/ops/env-vars.md, prior spec documentation patterns_
  - _Requirements: 1.1, 3.2_
  - _Prompt: Implement the task for spec docker-pwa-serving, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with DevOps context | Task: Refresh Docker documentation to describe SPA availability and new environment variables, ensuring readiness steps mention the smoke test | Restrictions: Keep docs concise, align with steering terminology, avoid duplicating info from other specs | _Leverage: README.md, docs/ops/env-vars.md_ | _Requirements: 1.1, 3.2_ | Success: Documentation clearly states `/` serves the PWA after compose up, env var table includes STATIC_ROOT, instructions reference verification commands_
