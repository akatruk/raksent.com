# Delivery status

Last reviewed: 2026-11-24.

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Hardened VPS | IN PROGRESS | Baseline audit with Lynis completed, findings reviewed privately outside this repository. Pending security updates applied. Host configuration managed by [site.yml](../infrastructure/ansible/site.yml): checksum-verified runtimes, sandboxed services, ingress access logs, kernel network settings, journal retention and fail2ban for SSH. Network filtering, SSH configuration changes and the kernel reboot await owner approval. |
| Corporate website | IN PROGRESS | Live at https://raksent.com: service catalog, methodology, about, contact, privacy and terms pages, and the assessment form. Each release passes the external production checks. The inquiry email notifier is installed and waits for an SMTP account. Legal review of the privacy notice and terms is pending. |
| Client portal MVP | IN PROGRESS | FastAPI, PostgreSQL schema, tenant RBAC and RLS, report export, audit events and a staging dashboard, with integration and backup-restore checks in CI. Not deployed: managed identity with MFA is pending. |
| Assessment workflow | IN PROGRESS | Authorization and scope records, manual findings, remediation status, reports and engagement templates. Automated scan orchestration is not started. |
| CI/CD | DONE | **Test and scan** runs unit and integration tests, Semgrep, Bandit, pip-audit, shellcheck, an Ansible syntax check, Trivy repository scanning and image scanning. Merges to `main` deploy through the release agent with health checks and automatic rollback. The **Production** workflow confirmed the first automatic release, `824afc2`, from outside. |
| Monitoring, logging and alerting | IN PROGRESS | External availability, redirect, header, TLS and certificate checks every 15 minutes, with GitHub notifications on failure. Ingress access logs and a persistent journal on the host. Host metrics, security event collection and an on-call alert channel are pending. |
| IaC | IN PROGRESS | Ansible owns the production host configuration and was applied to the VPS. Terraform needs API access to the VPS and DNS providers. |
| Baseline security report | DONE | Lynis baseline and findings with severity and remediation plan, kept private. |
| Deployment and recovery documentation | DONE | [Operations runbook](operations.md) covers the release pipeline, rollback, host changes and rebuild. A full rebuild drill has not been performed. |
| Commercial scale plan | IN PROGRESS | Operations and engagement guides include scaling milestones and pre-launch criteria. Legal entity, jurisdiction review, contracts and insurance are pending. |
