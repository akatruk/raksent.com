# VPS infrastructure ownership

Import the existing VPS and DNS records into Terraform after the provider and resource identifiers have been verified. Adopt resources in place and require an import-only review before enabling reconciliation. Keep state in a private encrypted backend with locking and access logging. Do not put state, identity keys, provider credentials or plan artifacts in this repository.

There is no provider configuration until infrastructure discovery identifies the VPS, DNS and backup providers. Release staging on the existing machine is handled by Ansible and Compose.
