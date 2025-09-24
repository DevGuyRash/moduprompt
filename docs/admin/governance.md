# Governance Administration Guide

## Audience
Workspace administrators and compliance reviewers responsible for managing
status schemas, policy gates, and traceability for ModuPrompt deployments.

## Governance Model Overview
- Governance settings live in `packages/snippet-store` governance module and
  optional `apps/api` governance services (FR-8).
- Status schema defines ordered states (Draft -> In Review -> Approved) with color
  tokens meeting WCAG AA requirements.
- Tag taxonomy enforces normalized keys (lowercase, dash-separated) to simplify
  search and export filtering.

## Status Schema Management
1. Open **Admin > Governance Schema** in the web app.
2. Add or edit statuses, specifying:
   - `key` (immutable identifier persisted in DocumentModel).
   - `name`, `description`, and `color` (must satisfy contrast ratios per
     `.spec-workflow/steering/tech.md`).
   - `isFinal` flag for terminal states that unlock export recipes (FR-8).
3. Publish schema updates. Clients cache updates offline and reconcile during
   sync; schema version increments ensure deterministic migrations (FR-11,
   NFR-1).
4. Review audit log entries for schema changes to maintain SOX-style traceability
   (R-12).

## Policy Rules & Export Gating
- Export recipes declare `allowedStatuses`; compiler preflight enforces the gate
  before jobs enqueue (FR-10).
- Administrators can configure **Policy Overrides** to permit exceptions. Each
  override must include rationale and expiry; entries record in audit log and
  changelog (R-12).
- For deterministic previews, ensure no policy override bypasses sanitizer
  warnings; overrides only apply to status transitions.

## Decision Logging Workflow
- Every governance change should register a decision entry in
  `docs/changelog/moduprompt-overview.md` with date, actor, and impacted
  requirements (FR-8, R-12).
- The changelog couples with audit logs to provide bi-directional traceability
  from documentation to runtime enforcement.

## Audit Logs & Webhooks
- Audit events emit from `apps/api/src/modules/audit` (when backend enabled) and
  sync from offline clients when connectivity resumes (FR-3, FR-8).
- Webhook dispatcher relays events (`document.status.changed`,
  `export.completed`) for downstream compliance systems.
- Verify webhook delivery in **Admin > Integrations**; retry failures using the
  built-in exponential backoff queue.

## Width & Readability Controls
- Governance admins can enforce default document width (80/96/120 ch) under
  **Admin > Display Policies**. Enforced width syncs into DocumentModel
  `settings.maxWidth` ensuring deterministic layouts in exports (design.md).
- Document authors may narrow width locally, but exports respect enforced
  maximums. Capture policy rationale in audit log to satisfy review workflows.

## Compliance Checklist
- [ ] Status schema reviewed quarterly per Product Steering cadence.
- [ ] Export recipes reference at least one `isFinal` status.
- [ ] Overrides documented with expiry and stored in changelog.
- [ ] Audit/webhook pipelines validated after governance updates.
- [ ] Width policy verified against channel guidelines (80/96/120 ch).

## Traceability
- FR-6: Preflight integration ensures governance warnings surface to users.
- FR-8: Governance controls and policy enforcement.
- FR-10: Export gating and provenance policies.
- FR-17: Testing harness coverage for governance flows.
- R-12: Auditability and documented decision rationale.

## Related References
- `.spec-workflow/specs/moduprompt-overview/design.md`
- `.spec-workflow/specs/moduprompt-overview/requirements.md`
- `apps/api/src/modules/governance/`
- `docs/product/quickstart.md`
