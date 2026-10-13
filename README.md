# Mantle Cloud

A lightweight, account-free registry for Mantle agent configurations. Browse agents,
inspect their runtime and resource sources, copy CLI commands, and explore immutable
YAML revisions. Agents execute on your machine; Cloud stores only `agent.yaml`.

## Run it

The quickest way, if you use the [Mantle CLI](https://github.com/farismohammad/mantle):

```bash
mantle cloud start      # pulls the image, starts it, connects the CLI and prints the URL
mantle cloud logs       # server output (-f to follow)
mantle cloud stop       # stop; your agents are kept
```

`mantle cloud start` needs Docker with Compose v2 and accepts `--port` and `--version`.

## Host with Docker Compose

Each release publishes a multi-architecture image (linux/amd64 and linux/arm64) to
`ghcr.io/farismohammad/mantle-web` and attaches `docker-compose.yml` to the
GitHub release. No checkout or build is needed:

```bash
curl -fsSLO https://github.com/farismohammad/mantle-web/releases/latest/download/docker-compose.yml
docker compose up -d
```

Open **http://localhost:3100**. Compose binds only to loopback.

- `MANTLE_PORT` changes the host port (default `3100`). Set it in `.env` or your shell.
- `MANTLE_CLOUD_VERSION` selects the image tag (default `0.1`, which follows 0.1.x patch
  releases). Pin an exact release such as `0.1.0`, or move to a newer minor version
  deliberately: `MANTLE_CLOUD_VERSION=0.2 docker compose up -d`.
- `docker compose pull && docker compose up -d` takes the newest patch of that version.
- One `mantle-cloud` container serves the production Next.js frontend and API.
- The named `mantle_data` volume persists `/data` across upgrades and recreation.
- The container runs as a non-root user and restarts unless stopped.
- `/v1/health` checks repository access; Compose polls it after a startup grace period.

```bash
docker compose ps
docker compose logs --tail 50
docker compose down       # stop; retain data
```

`docker compose down -v` deletes the volume and all revisions. Back up the volume
before removing it. Use one application instance per volume: mutation serialization
is in-process, not a distributed lock.

To serve it to other machines, change the port mapping to `"${MANTLE_PORT:-3100}:3000"`
and put an authenticating, TLS-terminating reverse proxy in front of it. Read the
warning about access below first.

### Build from source

```bash
docker compose -f docker-compose.yml -f compose.build.yaml up --build -d
```

The override tags the build `mantle-cloud:dev`, so it never replaces the published image.

## CLI lifecycle

First install the separate [Mantle CLI](https://github.com/farismohammad/mantle)
using its README. Then:

```bash
mantle cloud connect    # finds http://localhost:3100 (not needed after mantle cloud start)
mantle agent create my-agent --description "My development agent"
# Edit ~/.mantle/agents/my-agent/agent.yaml or add resources with the CLI.
mantle cloud push my-agent
# In another MANTLE_HOME or on another machine:
mantle cloud pull my-agent
# After editing and pushing an updated configuration:
mantle cloud update my-agent
```

`pull` sets up an agent that isn't on this machine yet; `update` reconstructs an
agent you already have from the latest Cloud revision. An update
preserves local context, sessions, logs, and Pi authentication. It replaces declarative
configuration/resources, so push any local changes you want to keep first.

Skills and packages are installed from their declared upstream sources. Pin versions
in source references such as `npm:pi-lens@4.2.1`; non-null separate resource
`version` fields are rejected because they were never enforced. Move an old version
value into its source reference. Local skill sources work on the same machine
but require an accessible source path on any other machine.

## Pages

- `/`: primary searchable registry, sorted by recent updates or name.
- `/agents`: alternate route to the same registry.
- `/agents/NAME`: resources, model/permissions, exact highlighted YAML, pull/update commands,
  revision history, and configuration change summaries.
- `/agents/NAME?revision=N`: immutable historical configuration. CLI pull/update still
  retrieve the latest revision; there is no revision rollback command.
- `/editor`: existing create/edit/format/delete workflow, with validation and history.

No account or ownership system is introduced. **Anyone who can reach this instance can
read, modify, or delete any agent.** The local Compose default is suitable for development
and trusted use. Internet-wide anonymous write access would need a separate moderation,
abuse-control, and recovery design. Never put credential values in YAML: the full YAML
is shared. `.env`, runtime files, installed resources, and sessions are not uploaded.

## Storage and API

```text
MANTLE_DATA_DIR/
└── frontend-web/
    ├── 0001.yaml
    ├── 0002.yaml
    └── 0003.yaml
```

Changed YAML creates a new immutable revision. Byte-identical YAML reuses the latest
revision; comments or formatting changes count as new revisions. API configuration
objects include CLI defaults, while the stored/pulled YAML stays byte-for-byte exact.
Times are derived from revision file modification times; preserve those when restoring
backups. A corrupt stored revision surfaces a recoverable error rather than an empty list.

Responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "details" } }`.
Writes, validation, and formatting all enforce a 1 MB body limit.

```text
GET    /api/agents
GET    /api/agents/:name
PUT    /api/agents/:name                 raw application/yaml body
DELETE /api/agents/:name
GET    /api/agents/:name/revisions
GET    /api/agents/:name/revisions/:number
POST   /api/validate                     validate raw YAML
PUT    /api/validate                     validate and format raw YAML
GET    /v1/health
```

The JSON Schema at `src/schema/agent.schema.json` is generated from the CLI Pydantic
model by running `uv run python scripts/export_schema.py` from the CLI checkout.
Pass `--output /path/to/mantle-web/src/schema/agent.schema.json` to select
this repository's schema file.
The CLI tests check drift when this companion repository is present.
Cloud also checks resource uniqueness and MCP cross-field rules that JSON Schema
cannot represent. Installation still depends on upstream source availability.

## Development and regression checks

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev                       # development port 3000
corepack pnpm check                     # lint, types, domain/repository/API tests
corepack pnpm build
```

Development defaults to `data/repository`; set `MANTLE_DATA_DIR` to override it.
Do not point development or tests at your production volume.

The release acceptance test lives in the CLI repository. It requires a disposable
local Docker stack, Node/npm, Git, and network access for Pi/skills/npm dependencies:

```bash
# From this registry checkout:
MANTLE_PORT=3317 docker compose -p mantle-release-check -f docker-compose.yml \
  -f compose.build.yaml up --build -d
# From the separate CLI checkout:
python3 scripts/release_acceptance.py --registry-url http://127.0.0.1:3317 \
  --work-dir /tmp/mantle-release-acceptance
```

Use a fresh temporary work directory for each run. The script installs the CLI for
two independent users and uses unique agent names. It executes real Pi against a
deterministic local model fixture, installs skills/packages, checks isolation, compares
exact YAML/history, verifies explicit pushes and updates, and exercises common errors.
Command/result evidence is retained under the work directory. It does not delete
existing registry data. See the CLI's contribution guide for details.

The project is [Apache-2.0 licensed](LICENSE). See the
[dependency inventory](THIRD_PARTY_LICENSES.md) and `licenses/` for third-party
components included in the Docker image.
