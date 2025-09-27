# Compiler & Preflight Developer Guide

## Audience
Developers extending the deterministic compiler, preflight diagnostics, or
export pipeline in ModuPrompt.

## Architectural Summary
- Compiler source: `packages/compiler` with shared types from
  `packages/types` (FR-5, FR-6).
- Worker adapters: `packages/compiler/src/workers/clientAdapter.ts` for browser
  execution and `packages/compiler/src/server/export.ts` for headless exports.
  The service worker channels preview requests offline using the same adapter
  pipeline (Requirement 3).
- Governance policy integration flows through `packages/snippet-store`
  governance utilities and the compiler preflight stage (FR-8, FR-10).

## Deterministic Pipeline Responsibilities
1. **Transclusion resolver** - expands `{{> path@rev}}` references and records
   provenance metadata for audit logs (FR-4, FR-10).
2. **Variable substitution** - validates `{{var}}` bindings against document
   schema, raising deterministic errors with actionable hints.
3. **Formatter & filter orchestration** - executes sandboxed filters in workers
   using message channels with timeout guards to prevent non-deterministic side
   effects (FR-7, NFR-2).
4. **Preflight diagnostics** - block exports on:
   - status gate violations (`allowedStatuses` mismatch),
   - missing or cyclic snippets,
   - sanitizer issues (Mermaid, Markdown),
   - width configuration mismatches (ensuring chosen 80/96/120 ch fits recipes),
   - offline reconciliation issues (pending audit buffer flush) surfaced by the
     Dexie audit queue.
5. **Artifact emission** - produce Markdown, HTML, PDF, and chat-ready text with
   stable hashes recorded in export metadata (FR-10).

## Implementation Guidelines
- Keep all pure transforms side-effect free. Isolate I/O inside worker host
  modules to honour the Functional Core, Imperative Shell principle.
- When adding filters or formatters, declare deterministic constraints and
  include contract tests verifying identical output for identical input sets.
  Use `docs/product/samples/workspace-demo.json` as a canonical fixture for
  regression coverage.
- New diagnostics must categorize errors using the taxonomy in
  `.spec-workflow/specs/moduprompt-overview/design.md` (Errors section) to align
  with governance surfaces.
- Respect document width policies: preflight should warn when rendered content
  exceeds the configured 80/96/120 ch thresholds; include remediation guidance.

## Testing Expectations
- **Unit tests** (`packages/compiler/src/__tests__`) cover each pipeline stage
  with golden fixtures to enforce NFR-4.
- **Integration tests** ensure compiler <-> governance interactions succeed across
  browser (including service worker offline flows) and server environments
  (FR-8, FR-10, Requirement 3).
- **Performance benchmarks** (`tests/perf/compiler.bench.ts`) validate latency
  budgets for large documents (NFR-1).
- **Security fuzzing** exercises sanitizer defenses against hostile Markdown and
  Mermaid payloads (NFR-2).

## Release & Observability Notes
- Emit structured logs with correlation IDs when running in server context to
  satisfy observability contracts. Avoid logging snippet bodies or secrets.
  Tag offline replay events so operators can reconcile state against
  `docs/changelog/moduprompt-stabilization.md` risk entries.
- Export workers must register success/failure metrics; coordinate with
  `docs/admin/governance.md` to keep decision logs synchronized (R-12).

## Traceability
- FR-6: Live preview and diagnostics integration.
- FR-8: Governance policy enforcement in compiler.
- FR-10: Export customization and status gating.
- FR-17: Testing and QA harness coverage.
- R-12: Deterministic provenance and auditability.

## Checklists
- [ ] New transforms include deterministic tests and documentation.
- [ ] Worker adapters updated with timeout and memory guardrails.
- [ ] Preflight outputs reference remediation steps linked in product docs.
- [ ] Width validation respects 80/96/120 ch contract.
- [ ] Decision log updated when compiler behavior changes.

## Reference Material
- `.spec-workflow/specs/moduprompt-overview/design.md`
- `.spec-workflow/specs/moduprompt-overview/requirements.md`
- `.spec-workflow/specs/moduprompt-stabilization/design.md`
- `docs/product/samples/workspace-demo.json`
- `packages/compiler/README.md` (if present)
- `docs/product/quickstart.md`
