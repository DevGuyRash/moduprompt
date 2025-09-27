# Tasks Document

- [x] 1. Stand up Vite + Tailwind build and dev tooling for the PWA
  - File: apps/web/package.json, apps/web/vite.config.ts, apps/web/tailwind.config.ts, apps/web/postcss.config.cjs, apps/web/public/manifest.webmanifest, apps/web/public/index.html, apps/web/src/main.tsx
  - Add Vite configuration with React plugin, Tailwind/PostCSS pipeline, and hashed asset output aligned to steering defaults
  - Introduce dev script (`pnpm --filter @moduprompt/web dev`), build targets, and shared tsconfig updates for JSX/TSX support
  - Build PWA manifest, preload fonts/token CSS, and inject environment config for API base URLs & feature flags
  - Purpose: Deliver Requirement 1 (PWA shell availability) and Requirement 5 (deterministic tooling)
  - _Leverage: apps/web/src/modules/*, apps/web/src/state/*, packages/types_, `deploy/docker/Dockerfile`
  - _Requirements: Requirement 1, Requirement 5_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Platform Engineer | Task: Introduce Vite + Tailwind build tooling, dev server, and PWA manifest so the web workspace builds to hashed assets and supports hot reload | Restrictions: Preserve workspace boundaries, avoid global refactors, ensure CSP compatibility with nonce/hash strategy | _Leverage: apps/web/src/modules/*, apps/web/src/state/*, packages/types_, deploy/docker/Dockerfile | _Requirements: Requirement 1, Requirement 5 | Success: `pnpm --filter @moduprompt/web dev` and `pnpm --filter @moduprompt/web build` succeed, PWA manifest + index.html emitted, hashed assets copy into Docker runtime_

- [x] 2. Implement AppShell, routing, and layout scaffolding
  - File: apps/web/src/app/AppShell.tsx, apps/web/src/app/router.tsx, apps/web/src/app/providers.tsx, apps/web/src/app/layouts/*.tsx, apps/web/src/styles/tokens.css
  - Compose navigation, sidebar, and workspace selection views integrating notebook/node graph/snippets/governance modules via React Router
  - Register providers (QueryClient, DocumentStoreProvider, Theme) and wire them into AppShell entry
  - Establish global styles and CSS tokens consistent with Product & Structure steering guidance
  - Purpose: Fulfill Requirement 1 (shell) and Requirement 2 (module integration)
  - _Leverage: apps/web/src/modules/*, apps/web/src/state/document-model.ts, packages/ui (future placeholder)_, React Router
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Application Architect | Task: Construct the AppShell, providers, and layout layers to host notebook, node graph, snippets, governance, and compiler views with routing and shared state | Restrictions: Keep feature modules decoupled, respect accessibility (ARIA, keyboard), avoid blocking operations on render | _Leverage: apps/web/src/modules/*, apps/web/src/state/document-model.ts_, packages/types | _Requirements: Requirement 1, Requirement 2 | Success: Navigating between routes keeps state synchronized, layout matches governance/accessibility standards, Lighthouse passes basic PWA audits_

- [x] 3. Build client data services, worker bridge, and module orchestration
  - File: apps/web/src/services/api/*.ts, apps/web/src/services/storage/*.ts, apps/web/src/services/workers/*.ts, apps/web/src/modules/*/hooks/*.ts (updates)
  - Implement typed API clients for documents, snippets, exports, governance using fetch + TanStack Query with zod validation
  - Connect notebook/node graph/snippet modules to centralized stores, register worker bridge for compiler/formatter execution, and ensure optimistic updates with rollback
  - Purpose: Deliver Requirement 2 (module synchronization) and Requirement 3 (offline-ready storage integration)
  - _Leverage: apps/api/src/modules/*/schemas.ts, packages/snippet-store, packages/compiler, apps/web/src/state/*.ts_
  - _Requirements: Requirement 2, Requirement 3_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Domain Engineer | Task: Create API/service layers, worker bridge, and orchestration hooks that glue existing feature modules to Fastify endpoints and worker pools with optimistic state management | Restrictions: Maintain typed contracts via zod, avoid duplicate schema logic, ensure deterministic updates and undo/redo compatibility | _Leverage: apps/api/src/modules/*, packages/snippet-store, packages/compiler, apps/web/src/state/*_ | _Requirements: Requirement 2, Requirement 3 | Success: Modules load data via shared services, worker bridge returns deterministic compiler output, optimistic updates reconcile with server responses and persist to Dexie_

- [x] 4. Enable offline persistence, Dexie/OPFS migrations, and service worker caching
  - File: packages/snippet-store/src/dexie/*.ts, packages/snippet-store/src/opfs/*.ts, apps/web/src/services/storage/dexieSync.ts, apps/web/src/service-worker.ts, apps/web/src/offline/manifest.ts
  - Finalize Dexie schema registration, migration flows, and OPFS asset handling with integrity hashes and backup/export routines
  - Implement service worker caching strategy (stale-while-revalidate for documents/snippets, cache-first for shell) and background sync queues
  - Surface offline/online indicators in AppShell and provide export/import snapshot utilities
  - Purpose: Fulfill Requirement 3 (offline persistence) and Requirement 5 (reliable tooling)
  - _Leverage: packages/snippet-store existing adapters, docs/admin/governance.md requirements, tests/e2e fixtures_
  - _Requirements: Requirement 3, Requirement 5_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Offline Systems Engineer | Task: Harden Dexie/OPFS storage, implement deterministic migrations, and ship a service worker with cache + sync flows that keep ModuPrompt usable offline | Restrictions: Avoid blocking main thread, validate migrations before apply, respect storage quotas and security policies | _Leverage: packages/snippet-store/src/dexie/*, packages/snippet-store/src/opfs/*, apps/web/src/state/*_ | _Requirements: Requirement 3, Requirement 5 | Success: Offline reload restores workspace, migrations log audit events without data loss, service worker passes Lighthouse offline audit_

- [x] 5. Harden Fastify static delivery, CSP, and observability
  - File: apps/api/src/plugins/staticAssets.ts, apps/api/src/plugins/security.ts, apps/api/src/plugins/events.ts, apps/api/src/modules/audit/service.ts, deploy/docker/Dockerfile
  - Load Vite manifest to map hashed assets, adjust fallback to serve `index.html`, and set cache-control headers per asset type
  - Update CSP to allow hashed scripts/styles via nonce or manifest digests while keeping strict defaults; expose nonce to Vite templates
  - Add structured logging/metrics for static hits, CSP violations, export jobs, and webhook dispatchers
  - Purpose: Address Requirement 4 (security/observability) and Requirement 1 (production shell)
  - _Leverage: existing plugins, pino logging, OpenTelemetry scaffolding, docs/ops/env-vars.md_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node Platform Engineer | Task: Enhance static asset serving, CSP enforcement, and observability so Fastify securely hosts the SPA and exposes governance telemetry | Restrictions: Maintain zero inline scripts, keep headers configurable via env, ensure health/readiness endpoints unaffected | _Leverage: apps/api/src/plugins/staticAssets.ts, apps/api/src/plugins/security.ts, apps/api/src/modules/*_ | _Requirements: Requirement 1, Requirement 4 | Success: `/` serves SPA with CSP-compliant assets, security headers allow hashed bundles, structured logs capture asset + CSP metrics, docker runtime passes smoke tests_

- [x] 6. Expand tests, fixtures, and CI pipeline for deterministic delivery
  - File: apps/web/vitest.config.ts, apps/web/src/__tests__/*.test.tsx, tests/e2e/playwright.config.ts, tests/e2e/specs/**/*.spec.ts, .github/workflows/pipeline.yml, scripts/docker/verify-runtime-deps.mjs
  - Author unit tests for AppShell, services, offline flows; extend Playwright suites to cover end-to-end authoring, offline/online transitions, and export validation
  - Wire CI to build Vite assets, run Prisma migrations against ephemeral Postgres, execute smoke suite against Docker runtime, and publish SBOM artifacts
  - Purpose: Meet Requirement 5 (deterministic tooling) and guard Requirements 1–4 via automated coverage
  - _Leverage: existing Vitest/Playwright setup, docs/changelog/moduprompt-overview.md acceptance checklist_
  - _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 5_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Quality Engineering Lead | Task: Expand automated tests and CI pipeline to validate PWA shell, API, offline persistence, and exports end-to-end deterministically | Restrictions: Keep tests hermetic (mock network where appropriate), seed data via scripts, ensure CI runtime mirrors local workflow | _Leverage: tests/e2e/*, apps/web/vitest.config.ts, .github/workflows/pipeline.yml_ | _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 5 | Success: CI passes with new coverage, Docker smoke suite validates `/` load, offline/online flows tested, SBOM + security scans reported_

- [x] 7. Update documentation, samples, and operational runbooks
  - File: README.md, docs/product/quickstart.md, docs/admin/governance.md, docs/developer/compiler.md, docs/ops/env-vars.md, docs/changelog/moduprompt-stabilization.md
  - Document new dev commands, architecture diagrams, offline workflows, export pipelines, and observability guidance
  - Provide sample data bundles and scripted smoke instructions for operators
  - Purpose: Support Requirements 1–5 via discoverability and governance alignment
  - _Leverage: existing docs, steering product/tech/structure_, spec requirements
  - _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 5_
  - _Prompt: Implement the task for spec moduprompt-stabilization, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer & Enablement Lead | Task: Refresh documentation and runbooks to reflect the working PWA, offline workflows, and deployment steps introduced in this spec | Restrictions: Keep docs aligned with steering vision, include accessibility and governance considerations, ensure change log captures risks | _Leverage: README.md, docs/*, spec artifacts_ | _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 5 | Success: Docs map to new workflows, quickstart enables end-to-end setup, change log records stabilization milestones_
