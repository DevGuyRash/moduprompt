# Tasks – fix-typescript-workspace-build

- [-] 1. Normalize TypeScript workspace resolution
  - Files: `tsconfig.base.json`, `packages/*/tsconfig*.json` (audit and update only where required), `deploy/docker/Dockerfile`
  - Actions:
    - Set `moduleResolution` to `NodeNext` in the base config and introduce `paths` aliases for `@moduprompt/types`.
    - Remove redundant per-package overrides once base config covers workspace module resolution.
    - Ensure Docker build stage continues to leverage the shared configuration without extra steps.
  - Verification:
    - `pnpm typecheck`
  - _Leverage: `tsconfig.base.json`, existing package-specific `tsconfig.json`, steering Technical §Development Practices_
  - _Requirements: Requirement 1_
  - _Prompt: Implement the task for spec fix-typescript-workspace-build, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript platform engineer focused on workspace tooling | Task: Normalize TypeScript module resolution so every package resolves @moduprompt/types during pnpm build; update base config, trim duplicate overrides, and confirm Docker builds pick up the change | Restrictions: Do not relax strict compiler flags, avoid per-package hacks, keep changes limited to configs and directly related scripts | _Leverage: tsconfig.base.json, packages/*/tsconfig.json | _Requirements: Requirement 1 | Success: pnpm typecheck passes, pnpm build completes without TS2307 errors, Docker build stage finishes without TypeScript failures_

- [-] 2. Add sanitize-html typings and eliminate implicit anys
  - Files: `packages/compiler/package.json`, `pnpm-lock.yaml`, `packages/compiler/src/server/export.ts`
  - Actions:
    - Add `@types/sanitize-html` as a dev dependency and regenerate the lockfile.
    - Update compiler imports if necessary to use typed interfaces while maintaining ESM semantics.
    - Address any remaining implicit `any` warnings surfaced by stricter typings.
  - Verification:
    - `pnpm install --frozen-lockfile`
    - `pnpm --filter @moduprompt/compiler typecheck`
  - _Leverage: `packages/compiler/package.json`, `packages/compiler/src/server/export.ts`, steering Technical §Security & Compliance_
  - _Requirements: Requirement 2_
  - _Prompt: Implement the task for spec fix-typescript-workspace-build, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Compiler maintainer with expertise in TypeScript typing hygiene | Task: Introduce typed sanitize-html support by adding @types/sanitize-html, updating imports, and clearing implicit any diagnostics in the compiler server export module | Restrictions: Do not downgrade sanitize-html, keep runtime behaviour identical, ensure lockfile integrity | _Leverage: packages/compiler/package.json, packages/compiler/src/server/export.ts | _Requirements: Requirement 2 | Success: pnpm install --frozen-lockfile succeeds, compiler typecheck/build run clean with no implicit any warnings_

- [ ] 3. Update contributor documentation and validate Docker build
  - Files: `README.md`, `deploy/docker/README` (if present)
  - Actions:
    - Document the shared-types build prerequisite and troubleshooting steps for Docker users.
    - Note cache-busting guidance for legacy images while reinforcing secret handling.
    - After configuration changes, perform a fresh Docker build to confirm the fix end-to-end.
  - Verification:
    - `pnpm build`
    - `docker compose --profile core --env-file .env.local build --no-cache`
  - _Leverage: Existing README Quick Start, Product steering §Product Pillars (Deterministic Delivery)_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec fix-typescript-workspace-build, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Developer advocate with Docker expertise | Task: Refresh README guidance for Docker builds, covering shared types expectations and troubleshooting, then validate the stack builds cleanly with the new TypeScript configuration | Restrictions: No secrets in docs, keep instructions concise, avoid altering unrelated README sections | _Leverage: README.md | _Requirements: Requirement 3 | Success: Documentation reflects the new guidance, pnpm build passes, docker compose build --no-cache completes without TypeScript errors_
