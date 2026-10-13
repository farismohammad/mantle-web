# Changelog

Mantle Cloud is released independently from the Python CLI.

## 0.1.0 (2026-10-13)

- Add a self-hosted registry for agent YAML and immutable configuration
  revisions.
- Add validation, formatting, and the CLI API for explicit push, pull, and
  update workflows.
- Add searchable agent pages, revision history, and an editable configuration
  interface.
- Keep execution, installed resources, authentication, context, and sessions
  on the user's machine.
- Use the Mantle design language shared with the Mantle website, in a soft
  dark theme: a charcoal canvas with Cal Sans headlines, off-white actions,
  slightly lighter cards, a darker footer, and a flat Mantle mark. Fonts are
  self-hosted.
- Publish a multi-architecture image to `ghcr.io/farismohammad/mantle-web`
  from version tags, and attach `docker-compose.yml` to each GitHub release.
  The Compose file runs the published image (`MANTLE_CLOUD_VERSION`
  selects the tag); `compose.build.yaml` builds from source instead.
- Show CLI commands on agent pages and the empty registry.
