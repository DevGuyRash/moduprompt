# Tasks Document

- [ ] 1. Establish shared schema contracts in packages/types
  - File: packages/types/src/moduprompt.ts, packages/types/src/index.ts, packages/types/schema/*.json
  - Define TypeScript interfaces and JSON Schema generators for DocumentModel v2, Block, Edge, VariableDefinition, Snippet, SnippetVersion, ExportRecipe, WorkspaceStatus, AuditLogEntry
  - Configure build scripts to emit schema artifacts for client and server consumption
  - Purpose: Provide single source of truth for data contracts across app, API, and workers (FR-1, FR-3, FR-8, FR-10, FR-14)
  - _Leverage: packages/types/src/base.ts, packages/types/tsconfig.json_
  - _Requirements: FR-1, FR-3, FR-8, FR-10, FR-14, NFR-4_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Domain Architect | Task: Author shared TypeScript interfaces and JSON Schema outputs for ModuPrompt core entities, wiring them into workspace exports | Restrictions: Preserve backwards compatibility with existing base types, enforce strict type safety, avoid duplicating schemas across packages | _Leverage: packages/types/src/base.ts, existing schema build scripts | _Requirements: FR-1, FR-3, FR-8, FR-10, FR-14, NFR-4 | Success: Schemas compile without errors, JSON Schemas generated, consuming packages build against new contracts_

- [ ] 2. Implement IndexedDB/OPFS adapters and migrations in packages/snippet-store
  - File: packages/snippet-store/src/dexie/workspaceStore.ts, packages/snippet-store/src/opfs/*.ts, packages/snippet-store/migrations/*.ts
  - Define Dexie stores for documents, snippets, versions, workspace settings; implement schema version migration handlers
  - Integrate OPFS helpers for large asset persistence and backup/export routines
  - Purpose: Enable offline-first persistence layer that satisfies document/snippet governance (FR-2, FR-3, FR-11)
  - _Leverage: packages/snippet-store/src/dexie/baseStore.ts, apps/web/src/state/storageConfig.ts_
  - _Requirements: FR-2, FR-3, FR-11, NFR-1, NFR-3_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Offline Data Engineer | Task: Build Dexie and OPFS adapters with schema migrations supporting snippet versioning and document governance | Restrictions: Maintain deterministic migration order, do not block UI thread, ensure integrity hashes verified | _Leverage: packages/snippet-store/src/dexie/baseStore.ts, existing OPFS utilities | _Requirements: FR-2, FR-3, FR-11, NFR-1, NFR-3 | Success: Stores and migrations registered, offline persistence verified via unit tests, backup/export operations succeed_

- [ ] 3. Develop DocumentModelStore and shared state selectors in apps/web
  - File: apps/web/src/state/document-model.ts, apps/web/src/state/selectors/documentSelectors.ts, apps/web/src/state/useUndoRedo.ts
  - Implement Zustand/Jotai stores managing blocks, edges, variables, tags, status; add schemaVersion upgrades and topological ordering utilities
  - Wire undo/redo and multi-select operations; expose selectors for notebook and node graph modules
  - Purpose: Keep notebook and node views synchronized with deterministic updates (FR-1, FR-4, FR-8)
  - _Leverage: packages/types, packages/snippet-store adapters, apps/web/src/state/baseStore.ts_
  - _Requirements: FR-1, FR-4, FR-8, NFR-1, NFR-4_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend State Engineer | Task: Construct the document model store with parity selectors for notebook and node projections | Restrictions: Avoid prop drilling, ensure updates are transactional, preserve deterministic ordering | _Leverage: packages/types, existing Zustand utilities | _Requirements: FR-1, FR-4, FR-8, NFR-1, NFR-4 | Success: Store APIs consumed by notebook/node modules, schema migrations executed safely, unit tests confirm synchronization_

- [ ] 4. Build Notebook module UI and interactions
  - File: apps/web/src/modules/notebook/*.tsx, apps/web/src/modules/notebook/hooks/*.ts
  - Implement cell rendering, grouping, collapsing, drag-reorder handles, formatter toolbar, snippet drop zones, comment cell logic
  - Integrate command palette actions, Markdown importer, and keyboard navigation for accessibility
  - Purpose: Deliver linear editing surface with governance-aware controls (FR-1, FR-6, FR-7)
  - _Leverage: apps/web/src/modules/notebook/Cell.tsx (scaffold), packages/ui components, apps/web/src/state/document-model.ts_
  - _Requirements: FR-1, FR-6, FR-7, NFR-5_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React UI Engineer | Task: Implement notebook cells with grouping, formatting, and snippet insertion flows | Restrictions: Follow Tailwind design tokens, respect accessibility (ARIA, keyboard), avoid blocking main thread | _Leverage: packages/ui primitives, command palette utilities | _Requirements: FR-1, FR-6, FR-7, NFR-5 | Success: Notebook supports all required interactions, automated UI tests pass, accessibility checks succeed_

- [ ] 5. Build Node Graph module with React Flow integration
  - File: apps/web/src/modules/node-graph/NodeGraphCanvas.tsx, apps/web/src/modules/node-graph/state.ts, apps/web/src/modules/node-graph/nodes/*.tsx
  - Configure node/edge types, typed ports, cycle guards, auto-layout, minimap, subgraph support, hover preview overlays
  - Sync node mutations with DocumentModelStore and reflect snippet transclusion metadata
  - Purpose: Provide DAG editing parity with notebook view (FR-1, FR-5)
  - _Leverage: reactflow configuration, packages/types edge definitions, apps/web/src/state/document-model.ts_
  - _Requirements: FR-1, FR-5, NFR-1_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Graph Interface Engineer | Task: Construct the node graph canvas with typed connections and auto-layout tied to the shared model | Restrictions: Uphold cycle prevention, ensure performance for large graphs, reuse shared styling | _Leverage: reactflow config, document store selectors | _Requirements: FR-1, FR-5, NFR-1 | Success: Node graph mirrors document state, passes performance benchmarks, unit/UI tests validate connectors_

- [ ] 6. Implement Snippet Library panel with versioning timeline
  - File: apps/web/src/modules/snippets/*.tsx, apps/web/src/modules/snippets/hooks/useSnippetTimeline.ts, apps/web/src/modules/snippets/components/DiffViewer.tsx
  - Deliver tree view with folders/smart folders, search filters, drag-and-drop insertion, similarity dedupe badges
  - Build version timeline, diff viewer, revert/pin actions, safe copy modes, provenance display
  - Purpose: Empower snippet governance and reuse (FR-2, FR-3, FR-9)
  - _Leverage: packages/snippet-store services, packages/ui Tree component, apps/web/src/state/document-model.ts_
  - _Requirements: FR-2, FR-3, FR-9, NFR-2_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Knowledge Management UI Engineer | Task: Build snippet library UI with version history, diffing, and drag-drop insertion | Restrictions: Maintain deterministic ordering, sanitize diff rendering, ensure drop targets respect insertion rules | _Leverage: snippet-store services, markdown diff utilities | _Requirements: FR-2, FR-3, FR-9, NFR-2 | Success: Snippet operations function offline, version history immutable, UI tests cover key flows_

- [ ] 7. Implement Governance controls for tags, statuses, and policy admin
  - File: apps/web/src/modules/governance/*.tsx, apps/web/src/modules/governance/hooks/*.ts
  - Create status chips, tag editors, admin management dialogs, typeahead, accessibility semantics, and policy enforcement warnings
  - Integrate with export recipes to surface gating rules and audit log trail
  - Purpose: Enforce prompt-level governance workflows (FR-8, FR-10)
  - _Leverage: packages/types governance models, apps/web/src/state/document-model.ts, packages/ui form components_
  - _Requirements: FR-8, FR-10, NFR-5_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Governance UX Engineer | Task: Build tag/status management UI with admin configuration and policy surfacing | Restrictions: Enforce deduplication, respect role-based toggles, meet color contrast requirements | _Leverage: governance schemas, design tokens | _Requirements: FR-8, FR-10, NFR-5 | Success: Users can manage tags/statuses, policy gates display clearly, accessibility audits pass_

- [ ] 8. Extend packages/compiler with deterministic pipeline and worker adapters
  - File: packages/compiler/src/index.ts, packages/compiler/src/transforms/*.ts, packages/compiler/src/preflight/*.ts, packages/compiler/src/workers/clientAdapter.ts
  - Implement transclusion resolver (with rev pin handling), variable substitution, filter/formatter orchestration, smart backtick escalation, provenance tracking
  - Add preflight validators for status gating, unbound vars, cycles, fence balance; expose worker adapters for browser/server execution
  - Purpose: Guarantee deterministic compilation and governance-aware validation (FR-4, FR-5, FR-6, FR-7, FR-10)
  - _Leverage: packages/compiler existing scaffolds, packages/types schemas, packages/workers sandbox utilities_
  - _Requirements: FR-4, FR-5, FR-6, FR-7, FR-10, NFR-2, NFR-4_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Compiler Engineer | Task: Complete deterministic compiler stages with worker integration and comprehensive preflight checks | Restrictions: No nondeterministic APIs, enforce provenance logging, respect sandbox constraints | _Leverage: existing compiler scaffolds, worker bridge utilities | _Requirements: FR-4, FR-5, FR-6, FR-7, FR-10, NFR-2, NFR-4 | Success: Compiler outputs stable hashes, preflight catches required errors, unit tests cover pipeline stages_

- [ ] 9. Build Preview & Export module in apps/web
  - File: apps/web/src/modules/compiler-preview/PreviewPane.tsx, apps/web/src/modules/compiler-preview/hooks/usePreflight.ts, apps/web/src/modules/compiler-preview/components/ExportDrawer.tsx
  - Render Markdown/HTML preview with Shiki, Mermaid sandbox, preflight chip with errors/warnings, export recipe selection and triggers
  - Integrate with governance controls for status gating messaging and provenance footer toggles
  - Purpose: Provide deterministic preview/export UX with policy enforcement (FR-5, FR-6, FR-10)
  - _Leverage: packages/compiler worker adapter, packages/ui modal/panel components, apps/web/src/services/exportClient.ts_
  - _Requirements: FR-5, FR-6, FR-10, NFR-2, NFR-5_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Platform Engineer | Task: Implement preview pane with compiler integration, preflight surfacing, and export actions | Restrictions: Keep rendering sandboxed, maintain deterministic previews, ensure responsive layout | _Leverage: compiler hooks, UI primitives | _Requirements: FR-5, FR-6, FR-10, NFR-2, NFR-5 | Success: Preview updates deterministically, exports respect status gates, automated tests validate preflight output_

- [ ] 10. Implement GovernancePolicyEngine shared module
  - File: packages/snippet-store/src/governance/policyEngine.ts, packages/snippet-store/src/governance/statusSchema.ts, apps/api/src/modules/governance/policy.ts
  - Encode status transition rules, tag normalization, export gating checks, audit logging helpers for client and server usage
  - Expose policy evaluation APIs consumed by compiler preflight, UI guardrails, and backend services
  - Purpose: Centralize governance policy enforcement (FR-8, FR-10)
  - _Leverage: packages/types governance schemas, apps/api/src/modules/governance/service.ts, packages/compiler preflight hooks_
  - _Requirements: FR-8, FR-10, NFR-2_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Governance Platform Engineer | Task: Build shared policy engine enforcing status/tag rules and export gating | Restrictions: Ensure deterministic evaluation, no side effects, log audit entries consistently | _Leverage: governance schemas, compiler preflight | _Requirements: FR-8, FR-10, NFR-2 | Success: Policy engine reused by client/server, unit tests cover transitions, audit logs emitted correctly_

- [ ] 11. Deliver Fastify API modules for snippets, documents, exports, plugins, and webhooks
  - File: apps/api/src/modules/{snippets,documents,exports,plugins,webhooks}/*.ts, apps/api/src/modules/shared/routes.ts
  - Implement controllers, services, repositories, schemas for CRUD, versioning, compile trigger, export jobs, webhook registration per OpenAPI spec
  - Integrate Prisma models, queue dispatcher, MinIO storage adapters, webhook events
  - Purpose: Provide optional backend services aligned with REST contract (FR-2, FR-3, FR-8, FR-10, FR-14)
  - _Leverage: apps/api/src/plugins/fastify-zod.ts, prisma schema, packages/types schemas_
  - _Requirements: FR-2, FR-3, FR-8, FR-10, FR-14, NFR-3_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Engineer | Task: Implement Fastify modules for snippets/documents/exports with Prisma and webhook integration | Restrictions: Follow REST conventions, validate all payloads, emit audit events | _Leverage: zod schemas, Prisma repositories | _Requirements: FR-2, FR-3, FR-8, FR-10, FR-14, NFR-3 | Success: API passes integration tests, OpenAPI generated, webhooks fire on key events_

- [ ] 12. Implement Export worker service with Puppeteer/Paged.js
  - File: apps/api/src/workers/exportWorker.ts, apps/api/src/modules/exports/queue.ts, packages/compiler/src/server/export.ts
  - Build job processor converting compile requests to PDF/HTML/Markdown/Text artifacts, applying themes, storing to MinIO, updating job status
  - Enforce sandbox restrictions, timeout, retries, provenance footer injection, artifact hashing
  - Purpose: Provide deterministic artifact generation at scale (FR-5, FR-10, NFR-3)
  - _Leverage: Puppeteer launcher utilities, packages/compiler server adapters, apps/api/src/config/queue.ts_
  - _Requirements: FR-5, FR-10, NFR-2, NFR-3_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Export Services Engineer | Task: Build export worker pipeline producing deterministic artifacts with retries and storage integration | Restrictions: Run headless in hardened container, sanitize HTML output, respect job timeouts | _Leverage: compiler server adapter, queue utilities | _Requirements: FR-5, FR-10, NFR-2, NFR-3 | Success: Export jobs succeed under load, retries logged, artifacts retrievable with provenance metadata_

- [ ] 13. Implement audit logging and webhook dispatcher
  - File: apps/api/src/modules/audit/*.ts, apps/api/src/modules/webhooks/dispatcher.ts, packages/snippet-store/src/audit/clientLogger.ts
  - Persist audit entries for snippet versions, status changes, exports, plugin lifecycle; configure webhook dispatcher with retries/backoff
  - Surface audit log viewer and export in admin UI, ensure offline capture on client for later sync
  - Purpose: Ensure traceability requirements and integrations (FR-3, FR-8, FR-10, FR-14)
  - _Leverage: Prisma audit schema, governance policy engine, queue utilities_
  - _Requirements: FR-3, FR-8, FR-10, FR-14, NFR-3_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Observability Engineer | Task: Build audit logging pipeline with webhook dispatch and admin visibility | Restrictions: Avoid PII leakage, guarantee log ordering, support offline buffering | _Leverage: Prisma audit schema, webhook dispatcher | _Requirements: FR-3, FR-8, FR-10, FR-14, NFR-3 | Success: Audit entries captured across flows, webhooks delivered with retries, admin UI displays logs_

- [ ] 14. Implement security controls: CSP, sanitizer, worker sandbox
  - File: apps/web/src/security/csp.ts, apps/web/src/security/sanitizer.ts, packages/workers/src/sandbox/*.ts, apps/api/src/plugins/security.ts
  - Configure strict CSP headers, Markdown sanitizer allowlist, filter sandbox constraints, secrets masking utilities
  - Add automated fuzz tests and CI checks for sanitizer and CSP regression
  - Purpose: Meet security requirements for untrusted content (FR-7, FR-10, NFR-2)
  - _Leverage: DOMPurify config, Helmet integration, worker messaging guards_
  - _Requirements: FR-7, FR-10, NFR-2_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security Engineer | Task: Harden CSP, sanitization, and worker sandbox according to security spec | Restrictions: Deny inline scripts, block network access in workers, ensure sanitizer preserves allowed Markdown | _Leverage: DOMPurify configs, Helmet setup | _Requirements: FR-7, FR-10, NFR-2 | Success: Security headers applied, sanitizer tests pass, workers restricted with enforced limits_

- [ ] 15. Author automated testing suites (unit, integration, performance)
  - File: packages/compiler/src/__tests__/*.spec.ts, apps/web/src/modules/**/__tests__/*.test.tsx, apps/api/tests/integration/*.test.ts, tests/perf/compiler.bench.ts
  - Cover unit tests for compiler, document store, snippet versioning, governance policies; integration tests for API endpoints; performance benchmarks for large document loads
  - Configure Vitest/Jest/Playwright runners, CI workflows, coverage thresholds
  - Purpose: Validate deterministic behavior, performance, and governance enforcement (FR-3, FR-5, FR-8, FR-10, NFR-1, NFR-4)
  - _Leverage: existing Vitest config, Playwright setup, tests/helpers utilities_
  - _Requirements: FR-3, FR-5, FR-8, FR-10, NFR-1, NFR-4_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Automation Architect | Task: Build unit, integration, and performance test suites ensuring deterministic behavior and governance controls | Restrictions: Avoid flaky tests, use fixtures responsibly, enforce coverage gates | _Leverage: Vitest configs, Playwright utilities | _Requirements: FR-3, FR-5, FR-8, FR-10, NFR-1, NFR-4 | Success: Tests pass locally and in CI, coverage thresholds met, performance benchmarks recorded_

- [ ] 16. Implement Playwright E2E scenarios and accessibility audits
  - File: tests/e2e/moduprompt/*.spec.ts, tests/e2e/fixtures/*.ts, tests/a11y/axe.test.ts
  - Script user journeys: governed prompt creation, snippet version restore, offline editing, policy-gated export; integrate axe-core accessibility checks
  - Configure offline simulation, service worker mocking, provenance verification in exports
  - Purpose: Ensure holistic user experience and accessibility compliance (FR-1..FR-10, NFR-5)
  - _Leverage: Playwright config, service worker mocks, axe-core helpers_
  - _Requirements: FR-1, FR-2, FR-3, FR-5, FR-6, FR-8, FR-10, NFR-5_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer | Task: Develop Playwright E2E flows with accessibility validations for core ModuPrompt journeys | Restrictions: Keep tests deterministic, reuse fixtures, simulate offline without flakiness | _Leverage: Playwright fixtures, axe helpers | _Requirements: FR-1, FR-2, FR-3, FR-5, FR-6, FR-8, FR-10, NFR-5 | Success: E2E suite runs reliably in CI, accessibility assertions pass, export provenance verified_

- [ ] 17. Finalize Docker, CI/CD, and environment configuration
  - File: deploy/docker/Dockerfile, deploy/docker/docker-compose.yml, .github/workflows/pipeline.yml, docs/ops/env-vars.md
  - Harden Docker image (distroless runtime, read-only FS, health checks), update compose stack with MinIO/export worker, wire CI pipeline for lint/test/build/export, document env vars
  - Purpose: Deliver deployable, secure runtime and automated pipeline (FR-15, FR-10, NFR-3)
  - _Leverage: existing Docker scaffolds, GitHub Actions workflows, docs/templates_
  - _Requirements: FR-10, FR-15, NFR-3_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Harden Docker-first deployment and CI pipeline with documentation per spec | Restrictions: Maintain non-root containers, enforce vulnerability scans, keep compose offline-friendly | _Leverage: Docker scaffolds, GH Actions templates | _Requirements: FR-10, FR-15, NFR-3 | Success: Containers build/run locally, CI pipeline green, env docs updated_

- [ ] 18. Produce product, admin, and developer documentation
  - File: docs/product/quickstart.md, docs/admin/governance.md, docs/developer/compiler.md, docs/changelog/moduprompt-overview.md
  - Document notebook/node workflows, snippet governance, export policies, API overview, plugin authoring intro, acceptance checklist, and decision log updates
  - Purpose: Ensure onboarding, governance, and implementation guidance (FR-6, FR-8, FR-10, FR-17)
  - _Leverage: existing docs structure, steering documents, requirements spec_
  - _Requirements: FR-6, FR-8, FR-10, FR-17, R-12_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: Author comprehensive documentation covering user, admin, and developer guides with traceability to the spec | Restrictions: Keep docs deterministic and aligned with steering, include decision log updates, ensure readability at 80/96/120ch widths | _Leverage: steering docs, spec artifacts | _Requirements: FR-6, FR-8, FR-10, FR-17, R-12 | Success: Docs published with traceability references, reviewed for accuracy, acceptance checklist satisfied_

- [ ] 19. Perform final integration, QA sign-off, and spec handoff
  - File: .spec-workflow/specs/moduprompt-overview/tasks.md (update statuses), docs/changelog/moduprompt-overview.md (final entry)
  - Conduct integration review, resolve defects, mark tasks complete, compile risk log, prepare implementation readiness package per workflow
  - Purpose: Close out spec phase and transition to implementation tracking (All requirements)
  - _Leverage: test reports, audit logs, tasks checklist_
  - _Requirements: All, R-1..R-12, NFR-1..NFR-8_
  - _Prompt: Implement the task for spec moduprompt-overview, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release Coordinator | Task: Complete final integration review, update task statuses, and document readiness for implementation handoff | Restrictions: Do not skip unresolved defects, ensure approvals recorded, align with spec workflow handoff requirements | _Leverage: tasks.md, test reports, audit logs | _Requirements: All, R-1..R-12, NFR-1..NFR-8 | Success: All tasks marked complete with evidence, handoff package prepared, spec marked ready for implementation_
