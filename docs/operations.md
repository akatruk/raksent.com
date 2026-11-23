# VPS operations

## Read-only baseline

1. Confirm the VPS login name with the provider or existing SSH configuration. Obtain the SSH host-key fingerprint from the provider console through a trusted channel. Check any existing entry with `ssh-keygen -F <host>`. Review the local public identity with `ssh-keygen -lf ~/.ssh/id_ed25519.pub` if it is the chosen key.
2. Open a separate session with `ssh -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=5 <ssh-alias> true` after independently verifying the host fingerprint and establishing trust. If initial key authorization is needed, preserve the working admin session, append only the verified public key to the intended user's existing `authorized_keys`, and test a second session before closing the original. Preserve all other credentials and SSH settings.
3. From the repository root, collect the inventory. Keep the report private.

   ```sh
   umask 077
   mkdir -p audit-output
   ssh -T -o StrictHostKeyChecking=yes -o BatchMode=yes <ssh-alias> 'bash -s' \
     < scripts/inventory.sh > audit-output/host-inventory.txt 2>&1
   ```

4. Match listening sockets to ingress, app and database owners. Review firewall and provider-side ACLs, effective SSH policy, pending updates, recent service warnings, scheduled jobs, active data volumes and backup ownership. Confirm TLS issuers and expiry using certificate metadata. Review actual backup success and a restore result.
5. The inventory uses existing commands and the existing APT cache. Missing commands and denied privileged reads appear in its output. Confirm Lynis is already available before deciding whether to run a full audit. Lynis creates audit output on the host, so keep it outside the initial read-only inventory and review the output privately.

Record host, check time in UTC, commands, observed state, exceptions, impact and remediation. Assign `critical` for verified immediate severe impact, `high` for significant exposure, `medium` for material weaknesses with preconditions, and `low` for limited impact. Record missing evidence separately. Secrets, network detail and server outputs stay out of this public repository.

## Stage and release

1. Use an immutable checkout of a passing release. Record its commit SHA, current ingress configuration and prior container image digests. Confirm free CPU, memory, disk, ingress ownership and unused loopback ports. Prefer Docker Engine 28 or later for loopback port isolation.
2. Copy `infrastructure/docker/.env.example` to `infrastructure/docker/.env` with permissions 0600. Start only the website initially.

   ```sh
   cd infrastructure/docker
   docker compose config --quiet
   docker compose up -d --build --wait website
   curl --fail --silent http://127.0.0.1:18080/readyz
   ```

   Ansible equivalents are in [stage-website.yml](../infrastructure/ansible/stage-website.yml). Use the existing trusted SSH identity and a release checkout already on the host. Test dark and light themes, mobile navigation, HTTPS, the canonical domain redirect and a synthetic inquiry. Confirm controlled access to each lead and assign an owner to review new submissions. The website stores submissions in the `leads` volume. Enable it for real inquiries after retention, a lead notification channel and the privacy notice have been reviewed.
3. Review changes to ingress with the owner of the existing listener. Merge [the ingress example](../infrastructure/docker/Caddyfile.example) if Caddy is the installed proxy. Validate the full configuration before a controlled reload. Verify HTTPS from a separate connection and check which upstream receives the traffic.
4. Start monitoring after confirming headroom. Run from the repo root.

   ```sh
   docker compose --env-file infrastructure/docker/.env \
     -f infrastructure/docker/compose.yaml -f monitoring/compose.monitoring.yaml up -d
   ```

   Prometheus evaluates website readiness alerts and stays on loopback. Route alerts to the approved receiver and verify a synthetic notification before relying on paging. Add external uptime and certificate-expiry checks, resource metrics, host security telemetry and centralized logs according to the observed VPS limits and existing agents.
5. Start the portal only when needed in a private environment. Set separate random admin and app DB passwords in the ignored environment file. The database has no published port.

   ```sh
   docker compose --env-file infrastructure/docker/.env \
     -f infrastructure/docker/compose.yaml -f infrastructure/docker/portal.compose.yaml up -d --wait portal
   ```

   Staging access is through a trusted local session or SSH forwarding to port 18081. Supply the token via a private approved channel. Create a tenant and membership through a trusted operator session in PostgreSQL and store the SHA-256 digest of a random 32-byte URL-safe token in `portal.memberships.token_hash` with a short expiration. Raw tokens stay outside the database and logs. See `tests/portal_smoke.py` for the synthetic setup. For customer access use managed identity with MFA, account lifecycle and explicit tenant mapping. The current bootstrap SQL runs on a fresh database volume. Changes to existing schemas require reviewed migrations.

## Rollback and recovery

- Keep the previous validated ingress configuration and application image or immutable checkout. On release failure, restore the prior ingress route and recreate the app from the previous image or checkout. Check health and synthetic inquiries afterward. Keep the data volumes during release rollback.
- Back up the PostgreSQL database with `pg_dump -Fc` under the backup role. Protect role and membership recovery material as securely as the database. Capture the website lead volume separately. Encrypt before sending to private off-host storage. Monitor the age, size and exit status of successful backup jobs.
- Verify backups by restoring into an isolated scratch database and filesystem. Check schema, record counts, tenant boundaries and availability of ciphertext keys. Confirm measured RPO and RTO before promising either. Never perform a restore drill over live data.
- For a readiness incident, inspect `docker compose ps` and limited recent logs. Check website health from loopback, the lead directory permissions and available disk. If readiness passes locally, inspect the existing proxy route and TLS. Record UTC timestamps and avoid including customer data in an incident ticket.

## Hardening sequence

After the inventory, review patch windows, firewall and provider security groups, service privileges, failed login visibility, persistent audit logs, file integrity monitoring, container restrictions and back-up coverage. Plan one reversible change at a time. Prepare a separate recovery session for access or network changes, record the prior configuration and get approval before applying potentially disruptive changes. Test externally after changes to DNS, ingress or firewall.

## Scale and commercial cutover

Start with public website and health checks on the VPS. Separate client data and identity from public marketing as soon as client onboarding starts. Move PostgreSQL and encrypted evidence to managed or dedicated services when availability or access requirements warrant it. Separate monitoring if the VPS cannot retain operational data reliably. Add redundant ingress, recovery replicas and dedicated audit logging when measured load or customer SLAs justify them.
