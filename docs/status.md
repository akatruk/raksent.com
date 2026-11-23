# Initial delivery status

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Hardened VPS | BLOCKED | Network restrictions prevented SSH before authentication. No server changes were applied. |
| Corporate website | IN PROGRESS | English pages, theme toggle, SEO, form handling and container definition. Local Node test suite passed. Live ingress and TLS are pending. |
| Client portal MVP | IN PROGRESS | FastAPI, PostgreSQL schema, tenant RBAC and RLS, report export, audit events and a staging dashboard. Integration checks run in Docker-based CI. Managed identity and MFA are pending. |
| Assessment workflow | IN PROGRESS | Authorization and scope records, manual findings, remediation status, reports and engagement templates. |
| CI/CD | IN PROGRESS | GitHub workflow for validation, builds, isolation smoke tests and defensive repository/image checks. Deployment follows the release runbook. |
| Monitoring, logging and paging | IN PROGRESS | Optional Prometheus readiness probes, alert rule and bounded container logs. Host telemetry, external uptime/TLS checks and on-call delivery are pending. |
| IaC | IN PROGRESS | Compose and Ansible staging. Terraform adoption is pending provider and resource identification. |
| Baseline security report | BLOCKED | A read-only inventory collector is available. No host findings were asserted without SSH evidence. |
| Deployment and recovery documentation | DONE | Operations runbook covers staging, rollback, backup verification and recovery. Production recovery drill is pending. |
| Commercial scale plan | DONE | Operations and engagement guides include scaling milestones and pre-launch criteria. Commercial launch and jurisdiction-specific review are pending. |

Local verification covered JavaScript behavior, Python and Bash syntax, and resolved Compose configuration. Live runtime and production acceptance are tracked separately.
