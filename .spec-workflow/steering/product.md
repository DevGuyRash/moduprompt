# Product Steering – ModuPrompt

## Document Control
| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Last Updated | 2025-09-18 |
| Owner | ModuPrompt Steering Council |
| Review Cadence | Quarterly |

## Executive Summary
### Mission
- Deliver a self-hosted, Docker-first prompt authoring studio that unifies notebook and node-based editing with deterministic exports.
- Empower prompt engineers, ops teams, and content strategists to collaborate on complex prompt pipelines with full provenance and governance.

### Vision
- Become the canonical open-source stack for enterprise prompt lifecycle management, enabling local-first workflows with optional multi-user sync.
- Provide an extensible platform where plugins, AI adapters, and export recipes can be curated to fit regulated environments without vendor lock-in.

### Value Proposition
- Single source of truth for prompts with bidirectional editors, versioned snippet library, and compile-time validation.
- Offline-first PWA delivering consistent UX across devices, reinforcing data sovereignty and privacy compliance.
- Deterministic exports and provenance logs increasing trust in prompt audits and downstream automations.

## Target Users & Personas
| Persona | Description | Primary Goals | Pain Points |
| --- | --- | --- | --- |
| Prompt Architect | Designs cross-channel prompts & flows | Structured authoring, provenance, deterministic outputs | Fragmented tooling, manual version control |
| Automation Engineer | Integrates prompts into workflows & APIs | Reliable exports, CI/CD automation, policy gating | Unverifiable prompt changes, export drift |
| Knowledge Manager | Curates snippet libraries & governance | Metadata tagging, access control, audit trails | Unstructured assets, lack of status tracking |
| Compliance Reviewer | Ensures safe prompt deployment | Traceability, status gating, immutable history | Missing audit logs, inconsistent versions |

## Problem Statement & Opportunities
- Current state issues:
  - Teams assemble prompts across disparate editors, leading to inconsistent formatting and regression risk.
  - Version history is typically manual, lacking audit-ready records and provenance in exports.
  - Export artifacts (Markdown/PDF) drift due to non-deterministic rendering pipelines.
  - Governance of prompt readiness (status, approvals) is ad-hoc, slowing release velocity.
- Opportunities:
  - Provide unified document model with synchronized notebook/DAG projections for intuitive editing.
  - Embed snippet versioning and provenance into compiler to guarantee auditability.
  - Implement local-first storage with optional sync to support offline operations and data residency.
  - Offer customizable status/tags enabling policy-driven exports and lifecycle automation.

## Product Pillars
| Pillar | Description | KPIs |
| --- | --- | --- |
| Unified Prompt Authoring | Seamless switch between linear notebook and node-based DAG views | Task completion time, adoption rate |
| Deterministic Delivery | Compiler guarantees reproducible exports with provenance metadata | Export parity defects, audit pass rate |
| Governed Snippets | Library with version history, metadata, smart folders | Snippet reuse %, version recovery incidents |
| Local-First Reliability | Works offline with IndexedDB/OPFS, Docker-first deployment | Offline success rate, self-hosted installs |
| Extensible Workflow | Plugins, AI adapters, webhooks for downstream integration | Marketplace contributions, webhook usage |

## Functional Scope
### In Scope
- Prompt authoring via notebook and node graph views backed by shared document model.
- Snippet library with YAML frontmatter, drag-and-drop insertion, smart folders, deduplication.
- Git-like snippet versioning with linear history, diffing, revert, and provenance pins.
- Deterministic compile/export pipeline supporting Markdown, HTML, PDF, DOCX, and chat-ready text.
- Prompt-level tags and customizable statuses with color-coded policies.
- Local-first storage (IndexedDB/OPFS), offline-capable PWA, Docker distribution.
- Optional backend services for multi-user sync, exports, storage, and webhooks.
- AI assist adapters (Ollama/OpenAI-compatible) disabled by default.

### Out of Scope
- Branching snippet histories beyond linear append-only logs in MVP.
- Real-time multi-user editing (planned for future CRDT phase).
- Complex enterprise RBAC/SSO (future roadmap).
- Analytics/telemetry collection (explicitly avoided by default).

## Non-Functional Principles
- Determinism-first: identical inputs produce identical compiled outputs.
- Security-first: strict CSP, sandboxed filters, sanitized Markdown rendering.
- Local-first: offline persistence is the default; server components optional.
- Extensibility: plugin architecture encourages community contributions without lock-in.
- Accessibility: keyboard-first interactions, ARIA-compliant components, high-contrast themes.
- Observability optional: enable metrics/tracing without compromising zero-telemetry baseline.

## Product Roadmap
| Release | Timeframe | Themes | Key Capabilities |
| --- | --- | --- | --- |
| MVP | Q2 2025 | Unified authoring, snippet governance, deterministic exports | Notebook/Node parity, snippet versioning, status gating, Docker image |
| Phase 2 | Q3-Q4 2025 | Collaboration, marketplace, advanced automation | CRDT sync, review mode, plugin catalog, n8n templates |
| Phase 3 | 2026 | Enterprise readiness, integrations | Git filesystem sync, SSO/OIDC, multi-tenant workspaces, analytics opt-in |

## Success Metrics & KPIs
- Adoption: 200+ self-hosted deployments within 12 months.
- Engagement: 70% of active documents use both notebook and node view weekly.
- Quality: <2% export diff incidents per release; zero critical sanitizer escapes.
- Reliability: 99% offline session recovery; zero data loss in version logs.

## Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Deterministic compiler regressions | High | Medium | Comprehensive unit/integration tests, golden export fixtures |
| Plugin sandbox escape | Critical | Low | Strict CSP, worker isolation, capability manifests |
| Offline data corruption | High | Medium | IndexedDB schema migrations with backups, integrity hashes |
| Governance adoption resistance | Medium | Medium | Intuitive status/tag UI, default recipes enforcing policy |

## Dependencies & Assumptions
- Dependencies:
  - Modern browser support for IndexedDB, OPFS, Web Workers, PWA features.
  - Optional backend components (Fastify/NestJS, y-websocket, MinIO) for multi-user features.
  - Docker runtime available for deployments.
- Assumptions:
  - Users can self-manage infrastructure and secrets.
  - Organizations desire local control with optional cloud syncing.
  - Community contributions will extend plugin/filter ecosystem.

## Decision Log
| Date | Decision | Rationale | Status |
| --- | --- | --- | --- |
| 2025-09-18 | Initialized product steering doc | Established baseline strategy for ModuPrompt | Accepted |
