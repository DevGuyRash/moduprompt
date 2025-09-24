# ModuPrompt Environment Configuration

> Alignment: FR-10 (Export customization), FR-15 (Docker-first distribution), NFR-3 (Reliability). Refer to Technical Steering §Deployment Topology and Structure Steering §Repository Layout for runtime conventions.

## Overview
- Containers default to non-root execution (`UID 10001`) with read-only root file systems; writable state is explicitly mounted via Compose volumes.
- Environment variables are the primary contract for configuring on-premise deployments. All secrets must be injected via external secret managers or Docker/Compose `.env` files that remain outside version control.
- Offline-first posture: defaults favour local stack connectivity (internal service DNS) and avoid SaaS endpoints unless explicitly overridden.

## Variable Reference

| Variable | Component(s) | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `PORT` | app | Optional | `8080` | HTTP listener for the combined API + static bundle. Health checks target `/healthz`. |
| `NODE_ENV` | app, exporter | Optional | `production` | Ensures framework-level optimisations. Do not set to `development` in production. |
| `DATABASE_URL` | app, exporter | Required | `postgresql://moduprompt:moduprompt@postgres:5432/moduprompt?schema=public` | PostgreSQL connection string. Must include `schema` query for Prisma. Secrets: contains credentials → **Restricted** classification. |
| `POSTGRES_DB` | postgres | Optional | `moduprompt` | Name of primary database. Keep consistent with `DATABASE_URL`. |
| `POSTGRES_USER` | postgres | Optional | `moduprompt` | Provisioned role; align with secrets rotation policy. |
| `POSTGRES_PASSWORD` | postgres | Required | `moduprompt` (dev only) | Override in production; store in secrets manager. |
| `STORAGE_ENDPOINT` | app, exporter | Optional | `http://minio:9000` | S3-compatible endpoint for export artefacts. For air-gapped installs, point to internal MinIO or equivalent. |
| `STORAGE_ACCESS_KEY` | app, exporter | Required | `minioadmin` (dev only) | S3 access key; treat as **Confidential**. Rotate via secrets management. |
| `STORAGE_SECRET_KEY` | app, exporter | Required | `minioadmin` (dev only) | S3 secret key; treat as **Confidential**. |
| `STORAGE_BUCKET` | app, exporter | Optional | `moduprompt-exports` | Bucket for compiled artefacts and provenance manifests. |
| `EXPORT_QUEUE_URL` | app, exporter | Optional | `redis://redis:6379` | Queue endpoint for export worker scheduling. For offline-only usage without exports, omit and disable the `exports` profile. |
| `EXPORT_CALLBACK_URL` | exporter | Optional | `http://app:8080` | Internal callback used to notify app of job completion. Must be reachable inside Compose network. |
| `MINIO_ROOT_USER` | minio | Required | `minioadmin` (dev only) | Root credential for MinIO. Override in production deployments; store externally. |
| `MINIO_ROOT_PASSWORD` | minio | Required | `minioadmin` (dev only) | Root secret for MinIO. |
| `REDIS_PORT` | redis | Optional | `6379` | Surface port if Redis is exposed to host; leave internal-only in production. |
| `LOG_LEVEL` | app, exporter | Optional | `info` | Accepts `trace`→`fatal`. Follow observability contracts; prefer structured logs. |
| `EXPORTER_PORT` | exporter | Optional | `8081` | Worker HTTP diagnostics port (not exposed by default). |

## Profiles & Offline Operation
- **Core profile (`docker compose --profile core up`)**: launches `app` and `postgres`. Suitable for offline authoring/preview without export pipeline. Ensure `DATABASE_URL` references internal Postgres service.
- **Exports profile (`--profile exports`)**: adds `exporter`, `minio`, and `redis`. Requires S3 credentials; keep Trivy scan results for artefact images in CI (see `.github/workflows/pipeline.yml`).
- **Collab profile (`--profile collab`)**: reserved for future realtime services (e.g., y-websocket). Define variables within this document before enabling.

## Secrets Management Guidance
- Never commit `.env` files. Use `docker compose --env-file path/to/secrets.env up`.
- Recommended secret managers: HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets with SealedSecrets. Align rotation cadence with <security-supply-chain> directives.
- Track data classification per <privacy-and-compliance/>: credentials are **Confidential**; non-sensitive toggles remain **Internal**.

## Health, Observability & Governance
- Health checks rely on `PORT` reaching `/healthz`; update reverse proxies accordingly.
- Structured logs honour `LOG_LEVEL`. To enable OpenTelemetry exporters, define `OTEL_EXPORTER_OTLP_ENDPOINT` and friends here before rollout (future enhancement).
- Record any environment overrides inside the change log and update this document to preserve auditability (<architecture-decisions/>, Decision Log).

## CI/CD Integration
- GitHub Actions pipeline (`.github/workflows/pipeline.yml`) consumes the same Dockerfile, runs `pnpm build`, and executes Trivy scans on both application and exporter images. Ensure secrets are injected via repository or organisation-level secrets (`DATABASE_URL`, `MINIO_*`, etc.) when running deployment stages.
- The pipeline currently fails due to upstream TypeScript build errors (see `packages/compiler` and `packages/snippet-store`); resolve or stub before enforcing required checks.

## Next Steps / TODOs
- Document forthcoming collaboration services (Yjs sync, webhook dispatcher) once specs mature.
- Add guidance for Kubernetes deployment manifests mirroring these variables when Helm charts are introduced.
- Provide sample `secrets.env.example` once baseline defaults are validated and security review approves distribution.

