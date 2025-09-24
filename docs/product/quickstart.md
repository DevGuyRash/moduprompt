# ModuPrompt Quickstart Guide

## Audience
Prompt architects, automation engineers, and compliance reviewers who need a
repeatable workflow for composing prompts, governing snippet usage, and
publishing deterministic exports.

## Prerequisites
- ModuPrompt PWA installed or served from Docker stack per
  `.spec-workflow/steering/tech.md` and `deploy/docker/docker-compose.yml`.
- Workspace initialized with shared schemas from `packages/types` and offline
  persistence enabled through `packages/snippet-store` (FR-2, FR-3).
- At least one document created via the notebook or node graph modules.

## Workflow Overview
1. **Open the notebook view** (`apps/web/src/modules/notebook`) to draft content
   using cells, snippet drops, and formatter actions (FR-1, FR-6).
2. **Switch to the node graph** (`apps/web/src/modules/node-graph`) to visualize
   flow, validate connections, and confirm there are no cycle warnings (FR-1,
   FR-5).
3. **Manage snippets** through the snippet library panel, ensuring every insert
   references versioned assets with provenance badges (FR-2, FR-3).
4. **Configure governance** by selecting tags and statuses in the governance
   controls. Status changes log to the audit trail and gate exports (FR-8,
   FR-10).
5. **Run preflight** from the preview pane to surface blocking issues, including
   status gates, unbound variables, and sanitizer errors (FR-6, FR-10).
6. **Trigger exports** using a recipe that matches the desired channel. Export
   jobs record provenance metadata and respect gating rules (FR-10, NFR-3).

## Snippet Governance Essentials
- Maintain metadata through YAML frontmatter. Smart folders reuse saved queries
  for governance audits (FR-2).
- Reversions create new snippet versions; use provenance pins to lock specific
  revisions in documents (FR-3).
- Audit entries for snippet changes sync to optional backend services when
  available; offline edits buffer locally until connectivity returns (FR-3,
  FR-11).

## Preview, Preflight, and Export
- Live preview renders Markdown, Mermaid, and syntax-highlighted code using the
  deterministic compiler pipeline (`packages/compiler`) (FR-5, FR-6).
- Preflight chips display blocking and warning-level diagnostics. Resolve
  blocking items before export to satisfy R-12 traceability expectations.
- Export drawer shows recipe-specific status gates; update document status in
  governance controls to unlock export paths (FR-8, FR-10).
- Export artifacts include provenance footers listing snippet revisions and
  compile hashes for compliance validation (FR-10, R-12).

## Offline & Deterministic Operation
- All changes persist to IndexedDB + OPFS via `packages/snippet-store`. Sync
  conflicts produce guided resolution prompts once connectivity resumes
  (FR-11, NFR-1).
- Deterministic compiler guarantees bit-identical artifacts for identical inputs
  (NFR-4). Avoid manual edits to exported files to keep provenance intact.

## Layout Width Controls (80/96/120 ch)
- Document settings expose `maxWidth` options of `80ch`, `96ch`, or `120ch`
  (design.md - DocumentModel). Use Governance > Display Controls to select a
  width that matches your review context.
- Keep prose within the chosen width to prevent horizontal scrolling. Quick
  checks: toggle preview width and confirm no lines wrap beyond the column
  guideline.

## Traceability
- FR-6: Preview & preflight pipeline
  (`.spec-workflow/specs/moduprompt-overview/requirements.md`).
- FR-8: Governance controls for tags/statuses.
- FR-10: Export customization and status gates.
- FR-17: Testing harness references ensuring deterministic preview behavior.
- R-12: Traceability audits satisfied via provenance logging.

## Deterministic Checklist
- [ ] Preflight cleared with no blocking diagnostics.
- [ ] Document status matches export recipe gate.
- [ ] All snippets reference pinned revisions.
- [ ] Layout width verified at 80/96/120 ch as required.

## Related Artifacts
- `.spec-workflow/specs/moduprompt-overview/design.md`
- `.spec-workflow/steering/product.md`
- `.spec-workflow/steering/structure.md`
- `docs/admin/governance.md`
