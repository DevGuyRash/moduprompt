# Structure Steering – ModuPrompt

## Document Control
| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Last Updated | 2025-09-18 |
| Owner | ModuPrompt Engineering Enablement |
| Review Cadence | Quarterly |

## Repository Layout
| Directory | Purpose | Owner | Notes |
| --- | --- | --- | --- |
| `/apps/web` | React PWA client | Frontend Guild | Contains notebook/node editors, shared document model UI |
| `/apps/api` | Fastify/NestJS API service | Backend Guild | Optional service for multi-user, exports, governance |
| `/packages/compiler` | Deterministic compiler & filters | Platform Team | Shared between client and server |
| `/packages/snippet-store` | Snippet versioning, dedupe, metadata | Platform Team | Dexie adapters + server connectors |
| `/packages/ui` | Reusable UI components, theming tokens | Design Systems | Tailwind + headless components |
| `/packages/workers` | Sandboxed worker scripts | Platform Team | Filter execution, Markdown transformation |
| `/packages/types` | Shared TypeScript types & schema definitions | Architecture Guild | Source of truth for model schemas |
| `/packages/devtools` | Storybook, fixtures, CLI tooling | DX Team | Mocks, factories, testing utilities |
| `/deploy/docker` | Dockerfiles, compose, entrypoints | DevOps | Docker-first assets |
| `/deploy/helm` | Helm charts & K8s manifests | DevOps | Optional multi-user deployment |
| `/docs` | Product, admin, ops documentation | PMO | Includes ADRs, runbooks |
| `/scripts` | Automation scripts (seeding, migrations) | DX Team | pnpm-run scripts |

## Code Organization Principles
- Feature-first structure: co-locate slices (state, components, tests) within modules such as `apps/web/src/modules/notebook`.
- Enforce clear boundaries between domain logic (`packages/compiler`, `packages/snippet-store`) and presentation (`packages/ui`).
- Shared types published via pnpm workspace; avoid duplicate schema definitions.
- Keep worker code self-contained and communication typed (Comlink-style message types).
- ADRs must justify deviations from standard architecture; link from affected modules.

## Frontend Structure
- `apps/web/src/app.tsx`: application shell, routing, providers (state, query, theming).
- Modules:
  - `modules/notebook`: cell components, markdown editor wrappers, drag handles, grouping logic.
  - `modules/node-graph`: React Flow configuration, node definitions, port validation.
  - `modules/snippets`: tree view, filters, version timeline, diff viewer.
  - `modules/compiler-preview`: preview pane, preflight diagnostics, export controls.
  - `modules/governance`: tags/status chips, policy dialogs, admin settings.
  - `modules/settings`: workspace configuration, AI adapters, data export/import.
- Hooks & state management under `apps/web/src/state` using Zustand/Jotai stores with selectors per module.
- Service layer `apps/web/src/services` calling shared `packages/types` schemas and optional API clients.
- Utility libs in `apps/web/src/utils` limited to presentation helpers; heavy logic stays in shared packages.

## Backend Structure
- `apps/api/src/main.ts`: Fastify bootstrap, plugin registration, OpenAPI export.
- Modules organized under `apps/api/src/modules/*` mirroring domain areas (snippets, documents, exports, governance, plugins, webhooks).
- Each module contains `controller.ts`, `service.ts`, `repository.ts`, `schemas.ts` (zod/prisma), and `routes.ts` hooking into Fastify.
- Prisma schema in `apps/api/prisma/schema.prisma`; migrations stored under `apps/api/prisma/migrations`.
- Background jobs executed via `apps/api/src/jobs/*`, leveraging BullMQ or lightweight queue.
- Event emitters in `apps/api/src/events` publishing to webhook dispatcher.

## Shared Libraries & Packages
- `packages/compiler`: Pure TypeScript, no DOM dependencies, exports compile APIs for browser & Node. Tests include golden fixtures.
- `packages/snippet-store`: Domain services for version chains, diffing, dedupe; adapters for Dexie/Prisma.
- `packages/ui`: Headless component primitives with Tailwind class compositions, theming tokens, accessibility utilities.
- `packages/workers`: Contains worker entrypoints compiled separately; includes sandbox guards and manifest validators.
- `packages/types`: JSON Schema + TypeScript types generated via `ts-json-schema-generator`; ensures parity across services.
- `packages/devtools`: Storybook stories, Playwright fixtures, CLI for exporting/importing workspace bundles.

## Testing Layout
- Unit tests co-located within packages using `*.spec.ts` naming.
- Integration tests under `apps/api/tests` and `apps/web/tests` using Vitest + supertest / Playwright component testing.
- E2E tests in `tests/e2e` with Playwright scenarios covering notebook, node graph, snippet versioning, exports, governance flows.
- Performance benchmarks under `tests/perf` measuring compiler throughput and large document interactions.
- Accessibility tests run via axe-core in Playwright flows.

## Documentation & ADRs
- `docs/product`: Product steering, roadmap, onboarding.
- `docs/architecture`: Diagrams, decision records (ADRs archived by date), threat models.
- `docs/ops`: Runbooks, environment setup, incident response.
- ADR template stored at `docs/architecture/adr-template.md`; new ADRs numbered sequentially.

## Build & Deployment Artifacts
- `deploy/docker/Dockerfile` multi-stage build producing distroless runtime.
- `deploy/docker/docker-compose.yml` for single-user stack (app + minio + optional exporter).
- `deploy/helm/Chart.yaml` with templates for app, exporter, y-websocket, minio, ingress, secrets.
- Build outputs stored under `dist/` per package; PNPM workspace with `pnpm build` orchestrating.
- CI artifacts (coverage reports, export fixtures) archived under GitHub Actions workflow outputs.

## Contribution Workflow
- Branch naming: `feat/*`, `fix/*`, `docs/*`, `chore/*`; enforce via Husky hook.
- Required checks: lint, typecheck, unit, e2e, Docker build, vulnerability scan.
- PR template includes spec references, testing evidence, risk assessment.
- Definition of Done: tasks completed in spec, tests updated/passing, docs updated, approvals recorded in decision log when scope shifts.

## Decision Log
| Date | Decision | Rationale | Status |
| --- | --- | --- | --- |
| 2025-09-18 | Initialized structure steering doc | Documented baseline repo layout and conventions for ModuPrompt | Accepted |
