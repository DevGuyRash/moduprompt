# ModuPrompt Stabilization Changelog

## 2025-09-27 - Documentation & Runbook Refresh
- Updated `README.md` with offline workflows, sample workspace instructions, and smoke test matrix (Requirements 1–5).
- Rebuilt `docs/product/quickstart.md` to cover pnpm/Docker launches, workspace snapshot import, offline recovery, deterministic exports, and observability runbooks.
- Extended governance, compiler, and ops guides to include offline audit readiness, service worker notes, and MODUPROMPT_* environment variables (`docs/admin/governance.md`, `docs/developer/compiler.md`, `docs/ops/env-vars.md`).
- Published governed demo bundle at `docs/product/samples/workspace-demo.json` for enablement walkthroughs and Playwright fixtures.
- Recorded stabilization risk and readiness notes below for audit traceability.

### Risk Register
| Risk | Impact | Likelihood | Mitigation | Status |
| --- | --- | --- | --- | --- |
| Offline snapshot import fails on legacy browsers | Medium | Low | Verified Dexie/OPFS migrations using sample bundle and offline checklist; document fallback export/import flow | Monitoring |
| CSP hash drift during Vite upgrades | Medium | Medium | Documented `MODUPROMPT_PUBLIC_BASE` / `STATIC_ROOT` controls; `pnpm docker:verify` + docker smoke suite gate releases | Monitoring |
| Governance audit backlog after reconnect | Low | Medium | Added runbook entries for Dexie audit queue flush and API structured logs | Monitoring |

### References
- Spec: `.spec-workflow/specs/moduprompt-stabilization/{requirements,design,tasks}.md`
- Steering: `.spec-workflow/steering/{product,tech,structure}.md`
- Tests: `tests/e2e/{moduprompt,docker}`, `tests/a11y`, Playwright config projects `journeys`, `accessibility`, `docker-smoke`

