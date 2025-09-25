# Requirements Document

## Introduction
ModuPrompt's Docker Compose stack currently exposes only the Fastify API, returning a JSON 404 at `/`. This spec introduces end-to-end delivery of the web PWA when deploying via Compose so evaluators and operators receive the intended offline-first UX without extra manual wiring.

## Alignment with Product Vision
- **Product Steering**: Supports the vision for a self-hosted, Docker-first prompt studio by ensuring the Docker profile exposes the UI out of the box.
- **Technical Steering**: Respects the Fastify-based API runtime and leverages approved stack components (`@fastify/static`) instead of introducing a new web server.
- **Structure Steering**: Keeps runtime changes confined to `apps/api` and Docker artefacts under `deploy/docker`, aligning with the repo organization guidance.

## Requirements

### Requirement 1

**User Story:** As a prompt architect evaluating ModuPrompt via Docker, I want `http://localhost:8080` to serve the compiled PWA shell so that I can use notebook and node views without extra setup.

#### Acceptance Criteria

1. WHEN the Compose stack is started with the `core` profile THEN the `/` route SHALL return the built `index.html` and load static assets without 404s.
2. IF a user refreshes or deep-links to an internal PWA route (e.g., `/workspace`) THEN the server SHALL return the SPA bundle instead of a JSON 404.
3. WHEN static assets are requested (JS, CSS, fonts, media) THEN the server SHALL stream the corresponding files from the built `apps/web/dist` directory with correct content types.

### Requirement 2

**User Story:** As an operations engineer maintaining the Docker deployment, I want API endpoints and health probes to behave unchanged so that monitoring and automation remain stable.

#### Acceptance Criteria

1. WHEN `/healthz` or `/readyz` is queried THEN responses SHALL match current behaviour (HTTP 200 JSON) with no additional middleware interference.
2. IF an unknown API route under `/api/*` is requested THEN the server SHALL continue returning structured JSON 404 responses.

### Requirement 3

**User Story:** As a compliance reviewer, I want deterministic builds and verifiable asset serving so that exported runtime images remain auditable per docker-build-hardening.

#### Acceptance Criteria

1. WHEN the runtime image is rebuilt THEN the `apps/web/dist` bundle included in the image SHALL match the version produced by `pnpm build` and pass existing docker verification scripts.
2. WHEN tests execute via a new docker smoke test (to be defined in Tasks) THEN the script SHALL fail if `/` returns a non-200 status or missing core assets.

## Non-Functional Requirements

### Code Architecture and Modularity
- Runtime changes SHALL reuse approved Fastify plugin patterns and keep static serving isolated behind a dedicated module to preserve single-responsibility boundaries.
- Docker artefact updates SHALL avoid broad refactors, touching only files necessary for static serving per <workspace-hygiene>.

### Performance
- First byte for `/` on a warm container SHALL remain <=150 ms on local Docker (matching steering performance targets); document measurements in design.

### Security
- Static file serving SHALL respect existing security headers/CSP configurations; no directory listing or path traversal SHALL be possible.

### Reliability
- Startup sequencing SHALL ensure static assets are available before health checks report ready; compose health probes SHALL remain green under normal conditions.

### Usability
- Documentation SHALL note the updated behaviour and any required rebuild commands so users can quickly verify the UI is available after pulling latest images.
