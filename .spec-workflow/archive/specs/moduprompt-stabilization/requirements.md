# Requirements Document

## Introduction

Stabilize the ModuPrompt stack into a fully functional, self-hosted prompt studio that ships a production-grade React PWA, operational Fastify API, deterministic exports, and offline-ready storage so teams can author, govern, and ship prompts end-to-end. This effort closes the gaps between steering doctrine and the current half-built code by delivering the missing application shell, build system, observability, and resilience fundamentals.

## Alignment with Product Vision

This initiative activates the Product Steering pillars—Unified Prompt Authoring, Deterministic Delivery, Governed Snippets, Local-First Reliability, and Extensible Workflow—by turning the existing libraries into a cohesive application. It implements the Technical Steering mandates for React 18 + Vite PWA delivery, Fastify-based services, Dexie/OPFS persistence, and Docker-first deployment while honoring Structure Steering’s module boundaries and workspace conventions.

## Requirements

### Requirement 1 – Ship a Production React PWA Shell

**User Story:** As a Prompt Architect who self-hosts ModuPrompt, I want the web client to render a complete PWA (app shell, routing, layouts) so that I can author prompts without scaffolding the UI myself.

#### Acceptance Criteria

1. WHEN the user runs `pnpm --filter @moduprompt/web dev` THEN the system SHALL launch a Vite-powered dev server with hot module reloading aligned to steering stacks.
2. WHEN the Docker runtime serves `/` THEN the system SHALL deliver `index.html` + hashed bundles compiled from the workspace, with assets loading under CSP-compliant headers.
3. WHEN the user installs the PWA THEN the manifest, service worker, and offline fallback SHALL satisfy Lighthouse PWA criteria (installable, offline-ready, HTTPS safe).

### Requirement 2 – Integrate Authoring, Node Graph, and Compiler Modules Into the Shell

**User Story:** As a Prompt Architect, I want notebook, node graph, snippet libraries, and compiler preview to operate together so that editing in one surface stays synchronized across the experience.

#### Acceptance Criteria

1. WHEN a document is opened in the app shell THEN the system SHALL hydrate Zustand stores, render notebook + node graph modules, and keep projections in sync within <200 ms.
2. IF a snippet is inserted, updated, or reverted in the snippet library THEN the notebook and node graph views SHALL reflect the change without reload, preserving provenance metadata.
3. WHEN the compiler preview runs on a document with transclusions and variables THEN the preview SHALL render deterministic output while surfacing errors inline per steering governance rules.

### Requirement 3 – Operationalize Offline-First Persistence and Synchronization

**User Story:** As an Automation Engineer, I want the local Dexie/OPFS store and optional sync services working so that my workspace survives restarts and exports stay deterministic.

#### Acceptance Criteria

1. WHEN the client loads offline after an initial sync THEN the system SHALL restore documents, snippets, and status metadata from IndexedDB/OPFS without network calls.
2. IF IndexedDB schema or OPFS layout upgrades occur THEN migrations SHALL run deterministically and emit audit events without data loss.
3. WHEN optional backend sync is enabled THEN CRDT snapshots or explicit export/import SHALL succeed with integrity hashes verified before acceptance.

### Requirement 4 – Harden Fastify API, Security, and Observability

**User Story:** As a Compliance Reviewer, I need the API to expose secure, observable endpoints so that governance, audit logging, and export jobs meet policy expectations.

#### Acceptance Criteria

1. WHEN `/api/*` endpoints process requests THEN the system SHALL enforce zod-validated contracts, structured logs, and sanitized outputs with latency P95 ≤ 200 ms on reference hardware.
2. IF a static asset or API response is served THEN CSP, HSTS, CORP/COOP headers SHALL allow required assets (hashed scripts/styles) while blocking inline or third-party injections.
3. WHEN audits query snippet or export provenance THEN the API SHALL surface complete records (versions, audit events, webhook logs) with pagination and filtering per steering specs.

### Requirement 5 – Deliver Deterministic Build, Test, and Deployment Tooling

**User Story:** As a Platform Admin, I need repeatable scripts and CI checks so that deployments and upgrades remain reliable.

#### Acceptance Criteria

1. WHEN `pnpm build`, `pnpm test`, `pnpm test:e2e`, and `pnpm docker:verify` run locally or in CI THEN they SHALL complete without manual patching, producing deterministic artifacts.
2. IF the repo contains seed data or fixtures THEN scripts SHALL populate the Postgres database and local caches for smoke tests without leaking secrets.
3. WHEN Docker images build (`moduprompt/app`, `moduprompt/exporter`) THEN SBOM metadata, Prisma migrations, and runtime checks SHALL succeed under CI gates (<quality-gates/>).

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Maintain clear boundaries between app shell, feature modules, services, and utilities.
- **Modular Design**: Expose notebook, node graph, snippet, governance, and compiler modules behind stable interfaces for reuse across client and worker contexts.
- **Dependency Management**: Prefer workspace packages and typed APIs; avoid duplicating schema or environment logic.
- **Clear Interfaces**: Define typed contracts for UI events, storage adapters, and backend services using `@moduprompt/types`.

### Performance
- Initial bundle ≤ 250 KB gzipped, interaction latency under 150 ms for documents with 2 k cells / 500 nodes; exports ≤ 10 s for 50‑page outputs.

### Security
- Enforce strict CSP with nonce or hash-based allowances for bundled scripts, sanitize Markdown/HTML output, run secret scanning in CI, and keep dependency advisories clean.

### Reliability
- Provide health/readiness probes, queue retry policies, IndexedDB/OPFS integrity checks, and automated backups for Postgres/MinIO in docker-compose profiles.

### Usability
- Ensure keyboard navigation, ARIA roles, high-contrast themes, and accessible modals; document onboarding flows in product/admin guides.
