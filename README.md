# RAKSENT

RAKSENT's corporate website, client portal MVP and VPS operations configuration.

| Component | Entry point |
| --- | --- |
| Website and assessment inquiries | [applications/website](applications/website) |
| Portal UI and FastAPI/PostgreSQL backend | [applications/portal](applications/portal), [applications/api](applications/api) |
| Compose and ingress configuration | [infrastructure/docker](infrastructure/docker) |
| VPS baseline, staging, rollback and recovery | [Operations runbook](docs/operations.md) |
| Scope, findings and launch criteria | [Engagement guide](docs/engagements.md) |
| Verification and outstanding work | [Delivery status](docs/status.md) |

## Validate without a VPS

Use Node.js 24 or later, Python 3.12 and Docker Compose v2 for the complete check.

```sh
bash scripts/validate.sh
docker compose -f infrastructure/docker/compose.yaml config --quiet
```

The validation script runs the website tests and checks Bash, portal JavaScript
and Python syntax. CI uses the same script before its Docker integration checks.

For a local website preview:

```sh
mkdir -m 700 -p var/leads
PUBLIC_ORIGIN=http://127.0.0.1:8080 LEAD_DIR="$PWD/var/leads" node applications/website/server.mjs
```

Open [the local preview](http://127.0.0.1:8080). Use synthetic inquiries in development.

## Architecture

The website uses server-rendered HTML on Node's standard HTTP server. This keeps public pages, forms and SEO metadata in a single deployable service with zero npm dependencies. The portal uses a small static client and a separate FastAPI service. PostgreSQL is private to that service and enforces tenant isolation with row-level security. Compose allows each component to start independently on a single VPS. Prometheus and Blackbox Exporter provide opt-in website readiness monitoring.

Website and portal listeners are bound to loopback in the Compose configurations. Only the website has an example public ingress. Keep the portal private and synthetic until managed identity with MFA, backups and end-to-end checks are complete.
