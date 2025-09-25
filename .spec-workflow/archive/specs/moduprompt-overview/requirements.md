# Requirements – moduprompt-overview

## Document Control
| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Last Updated | 2025-09-18 |
| Owner | ModuPrompt Product & Architecture Council |
| Review Cadence | Sprintly |

## Summary
- Overview: Define end-to-end scope for ModuPrompt, the Docker-first prompt composition platform supporting notebook and node editors, governed snippet library, deterministic exports, and governance tooling.
- Primary Outcome: Establish baseline requirements that coordinate all feature specs and ensure alignment with approved steering documents.
- Alignment to Steering: Anchored to Product (§Mission, Pillars), Technical (§Architecture Overview, Stack), and Structure (§Repo Layout, Contribution Workflow) steering artifacts.

## Stakeholders & Personas
| Persona | Needs | Success Metrics |
| --- | --- | --- |
| Prompt Architect | Compose complex prompts with reusable snippets, track provenance, ensure deterministic exports | Time-to-create prompt < 30 min, provenance coverage 100% |
| Automation Engineer | Integrate prompts into pipelines with compile-time validation and export automation | Successful CI export rate 99%, API latency < 200ms |
| Knowledge Manager | Curate snippet library, enforce metadata, manage statuses/tags | Snippet reuse ≥ 60%, governance SLA met |
| Compliance Reviewer | Audit prompt readiness with statuses, logs, immutable histories | Zero policy breaches, approval turnaround < 24h |
| Platform Admin | Operate Docker-first stack, ensure security and offline-first resilience | Deployment < 30 min, zero high severity vulns |

## Problem Statement
- Current Pain Points: Fragmented authoring across editors, manual snippet/version tracking, non-deterministic export pipelines, weak governance, limited offline support.
- Opportunities: Unify authoring around shared document model, embed snippet versioning & provenance, enforce statuses/tags, deliver offline-first Docker distribution, expose extensible integrations.

## Goals & Non-Goals
### Goals
- Deliver synchronized notebook and node editors backed by single document model.
- Provide snippet management with version history, metadata, deduplication, and smart folders.
- Ensure deterministic compile/export pipeline with provenance logging and policy gates.
- Support prompt-level tags and customizable statuses with governance hooks.
- Maintain local-first PWA experience with optional backend services for collaboration/export.
- Package platform as hardened Docker-first deployment with optional Kubernetes.

### Non-Goals
- Branching snippet histories beyond linear version chain (deferred).
- Real-time multi-user CRDT collaboration in MVP (roadmap Phase 2).
- Enterprise SSO/OIDC, multi-tenant org features (roadmap Phase 3).
- Analytics/telemetry by default; remains opt-in.

## Functional Requirements
| ID | Description | Acceptance Criteria | Priority | Traceability |
| --- | --- | --- | --- | --- |
| FR-1 | Dual-view prompt authoring | Notebook and node editors operate on same document model with parity operations; edits reflect cross-view within 200ms | Must | §B.4, §B.5, §R.1 |
| FR-2 | Snippet library with metadata | Snippets store YAML frontmatter, support folders/smart folders, drag-drop insertion, insertion defaults to body-only | Must | §B.1, §R.6 |
| FR-3 | Snippet versioning | Each snippet maintains append-only history with author, timestamp, note, diff/revert, provenance pins | Must | §B.1 (Versioning), §D (SnippetVersion), §R.7 |
| FR-4 | Transclusion & variables | Template syntax `{{> path}}` with optional rev pin and variables `{{var}}` with validation | Must | §B.1, §E, §D.refs |
| FR-5 | Deterministic compiler | Compile pipeline resolves transclusions, variables, filters, formatters, emits deterministic Markdown/HTML/PDF/text | Must | §E, §R.2 |
| FR-6 | Preview & preflight | Right-side preview renders Markdown/GFM, Mermaid, syntax highlighting; preflight blocks on critical issues | Must | §B.2, §E, §R.3 |
| FR-7 | Formatters & filters | Support runtime formatters (code, callout, blockquote, xml) and filter plugins executed in sandboxed workers | Must | §B.2, §F |
| FR-8 | Prompt governance | Prompts have tags and customizable statuses with color chips; exports enforce status gates | Must | §B.6 (Tags/Statuses), §D.DocumentModel, §H.status endpoints, §R.8 |
| FR-9 | Advanced search | Search across snippet content/frontmatter, statuses, tags; smart folders store queries | Should | §B.6, §U |
| FR-10 | Export customization | Support branded themes, recipes controlling include/exclude, gating by status, export job tracking | Must | §B.2, §D.ExportRecipe, §E, §H.exports |
| FR-11 | Offline-first operations | PWA caches assets, persists data to IndexedDB/OPFS, supports offline usage post-initial load | Must | §A.3, §J, §R.10 |
| FR-12 | Optional AI assist adapters | Provide opt-in adapters for Ollama/OpenAI-compatible providers with guardrails | Could | §B.6, §V |
| FR-13 | Collaboration roadmap | Support document snapshots in MVP; integrate with CRDT (Yjs) for future phases | Should | §K |
| FR-14 | API surface | REST API for snippets, versions, documents, statuses, compile, exports, plugins, webhooks | Must | §H |
| FR-15 | Docker-first distribution | Provide Dockerfile, compose stack, environment configuration table, read-only runtime guidance | Must | §L, §S, §R.9 |
| FR-16 | Observability controls | Structured logging, optional OpenTelemetry metrics/traces, admin UI for audit log | Should | §M |
| FR-17 | Testing & QA harness | Unit, integration, E2E coverage, accessibility, performance, security tests | Must | §N |
| FR-18 | Import/export interop | Import Markdown/Jupyter/Notion exports, provide DOCX/text outputs and provenance map | Should | §T, §Q.5 |

## Non-Functional Requirements
| ID | Category | Requirement | Acceptance Criteria | Priority |
| --- | --- | --- | --- | --- |
| NFR-1 | Performance | Support 2k notebook cells / 500 nodes with interaction latency ≤ 150ms | Performance tests pass under stated load | Must |
| NFR-2 | Security | Enforce CSP `default-src 'self'`; sanitize Markdown; sandbox filters; mask secrets | Pen tests reveal no critical escapes | Must |
| NFR-3 | Reliability | Optional backend availability 99.5%; export success ≥ 99% with retries | Monitoring dashboards show compliance | Should |
| NFR-4 | Determinism | Compiler outputs bit-identical Markdown/HTML given same inputs | Golden file tests succeed | Must |
| NFR-5 | Accessibility | Keyboard-first navigation, ARIA labeling, color contrast AA | axe-core suite passes | Must |
| NFR-6 | Privacy | Zero telemetry by default; AI adapters opt-in; secrets never logged | Config audited | Must |
| NFR-7 | Deployability | Docker image builds reproducibly; compose stack launch < 15 min | CI pipeline verification | Must |
| NFR-8 | Scalability | Backend horizontally scalable via containers; exporter scales on queue depth | Load test demonstrates linear scaling up to target | Should |

## User Journeys & Scenarios
| Journey | Trigger | Steps | Success Criteria |
| --- | --- | --- | --- |
| Create governed prompt | Architect creates new prompt with snippet reuse | (1) Start new document → (2) insert snippets via drag/drop → (3) configure variables → (4) assign status/tags → (5) run preflight & export | Export passes; provenance recorded; status gating respected |
| Restore snippet version | Knowledge manager reviews history | (1) Open snippet timeline → (2) compare revisions → (3) revert to selected rev → (4) provenance updates | New head rev created; references pinned if specified |
| Offline editing session | User loses connectivity mid-session | (1) Load app once → (2) continue editing offline → (3) data persists → (4) resync on reconnect | All edits persisted locally; conflict resolution ready for sync |
| Policy-gated export | Compliance reviewer exports only approved prompts | (1) Configure recipe gating statuses → (2) attempt export from Draft doc → (3) preflight blocks export → (4) set status to Approved → (5) export succeeds | Gate enforces status; audit log captures change |
| External integration | Automation engineer triggers export via API | (1) Call `/api/compile` → (2) poll `/api/exports/{job}` → (3) retrieve artifact URL → (4) record provenance | API returns 200 responses; artifact accessible |

## Data & Integrity Requirements
- Data Entities: DocumentModel, Block, Edge, VariableDefinition, Snippet, SnippetVersion, ExportRecipe, WorkspaceStatus, WorkspaceSettings, AuditLogEntry.
- Persistence Expectations: Client IndexedDB stores DocumentModel & Snippet head; OPFS stores large assets; optional backend persists canonical copies with Prisma-managed relational schema; version history append-only.
- Provenance & Audit: Compiler records `snippetId@rev` per transclusion; audit log captures status changes, exports, plugin lifecycle events; export artifacts include provenance footer when enabled.

## Compliance & Security
- Threat Considerations: XSS via Markdown/snippets, malicious filters/plugins, path traversal in exports, unauthorized status changes, leaked secrets in logs.
- Mitigations: DOMPurify allowlist + sanitized Mermaid sandbox; worker sandbox denies network/FS; normalized asset paths with hashing; RBAC for status changes (admin vs contributor); secrets flagged and masked.

## Dependencies & Constraints
- Internal: Shared TypeScript types ensure parity between client/server; compiler package reused across app; pnpm workspace orchestrates builds.
- External: React 18 ecosystem, Dexie, React Flow, Fastify/NestJS, Prisma, Yjs, Puppeteer, MinIO, Docker runtime, pnpm.
- Constraints: Must function fully offline once loaded; no telemetry; deterministic compiler cannot introduce randomness; plugin sandbox forbids network.

## Risks & Assumptions
| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Worker sandbox performance overhead | High | Medium | Benchmark filters, allow WASM but limited, offload heavy ops to server when available |
| IndexedDB schema migrations failing | High | Medium | Implement migration versioning with fallback backups, QA migration paths |
| Export determinism impacted by fonts/assets | Medium | Medium | Bundle fonts locally, control CSS, include deterministic timestamp handling |
| Governance adoption friction | Medium | Medium | Provide defaults, UX guidance, admin automation |
| Optional AI adapters leaking data | High | Low | Opt-in with explicit warnings, redact secrets, rate limit |

## Acceptance Checklist
- [x] Requirements align with steering documents
- [x] Acceptance criteria cover functional + non-functional scope
- [x] Traceability matrix updated

## Decision Log
| Date | Decision | Rationale | Status |
| --- | --- | --- | --- |
| 2025-09-18 | Initiated requirements draft | Captured baseline scope for ModuPrompt master spec | Proposed |
