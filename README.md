# ModuPrompt

[![pnpm workspace](https://img.shields.io/badge/pnpm-9.7.0-FFAE00?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Docker ready](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](deploy/docker/)
[![Spec workflow](https://img.shields.io/badge/spec--workflow-moduprompt--stabilization-7B3FA0)](.spec-workflow/specs/moduprompt-stabilization/)

ModuPrompt is a local-first prompt authoring studio that unifies notebook and node graph editing, enforces snippet governance, and produces deterministic exports ready for audits. The stack aligns with our approved steering documents, keeping Docker-first delivery and pnpm workspaces at the core while remaining extensible for regulated environments.

---

## Overview
- **Unified authoring:** Switch seamlessly between linear notebook editing and a node graph while sharing a single source of truth.
- **Governed snippets:** Attach metadata, provenance pins, and append-only history to every reusable fragment.
- **Deterministic delivery:** Reproduce Markdown, HTML, PDF, DOCX, and chat exports with stable hashes and provenance logs.
- **Local-first foundation:** Run entirely on your workstation via pnpm or Docker; optional services add collaboration, exports, and webhooks when you need them.
- **Stabilized operations:** Offline-ready service worker, Dexie/OPFS migrations, and Docker runbooks now ship with documented smoke tests and recovery flows so ops teams can keep deployments healthy.

> [!NOTE]
> Product/technical/structure steering lives in `.spec-workflow/steering/`. Follow the spec workflow (Requirements → Design → Tasks → Implementation) before changing behavior.

---

## Choose Your Setup Path
Pick the workflow that matches how you want to evaluate or contribute to ModuPrompt.

### 1. pnpm workspace (contributors)
1. **Prerequisites:** Node.js 20.17.x (via Corepack), pnpm 9.7.x, Docker (optional for verification), Playwright browsers if you plan to run UI tests (`pnpm exec playwright install`).
2. **Install & build:**
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
3. **Run the API:**
   ```bash
   pnpm --filter @moduprompt/api dev
   ```
   Configure env vars via [`docs/ops/env-vars.md`](docs/ops/env-vars.md) when pointing to real services.
4. **Work on the web client:**
   ```bash
   pnpm --filter @moduprompt/web dev
   ```
5. **Load the sample workspace (optional but recommended):** follow [`docs/product/quickstart.md`](docs/product/quickstart.md#seed-the-sample-workspace) to import `docs/product/samples/workspace-demo.json` so you can explore synchronized notebook, node graph, and compiler flows.
6. **Validate offline & governance workflows:** use the quickstart's offline checklist to install the PWA, toggle airplane mode, and confirm service worker recovery plus accessibility shortcuts.
7. **Run checks as you iterate:** `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and the Playwright harness under `tests/e2e/` to keep deterministic coverage.

### 2. Docker Compose (evaluators & ops)
1. **Prerequisites:** Docker Engine/Compose v2.
2. **Create a local env file:**
   ```bash
   cd deploy/docker
   touch .env.local
   ```
   Populate values using the tables in [`docs/ops/env-vars.md`](docs/ops/env-vars.md); keep secrets out of version control.
3. **Launch the core stack:**
   ```bash
   docker compose --profile core --env-file .env.local up --build --wait
   ```
4. **Optional services:** add exports and object storage when needed:
   ```bash
   docker compose --profile exports --env-file .env.local up --build --wait
   ```
5. Visit http://localhost:8080 for the PWA. Import `docs/product/samples/workspace-demo.json` from **Settings → Workspace** to populate governed demo content.
6. Toggle the browser's offline mode or disconnect networking to confirm Dexie/OPFS persistence and reconnect handling. Capture audit notes per [`docs/admin/governance.md`](docs/admin/governance.md#offline-audit-readiness).
7. (Optional) Verify the container serves the SPA bundle and governance APIs:
   ```bash
   DOCKER_SMOKE_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e --project docker-smoke
   ```
   The smoke suite asserts `/` returns the compiled shell, static assets stream with immutable caching, `/api/*` retains JSON semantics, and governance endpoints emit structured audit logs.

---

## Verify the Runtime Image & Offline Bundle (required for releases)
The moduprompt-stabilization spec builds on the docker-build-hardening work: ship the hashed SPA bundle, confirm exports stay deterministic, and prove runtime images only contain production dependencies.

- **Local & CI command:**
  ```bash
  pnpm docker:verify
  ```
  This wraps `docker build` (runtime stage only) and executes `scripts/docker/verify-runtime-deps.mjs`. The script outputs structured JSON and fails if it detects devDependencies, missing manifests, or Docker issues.
- **What to expect:** successful runs emit a ✅ summary in stderr and a `status:"pass"` JSON record in stdout. Failures include actionable hints (e.g., which packages are marked `dev: true`).
- **Logs in CI:** `.github/workflows/pipeline.yml` calls the same script inside the `container-security` job before Trivy scans, so audit trails show the exact pnpm deploy command executed.

> [!TIP]
> Set `DOCKER_VERIFY_IMAGE` or `DOCKER_VERIFY_MODULES_PATH` before running `pnpm docker:verify` if you need to inspect a different image tag or manifest location.

---

## Quality Gates & Tooling
| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Strict TypeScript coverage across workspace packages. |
| `pnpm test` | Unit + integration suites (Vitest, Prisma, fake-indexeddb). |
| `pnpm test:e2e` | Playwright + axe-core accessibility flows under `tests/e2e`. |
| `pnpm test:perf` | Compiler performance benchmarks with deterministic seeds. |
| `pnpm docker:verify` | Builds runtime image and asserts production-only dependencies. |
| `pnpm docker:build` | Rebuilds the runtime stage without running assertions (useful for iterative debugging). |

All commands mirror our GitHub Actions pipeline and respect <determinism-and-reproducibility/> guardrails.

---

## Documentation Map
- Product quickstart: [`docs/product/quickstart.md`](docs/product/quickstart.md)
- Governance administration & offline audit readiness: [`docs/admin/governance.md`](docs/admin/governance.md)
- Compiler internals & extension guide: [`docs/developer/compiler.md`](docs/developer/compiler.md)
- Environment variables & data classification: [`docs/ops/env-vars.md`](docs/ops/env-vars.md)
- Stabilization changelog & risk log: [`docs/changelog/moduprompt-stabilization.md`](docs/changelog/moduprompt-stabilization.md)
- Release & foundational notes: [`docs/changelog/moduprompt-overview.md`](docs/changelog/moduprompt-overview.md)
- Sample workspace bundle: [`docs/product/samples/workspace-demo.json`](docs/product/samples/workspace-demo.json)

See `.spec-workflow/specs/` for approved specs, including `moduprompt-stabilization` (current implementation focus) and `moduprompt-overview` (foundational features).

---

## Sample Workspace & Smoke Tests
- Import [`docs/product/samples/workspace-demo.json`](docs/product/samples/workspace-demo.json) through the web app settings to explore synchronized notebook, node graph, governance, and compiler flows with provenance metadata pre-populated.
- Run `pnpm test:e2e --project journeys` for the guided authoring workflow and `pnpm test:e2e --project accessibility` to verify WCAG coverage with axe-core.
- Execute `DOCKER_SMOKE_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e --project docker-smoke` after a Compose deployment to assert the hashed SPA bundle, CSP headers, and Fastify observability endpoints are healthy.

---

## Working Within the Spec Workflow
- Specs live under `.spec-workflow/specs/<name>/` with `requirements.md`, `design.md`, and `tasks.md` (versioned & approval-gated).
- Before starting a task, mark it as `[-]` in `tasks.md`; mark as `[x]` when finished. This README update corresponds to task **7** of `moduprompt-stabilization`.
- Align changes with steering (Product → Technical → Structure) before modifying code or docs. If scope drifts, update the spec and re-run approvals.

---

## Community & Licensing
- **Community channels:** use [GitHub Issues](https://github.com/moduprompt/moduprompt/issues) for bugs or feature requests and tag with appropriate spec references. Discussions will open post-FOSS launch; register interest via issues until then.
- **Security contact:** report vulnerabilities privately to the maintainers (open an issue with the `security` template or email the security contact listed in the forthcoming SECURITY.md).
- **License status:** ModuPrompt is preparing a FOSS release. The final OSI-approved license and CONTRIBUTING guidelines will land before the wider community launch; track progress in [`docs/changelog/moduprompt-overview.md`](docs/changelog/moduprompt-overview.md).

---

## Contributing & Next Steps
1. Fork or branch following the Conventional Commits workflow described in `.spec-workflow/specs/moduprompt-overview/tasks.md`.
2. Run the full quality gate table above before opening a PR.
3. Reference relevant specs (`docker-build-hardening`, `moduprompt-overview`) in your PR description and note any ADRs or security impacts.

For roadmap themes and future collaboration opportunities, review the Product Steering roadmap in `.spec-workflow/steering/product.md`.

---

### Need Help?
- Check the troubleshooting tips embedded in `scripts/docker/verify-runtime-deps.mjs` and our CI logs.
- Consult the steering docs and specs before requesting changes—they are the single source of truth for architecture and process.
- If you discover documentation gaps, propose updates via the spec workflow so approvals remain auditable.
