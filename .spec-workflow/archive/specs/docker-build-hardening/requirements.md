# Requirements Document

## Introduction
The Docker build for ModuPrompt currently fails during the production-pruning stage because the Dockerfile invokes `pnpm prune --prod --filter ./...`, which is unsupported for pnpm workspaces on pnpm 9.7.0. The top-level README also lacks newcomer-friendly guidance, making it harder for contributors to discover the supported build workflow. This specification will ensure container builds complete reliably, add automated safeguards to prevent regressions, and overhaul onboarding documentation so the repository is release-ready for the broader open-source community.

## Alignment with Product Vision
- Reinforces the Product Steering commitment to "Local-First Reliability" and "Deterministic Delivery" by making Docker images reproducible and audit-ready.
- Upholds the Technical Steering directive for Docker-first delivery and pnpm-based workspaces by adopting supported tooling paths for production builds.
- Strengthens Structure Steering expectations that CI includes Docker build verification and that deployment assets under `deploy/docker` remain standards-compliant.
- Advances the Product Steering goal of community adoption by providing clear README onboarding for open-source users and contributors.

## Requirements

### Requirement 1 – Workspace-safe production install for Docker builds

**User Story:** As a DevOps engineer, I want the Docker build stage to use a pnpm-supported workflow for workspace production installs so that container images assemble reliably without manual intervention.

#### Acceptance Criteria
1. WHEN the Docker image build runs with `docker build -f deploy/docker/Dockerfile` THEN the dependency installation stage SHALL succeed without invoking unsupported pnpm flags (e.g., `--recursive` on `pnpm prune`).
2. IF the build executes inside CI using the existing GitHub Actions workflow THEN it SHALL complete using the new workflow without reintroducing devDependencies into the runtime image.
3. WHEN running `docker compose --profile core --env-file deploy/docker/.env.local up --build --wait` locally THEN the process SHALL finish without pnpm errors and produce an image functionally equivalent to prior expectations.

### Requirement 2 – Automated guardrails for container build regressions

**User Story:** As an automation engineer, I want CI and local validation commands that fail fast when Docker build steps regress so that image breakages are caught before release.

#### Acceptance Criteria
1. WHEN CI executes the container security pipeline THEN it SHALL run the updated Docker build command and fail if the build encounters pnpm workspace incompatibilities or missing artifacts.
2. IF engineers run a documented validation script (e.g., `pnpm docker:verify`) THEN it SHALL execute the same build command(s) used in CI and surface failures with actionable messaging.
3. WHEN a developer introduces changes that modify Docker build steps THEN automated tests SHALL validate that production dependencies remain pruned and no dev-only packages are present in the runtime image (via smoke test or size/assertion check).

### Requirement 3 – Visibility and documentation for build reliability

**User Story:** As a release manager, I want clear documentation of the supported pnpm deployment path and evidence of coverage so that future contributors avoid reverting to broken patterns.

#### Acceptance Criteria
1. WHEN the specification is implemented THEN repository documentation under `deploy/docker` or `docs/ops` SHALL explain the validated pnpm workflow and local verification steps.
2. IF new contributors follow the documented steps THEN they SHALL be able to reproduce a successful build using the same commands as CI without additional environment tweaks.
3. WHEN reviewing CI artifacts THEN engineers SHALL find logs that explicitly note the pnpm command used for the production dependency stage to aid troubleshooting and audits.

### Requirement 4 – README onboarding overhaul for open-source contributors

**User Story:** As a new open-source contributor, I want the repository README to provide a concise overview, quickstart, and troubleshooting pointers so that I can get ModuPrompt running locally or in Docker without prior project context.

#### Acceptance Criteria
1. WHEN the README is updated THEN it SHALL include sections covering project overview, prerequisites, pnpm/Docker quickstart, spec-workflow expectations, and links to deeper docs (deploy, contributing, governance).
2. IF a first-time contributor follows the README instructions on a clean environment THEN they SHALL be able to install dependencies, run the app locally, and execute the documented Docker verification command without missing steps.
3. WHEN the README renders on GitHub THEN headings, badges, and callouts SHALL make the FOSS posture explicit (license, community channels) and reflect the latest supported workflows introduced by this spec.

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each script or helper introduced MUST focus on either dependency installation, verification, documentation generation, or README maintenance to maintain clarity.
- **Modular Design**: CI workflow updates SHALL reference shared reusable actions or pnpm scripts instead of duplicating logic across jobs.
- **Dependency Management**: Prefer pnpm-native solutions (`pnpm deploy`, filtered installs) to avoid custom tooling that would add maintenance overhead.
- **Clear Interfaces**: Provide well-defined CLI entry points (e.g., `pnpm docker:verify`) with documented inputs/outputs for local and CI use, and ensure README instructions reference those same entry points.

### Performance
- Production builds SHALL not exceed the current baseline stages by more than 10% wall-clock time under comparable hardware; record before/after metrics when implementing.

### Security
- Enforce least-privilege in Docker images by ensuring devDependencies are excluded and supply-chain scanning (Trivy) remains functional after workflow changes.

### Reliability
- CI jobs MUST fail deterministically on build regressions; scripts SHALL exit with non-zero status on errors and provide actionable logs.

### Usability
- Developer documentation, including the updated README, SHALL provide copy-pasteable commands and prerequisites so that engineers can validate builds without prior Docker specialization.
