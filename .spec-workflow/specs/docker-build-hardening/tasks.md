# Tasks Document

- [x] 1. Replace unsupported pnpm prune in Dockerfile
  - Files: deploy/docker/Dockerfile, .npmrc (new or updated)
  - Implement pnpm-supported production install using `pnpm --filter @moduprompt/api --prod deploy /srv/pruned` (or equivalent), ensure build stage exports required artifacts, and configure `inject-workspace-packages=true` for deploy command.
  - Purpose: Fulfil Requirement 1 by producing a production-only dependency tree without unsupported flags.
  - _Leverage: deploy/docker/Dockerfile, package.json scripts, pnpm deploy docs_
  - _Requirements: Requirement 1 (AC1–AC3)
  - _Prompt: Implement the task for spec docker-build-hardening, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps engineer specializing in pnpm workspaces and Docker multi-stage builds | Task: Update deploy/docker/Dockerfile to use pnpm deploy for production installs, add any necessary pnpm configuration (e.g., .npmrc) so the command succeeds, and verify the runtime stage only contains production dependencies | Restrictions: Do not remove existing build outputs, keep exporter stage functional, retain security hardening (non-root user, read_only) | Leverage: deploy/docker/Dockerfile, pnpm deploy documentation, existing build stage outputs | Requirements: Requirement 1 AC1–AC3 | Success: Docker build completes without pnpm errors, runtime image runs with production deps only, exporter stage still builds | Tasks.md: Mark this task as [-] when starting work and [x] when complete_

- [x] 2. Add reusable Docker verification scripts
  - Files: package.json, scripts/ (new helper if needed)
  - Create `pnpm docker:verify` (and supporting scripts) that run the Docker build with deterministic flags, emit timing/log info, and optionally validate absence of devDependencies by inspecting the built image.
  - Purpose: Provide local entry points aligned with Requirement 2 for regression detection.
  - _Leverage: package.json existing scripts, docker CLI, node inspection snippets_
  - _Requirements: Requirement 2 (AC2), Requirement 3 (AC2)
  - _Prompt: Implement the task for spec docker-build-hardening, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Tooling engineer focused on Node.js automation | Task: Define npm scripts (and helper files if necessary) that build the Docker image, inspect the generated container to confirm devDependencies are absent, and surface clear success/failure output for developers | Restrictions: Scripts must be idempotent, avoid removing developer caches, support Linux/macOS environments | Leverage: package.json scripts section, docker CLI inspection commands, Node.js one-liners | Requirements: Requirement 2 AC2, Requirement 3 AC2 | Success: `pnpm docker:verify` exits 0 on success and non-zero with actionable messaging on failure, verification logic reusable by CI | Tasks.md: Mark this task as [-] when starting work and [x] when complete_

- [ ] 3. Integrate verification into CI container-security job
  - Files: .github/workflows/pipeline.yml
  - Modify CI to invoke `pnpm docker:verify`, capture build timing, and ensure Trivy still scans updated images; publish logs that note the pnpm command used.
  - Purpose: Enforce Requirement 2 AC1 and Requirement 3 AC3 in automated pipelines.
  - _Leverage: .github/workflows/pipeline.yml existing jobs, pnpm action setup_
  - _Requirements: Requirement 2 (AC1, AC3), Requirement 3 (AC3)
  - _Prompt: Implement the task for spec docker-build-hardening, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI engineer experienced with GitHub Actions and pnpm workspaces | Task: Update the container-security job to call the new verification script before building images, ensure logs clearly show the pnpm command executed, and keep Trivy scans intact | Restrictions: Do not duplicate install steps, maintain job dependency order, keep workflow within current timeouts | Leverage: existing pipeline.yml steps, GitHub Actions caching, pnpm scripts | Requirements: Requirement 2 AC1 & AC3, Requirement 3 AC3 | Success: CI fails if Docker verification fails, logs display pnpm deploy command, Trivy scanning still runs | Tasks.md: Mark this task as [-] when starting work and [x] when complete_

- [ ] 4. Implement automated runtime dependency smoke check
  - Files: scripts/docker/assert-runtime-deps.mjs (new), package.json, tests/docker/ (optional new fixture)
  - Add a script executed post-build (local + CI) that runs the built image to verify production dependencies only (e.g., check `node_modules` tree size or absence of dev-only packages) and returns structured output.
  - Purpose: Satisfy Requirement 2 AC3 and provide measurable assurance of dependency pruning.
  - _Leverage: Node.js fs/promises, docker run --rm commands_
  - _Requirements: Requirement 2 (AC3)
  - _Prompt: Implement the task for spec docker-build-hardening, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Automation engineer with Node.js scripting expertise | Task: Create a script that inspects the built Docker image to confirm only production dependencies are present, integrate it with the verification command, and ensure output is machine-readable for CI logs | Restrictions: Keep runtime short, avoid requiring privileged Docker flags, ensure script cleans up containers/images it creates | Leverage: Node.js scripts directory, docker CLI inspection, pnpm workspace dependency manifests | Requirements: Requirement 2 AC3 | Success: Script detects regressions (fails on injected devDeps), integrates with `pnpm docker:verify`, outputs JSON/structured logs | Tasks.md: Mark this task as [-] when starting work and [x] when complete_

- [ ] 5. Overhaul README for open-source onboarding
  - Files: README.md, docs/ops/env-vars.md (link updates), docs/product/quickstart.md (cross-links)
  - Rewrite README sections covering overview, prerequisites, pnpm/Docker quickstart, verification commands, contribution pointers, community/license visibility per Requirement 4 and align with new scripts.
  - Purpose: Deliver Requirement 4 AC1–AC3 and support visibility obligations from Requirement 3.
  - _Leverage: existing README content, docs/product/quickstart.md, docs/ops/env-vars.md_
  - _Requirements: Requirement 3 (AC1–AC2), Requirement 4 (AC1–AC3)
  - _Prompt: Implement the task for spec docker-build-hardening, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical writer with DevRel experience | Task: Restructure README to highlight ModuPrompt’s value, provide clear setup paths (pnpm + Docker), document the new verification workflow, and expose community/licensing info for FOSS readiness | Restrictions: Maintain accuracy with steering docs, avoid duplicating deep doc content, preserve spec workflow references | Leverage: current README, steering documents, updated scripts | Requirements: Requirement 3 AC1–AC2, Requirement 4 AC1–AC3 | Success: README guides newcomers from zero to running verification, renders cleanly on GitHub with clear headings/badges, links to deeper docs | Tasks.md: Mark this task as [-] when starting work and [x] when complete_

