# Design – fix-typescript-workspace-build

## Overview
TypeScript compilation inside the Docker build fails because workspace packages cannot resolve the
`@moduprompt/types` module when `pnpm build` runs in a freshly cloned environment. The failure
cascade also exposes missing type definitions for `sanitize-html`, blocking the compiler package.
This design aligns ModuPrompt’s TypeScript configuration with the steering guidance and introduces
typing coverage plus contributor documentation so that deterministic builds succeed locally and
within Docker Compose.

## Steering Document Alignment

### Technical Standards (tech.md)
- **Offline-first build determinism (§Technology Stack, §Development Practices):** centralising
  module resolution in `tsconfig.base.json` preserves the shared TypeScript domain layer as the
  source of truth for both client and backend packages.
- **Security & supply chain (§Security & Compliance):** vetting the new `@types/sanitize-html`
  dependency satisfies the requirement for typed, sandboxed Markdown sanitisation.

### Project Structure (structure.md)
- **Shared libraries (§Repository Layout – `packages/types`):** consumes types via workspace paths
  while keeping compiled output in the shared package, avoiding duplicate schema definitions.
- **Code organisation principles:** updates live in base config and package manifests, respecting the
  single-responsibility conventions for configuration vs. package-level logic.

### Product Steering (product.md)
- **Deterministic Delivery & Governed Snippets:** restoring predictable builds ensures the snippet
  governance and export pipelines remain deployable through Docker, upholding the platform promise
  of deterministic exports with provenance.

## Code Reuse Analysis

### Existing Components to Leverage
- **`tsconfig.base.json`**: centralised compiler options ensure consistent module resolution across
  apps and packages.
- **pnpm workspace tooling**: dependency graph already encodes `@moduprompt/types` as a shared
  package.
- **Existing README Quick Start**: extends current Docker guidance instead of creating a new entry
  point.

### Integration Points
- **Docker build stage (`deploy/docker/Dockerfile`)**: no structural changes, but the build step
  benefits from improved TypeScript configuration.
- **Compiler package (`packages/compiler`)**: adds typings dependency while preserving ESM output.

## Architecture

- **Module resolution adjustments**: adopt TypeScript’s `moduleResolution: "NodeNext"` for better
  compatibility with `exports` maps and add `paths` aliases from the workspace root to
  `packages/types/src`. This satisfies <coding-foundations><principles/></coding-foundations> by
  avoiding ad-hoc per-package patches and keeps deterministic builds per
  <coding-foundations><performance-and-efficiency/></coding-foundations>.
- **Typing hardening**: add `@types/sanitize-html` as a `devDependency` in `packages/compiler` so the
  server-side export module builds without implicit `any` surfaces, meeting
  <coding-foundations><security/></coding-foundations> requirements.
- **Documentation update**: add a troubleshooting callout in the Docker quick start so contributors
  can recognise and remediate legacy caches, satisfying <coding-foundations><quality-gates/>.

```mermaid
graph TD
    subgraph Config
        A[tsconfig.base.json]
        B[paths alias for @moduprompt/types]
    end
    subgraph Packages
        C[@moduprompt/types]
        D[@moduprompt/snippet-store]
        E[@moduprompt/compiler]
    end
    subgraph Tooling
        F[pnpm build]
        G[docker compose build]
    end
    A --> B
    B --> D
    B --> E
    C -->|exports & dist| D
    C -->|exports & dist| E
    F --> D
    F --> E
    F --> G
```

## Components and Interfaces

### Component 1 – TypeScript Workspace Configuration
- **Purpose:** guarantee consistent module resolution and dependency typing across packages when
  running `pnpm build` or `pnpm typecheck`.
- **Interfaces:** `tsconfig.base.json` consumed by every package `tsconfig.json`; new `paths` entries
  (`@moduprompt/types`, `@moduprompt/types/*`).
- **Dependencies:** TypeScript compiler, pnpm workspace linking.
- **Reuses:** existing strict-mode configuration, shared target/output options.

### Component 2 – Compiler typings reinforcement
- **Purpose:** provide explicit typings for `sanitize-html` within `packages/compiler`.
- **Interfaces:** `package.json` devDependencies, TypeScript typechecker.
- **Dependencies:** DefinitelyTyped `@types/sanitize-html`, current `sanitize-html@2.17.0` runtime.
- **Reuses:** existing `build` and `typecheck` scripts (no script changes required).

### Component 3 – Contributor documentation update
- **Purpose:** communicate the resolved behaviour and steps for clearing cached Docker layers if the
  prior error reappears.
- **Interfaces:** `README.md` Quick Start section.
- **Dependencies:** none beyond Markdown rendering.
- **Reuses:** existing Quick Start structure and troubleshooting tone.

## Data Models
No schema or domain model changes; all updates operate at tooling/configuration level.

## Error Handling

### Error Scenario 1 – Workspace alias missing
- **Handling:** TypeScript now resolves `@moduprompt/types` via base config `paths`, preventing the
  TS2307 error before it surfaces in Docker builds.
- **User Impact:** pnpm build exits successfully; Docker layers continue building.

### Error Scenario 2 – Legacy Docker cache
- **Handling:** README instructs users to rebuild with `--no-cache` if the legacy layer still emits the
  error; deterministic builds remain reproducible per <determinism-and-reproducibility/>.
- **User Impact:** contributors have clear remediation guidance without inspecting Docker internals.

## Testing Strategy

### Unit / Type Tests
- Run `pnpm typecheck` to ensure all workspace packages resolve the shared types and that implicit
  `any` warnings are eliminated.

### Integration Tests
- Execute `pnpm build` locally (and optionally within CI) to confirm topological build order works with
  the alias configuration.

### End-to-End / Deployment Tests
- Rebuild Docker via `docker compose --profile core --env-file .env.local build --no-cache` to validate
  that the build stage succeeds inside the container image, aligning with
  <performance-protocol/><baseline/>.

