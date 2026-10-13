# Security policy

Mantle Cloud has no accounts, authentication, or ownership checks. Every
client that can reach an instance can read, create, edit, and delete every
stored agent configuration. Bind it to loopback or a trusted network, or put
it behind a trusted reverse proxy that enforces access control. Do not expose
an unprotected instance to the public Internet.

Cloud stores the full `agent.yaml` content. Never put secret values,
credentials, or private keys in agent YAML. The CLI keeps those values in the
local Mantle home and does not upload them.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. If
private reporting is unavailable, contact a repository maintainer through
GitHub and ask for a private reporting channel. Do not post credentials,
exploit details, or unpatched vulnerability reports in a public issue.

Include the affected version, impact, and reproduction steps. Remove
credentials and personal data from logs or reproduction files. Security fixes
are published through this repository's release notes.
