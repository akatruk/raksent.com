# VPS operations

## Production layout

Caddy terminates TLS with Let's Encrypt certificates, redirects `www` and HTTP to `https://raksent.com`, and proxies to the website on `127.0.0.1:18080`. Both run as sandboxed systemd services under dedicated system users. Caddy writes JSON access logs to `/var/log/caddy` and keeps them for 14 days. The website stores inquiries as private files in `/var/lib/raksent/leads`.

Each release lives in `/opt/raksent/releases/<commit>`. The `/opt/raksent/current` link points at the active release, and its `release.env` sets the revision reported at `/version`. Node.js and Caddy are pinned and checksum-verified in [site.yml](../infrastructure/ansible/site.yml), which also owns the units, Caddyfile, kernel network settings, journal retention and the release agent.

## Read-only baseline

1. Confirm the VPS login name with the provider or existing SSH configuration. Obtain the SSH host-key fingerprint from the provider console through a trusted channel. Check any existing entry with `ssh-keygen -F <host>`.
2. Open a separate session with `ssh -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=5 <ssh-alias> true`. If initial key authorization is needed, preserve the working admin session, append only the verified public key to the intended user's existing `authorized_keys`, and test a second session before closing the original. Preserve all other credentials and SSH settings.
3. From the repository root, collect the inventory. Keep the report private.

   ```sh
   umask 077
   mkdir -p audit-output
   ssh -T -o StrictHostKeyChecking=yes -o BatchMode=yes <ssh-alias> 'bash -s' \
     < scripts/inventory.sh > audit-output/host-inventory.txt 2>&1
   ```

4. Match listening sockets to ingress, app and database owners. Review firewall and provider-side ACLs, effective SSH policy, pending updates, recent service warnings, scheduled jobs, active data volumes and backup ownership. Run `lynis audit system` for a scored baseline and review its report privately.

Record host, check time in UTC, commands, observed state, exceptions, impact and remediation. Assign `critical` for verified immediate severe impact, `high` for significant exposure, `medium` for material weaknesses with preconditions, and `low` for limited impact. Secrets, network detail, audit results and server outputs stay out of this public repository.

## Release pipeline

1. A change reaches `main` through a pull request. **Test and scan** runs on the pull request and again on the push to `main`.
2. `raksent-deploy.timer` runs `/usr/local/sbin/raksent-deploy` every two minutes. The agent reads the `main` commit from the GitHub API and deploys it only after the **Test and scan** run for that push succeeded. It downloads the source archive, rejects it unless the embedded commit ID matches, unpacks only regular files and directories, and syntax-checks the website. Then it switches `current`, restarts the website and waits for `/readyz` and `/version` to report the commit. If that fails, it restores the previous release and blocks the commit until `main` moves on. The host needs outbound HTTPS to GitHub only; CI holds no credentials for the VPS.
3. The **Production** workflow waits until `https://raksent.com/version` serves the commit, then runs [check-production.sh](../scripts/check-production.sh). The check covers pages, the inquiry form, redirects, security headers, TLS 1.2/1.3 only and certificate lifetime. The same checks run every 15 minutes, and GitHub notifies the repository owner when a run fails.

Operator commands on the VPS:

| Task | Command |
| --- | --- |
| Show deployed, previous and blocked releases | `raksent-deploy --status` |
| Agent history | `journalctl -u raksent-deploy` |
| Return to the previous release and block the current commit | `raksent-deploy --rollback` |
| Deploy a specific commit with a successful CI run | `raksent-deploy --release <40-character SHA>` |
| Pause or resume automatic releases | `systemctl stop raksent-deploy.timer`, `systemctl start raksent-deploy.timer` |

A rollback holds until a new commit lands on `main`. A revert on `main` is the durable fix.

## Host changes

Host configuration changes go through [site.yml](../infrastructure/ansible/site.yml). Keep the real inventory in the ignored `infrastructure/ansible/inventory.ini` (see the [example](../infrastructure/ansible/inventory.example.ini)). Review the diff before applying it:

```sh
ansible-playbook -i infrastructure/ansible/inventory.ini infrastructure/ansible/site.yml --check --diff
ansible-playbook -i infrastructure/ansible/inventory.ini infrastructure/ansible/site.yml
```

The playbook validates the Caddyfile before installing it, restarts only the services whose configuration changed, and then checks the website on loopback and HTTPS through Caddy. It does not change SSH, firewall rules or DNS; those changes need a separate reviewed plan with a recovery session.

## Local and CI stack

The Compose files in [infrastructure/docker](../infrastructure/docker) run the website, portal and PostgreSQL for local development and CI integration tests. Start the portal only in a private environment. Set separate random admin and app DB passwords in the ignored environment file; the database has no published port.

```sh
docker compose --env-file infrastructure/docker/.env \
  -f infrastructure/docker/compose.yaml -f infrastructure/docker/portal.compose.yaml up -d --wait portal
```

Staging access is through a trusted local session or SSH forwarding to port 18081. Create a tenant and membership through a trusted operator session in PostgreSQL and store the SHA-256 digest of a random 32-byte URL-safe token in `portal.memberships.token_hash` with a short expiration. Raw tokens stay outside the database and logs. See `tests/portal_smoke.py` for the synthetic setup. Customer access requires managed identity with MFA, account lifecycle and explicit tenant mapping.

## Rollback and recovery

- **Website release:** `raksent-deploy --rollback`, then revert the change on `main`. Lead files are outside release directories and are not touched.
- **Caddy binary:** the binary that was active before Ansible managed the runtime is kept as `/opt/raksent/runtime/caddy-previous`. Restore it with `ln -sfn caddy-previous /opt/raksent/runtime/caddy && systemctl restart caddy`.
- **Host configuration:** revert the change in Git and apply `site.yml` again.
- **Rebuild the VPS:** install Ubuntu 22.04 or later with the admin SSH key, add the inventory, run `site.yml`, then `systemctl start raksent-deploy` to fetch the current `main` release. Point the `A` records for `raksent.com` and `www.raksent.com` at the new address; Caddy obtains certificates once DNS resolves. Inquiry files are lost unless they were copied off the host first; an encrypted off-host backup of `/var/lib/raksent/leads` is still pending.
- **Portal database (when deployed):** back up with `pg_dump -Fc` under the backup role, encrypt before sending to private off-host storage, and verify by restoring into an isolated scratch database. Confirm measured RPO and RTO before promising either. Never perform a restore drill over live data.
- **Readiness incident:** check `systemctl status raksent-website caddy`, `journalctl -u raksent-website -n 50` and `curl -s http://127.0.0.1:18080/readyz`. Check the lead directory permissions and free disk. If loopback is healthy, inspect Caddy and TLS. Record UTC timestamps and keep customer data out of incident tickets.

## Hardening sequence

Plan one reversible change at a time. Prepare a separate recovery session for access or network changes, record the prior configuration and get approval before applying potentially disruptive changes. Test externally after changes to DNS, ingress or firewall.

## Scale and commercial cutover

Start with the public website and health checks on the VPS. Separate client data and identity from public marketing as soon as client onboarding starts. Move PostgreSQL and encrypted evidence to managed or dedicated services when availability or access requirements warrant it. Separate monitoring if the VPS cannot retain operational data reliably. Add redundant ingress, recovery replicas and dedicated audit logging when measured load or customer SLAs justify them.
