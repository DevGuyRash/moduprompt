# Requirements Document

## Introduction
The Docker build stage fails during `pnpm build` because TypeScript cannot resolve the
workspace package `@moduprompt/types`, cascading into implicit `any` errors and blocking
compiler/snippet-store compilation. The spec captures the work needed to restore a clean
workspace build, align TypeScript module resolution with the approved steering docs, and
ensure documentation reflects the necessary setup for contributors running Docker Compose.

## Alignment with Product Vision
- **Product Steering (§Product Pillars – Deterministic Delivery, Governed Snippets)**: restoring
the deterministic build pipeline keeps exports and snippet governance reliable across self-hosted
installs.
- **Technical Steering (§Architecture Overview, Technology Stack)**: TypeScript shared types are
the source of truth for client/server contracts; fixing resolution protects the modular architecture
and offline-first workflows.
- **Structure Steering (§Repository Layout, Code Organization Principles)**: reinforces shared
types consumption from `packages/types` across packages and keeps Docker deploy assets under
`deploy/docker` functional.

## Requirements

### Requirement 1 – Workspace packages resolve shared types during builds

**User Story:** As a platform engineer operating ModuPrompt in Docker, I want the workspace
packages to resolve `@moduprompt/types` during `pnpm build`, so that container builds succeed
without manual intervention.

#### Acceptance Criteria

1. WHEN `pnpm build` runs after `pnpm install --frozen-lockfile --ignore-scripts` on a clean
   checkout THEN every package SHALL resolve `@moduprompt/types` without TS2307 errors.
2. IF `docker compose --profile core --env-file .env.local up --build --wait` executes using the
   provided Dockerfile THEN the build stage SHALL finish without TypeScript compilation failures.
3. WHEN `pnpm typecheck` executes in CI or locally THEN the workspace SHALL complete without
   module resolution errors for `@moduprompt/types`.

### Requirement 2 – Third-party module typings are available for the compiler

**User Story:** As a compiler maintainer, I want first-party typings for `sanitize-html`, so that the
compiler server module builds without `any`-typed surfaces and parser regressions.

#### Acceptance Criteria

1. WHEN TypeScript compiles `packages/compiler` THEN the import of `sanitize-html` SHALL have
   concrete typings (either via `@types/sanitize-html` or an internal declaration) eliminating TS7016.
2. IF the typings rely on a new dependency THEN `pnpm install --frozen-lockfile` SHALL pin and lock
the version without breaking existing consumers.
3. WHEN the compiler’s HTML export utilities run under unit tests THEN no new implicit `any`
   warnings SHALL appear in `pnpm typecheck`.

### Requirement 3 – Contributor documentation reflects build prerequisites

**User Story:** As a contributor following the Docker quick start, I want the README to call out the
necessary steps or troubleshooting to ensure workspace builds succeed, so that I can recover if the
image build fails due to type resolution.

#### Acceptance Criteria

1. WHEN a reader follows the Docker quick start in `README.md` THEN the instructions SHALL
   mention the shared types build dependency or troubleshoot module resolution failures.
2. IF a manual remediation (e.g., running `pnpm build` locally) is required THEN the README SHALL
   instruct how to apply it without weakening security (no secrets in commands).
3. WHEN documentation updates land THEN they SHALL reference the spec ID and remain consistent
   with steering documents.

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: tsconfig changes MUST reside in shared config files (e.g.,
  `tsconfig.base.json`) to avoid duplicating logic across packages.
- **Modular Design**: Shared type consumption SHALL continue via workspace package imports;
  avoid ad-hoc relative paths.
- **Dependency Management**: Any new type dependency SHALL be added to the owning package
  with explicit rationale and lockfile update.
- **Clear Interfaces**: Shared types SHALL remain the contract surface; no leaking of implementation
  details from compiler/snippet-store internals.

### Performance
- Build time SHALL remain within existing CI budgets (no more than +10% wall-clock for `pnpm build`).
- Module resolution changes SHALL not introduce runtime performance regressions.

### Security
- New dependencies (e.g., typings) MUST be vetted per <security-supply-chain/> with license and
  advisory checks.
- Documentation SHALL avoid exposing secrets or insecure defaults beyond dev-only guidance.

### Reliability
- Build/test commands SHALL remain deterministic per <determinism-and-reproducibility/>; ensure
  no caching side effects break reproducibility.

### Usability
- README guidance SHALL be actionable and minimal, reducing onboarding friction for contributors.
