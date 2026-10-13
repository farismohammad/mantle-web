# Contributing

Mantle Cloud is released independently from the Python CLI. Agent YAML is a
shared contract: changes to validation or defaults should stay aligned with
the CLI model and generated JSON Schema.

## Development

Use Node.js 22.20.0 or newer, npm, Corepack, and Docker for the workflows that
need the local production stack. From this repository:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm build
```

The test suite uses temporary repositories and does not need production data
or credentials. For the real CLI lifecycle, install the separately maintained
[Mantle CLI](https://github.com/farismohammad/mantle) and run its
`scripts/release_acceptance.py` as described in the README; use a new
temporary work directory.

## Releasing

1. Set `version` in `package.json` and move the changelog entry out of "unreleased".
2. Tag and push: `git tag v0.1.0 && git push origin v0.1.0`.
3. The `release` workflow checks the tag matches `package.json`, smoke-tests the
   image with `docker-compose.yml`, pushes `ghcr.io/farismohammad/mantle-web`
   as `0.1.0`, `0.1` and `latest` for linux/amd64 and linux/arm64, and attaches
   `docker-compose.yml` to the GitHub release.

To try a release first, tag a release candidate such as `v0.1.0-rc.1`. It
publishes only `ghcr.io/farismohammad/mantle-web:0.1.0-rc.1` and a GitHub
pre-release, never `0.1` or `latest`; test it with
`mantle cloud start --version 0.1.0-rc.1`. While the package is private, sign
Docker in first: `docker login ghcr.io` with a token that has `read:packages`.

The first time, open the package's settings on GitHub (Packages →
`mantle-web` → Package settings) and set its visibility to **Public** so
anyone can pull it without logging in. The Mantle CLI's `mantle cloud start`
pulls this image, so a new minor version also needs the CLI's pinned tag
(`CLOUD_IMAGE_TAG` in `src/mantle/cloud_server.py`) updated.

## Changes

- Keep validation consistent with the CLI schema and run the drift check when
  changing agent fields.
- Add or update tests for API behavior, validation, and user-visible errors.
- Keep examples free of credentials and private infrastructure details.
- Update the changelog and operator documentation when behavior or deployment
  requirements change.
- Do not commit registry data, local `.env` files, build output, or test evidence.

Contributions are licensed under this repository's Apache-2.0 license. No
contributor license agreement is required.
