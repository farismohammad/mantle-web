# Third-party dependency license inventory

Audit snapshot: 2026-10-01.

This inventory covers the direct and transitive dependency graphs for Mantle
Cloud 0.1.0. The counts below use the final `pnpm-lock.yaml`; license metadata
was read from the exact matching package manifests in the installed Linux x64
package tree. Optional builds for other platforms that were not installed are
reported separately. This is a source inventory, not legal advice or a
compatibility certification.

## Runtime dependencies

| Dependency | Locked version | License metadata |
| --- | ---: | --- |
| @codemirror/lang-yaml | 6.1.2 | MIT |
| @codemirror/language | 6.12.4 | MIT |
| @codemirror/state | 6.5.2 | MIT |
| @codemirror/view | 6.38.2 | MIT |
| @lezer/highlight | 1.2.3 | MIT |
| @uiw/react-codemirror | 4.24.1 | MIT |
| ajv | 8.20.0 | MIT |
| lucide-react | 0.542.0 | ISC |
| next | 15.5.24 | MIT |
| react | 19.1.4 | MIT |
| react-dom | 19.1.4 | MIT |
| yaml | 2.8.3 | ISC |

## Fonts

`next/font/google` downloads these at build time and the application serves
them itself; browsers make no requests to Google.

| Font | License |
| --- | --- |
| Cal Sans (The Cal Sans Project Authors) | SIL Open Font License 1.1 |
| Inter (The Inter Project Authors) | SIL Open Font License 1.1 |
| JetBrains Mono (The JetBrains Mono Project Authors) | SIL Open Font License 1.1 |

## Development dependencies

| Dependency | Locked version | License metadata |
| --- | ---: | --- |
| @eslint/eslintrc | 3.3.1 | MIT |
| @types/node | 22.18.0 | MIT |
| @types/react | 19.1.12 | MIT |
| @types/react-dom | 19.1.9 | MIT |
| eslint | 9.34.0 | MIT |
| eslint-config-next | 15.5.22 | MIT |
| typescript | 5.9.2 | Apache-2.0 |
| vitest | 4.1.11 | MIT |

## Transitive packages

The lockfile contains 85 runtime and 426 development package variants, with
some overlap. The installed Linux x64 tree provided license metadata for 56
runtime and 327 development variants. The remaining 29 runtime and 99
development variants are optional builds for other operating systems,
architectures, or libc targets and were not installed for this review.

The installed runtime graph has these license counts: 41 MIT, 5 Apache-2.0,
4 ISC, 2 BSD-3-Clause, 2 LGPL-3.0-or-later, 1 0BSD, and 1 CC-BY-4.0. The
development graph also contains `axe-core` 4.12.1 under MPL-2.0; it is not in
the runtime dependency graph.

The runtime graph includes Next's optional `sharp` 0.35.5 (Apache-2.0). Its
`@img/sharp-libvips-linux-x64` and
`@img/sharp-libvips-linuxmusl-x64` 1.3.4 binaries report
LGPL-3.0-or-later. The current standalone artifact and Alpine production image
contain both x64 libvips artifacts. The image copies the Apache-2.0 and
LGPL-3.0 and GPL-3.0 license texts into `/app/licenses`; the LGPLv3 terms
incorporate GPLv3 terms. `licenses/THIRD_PARTY_NOTICES.md` identifies the
binary versions and upstream sources, and exact `versions.json` manifests for
both bundled variants are also copied there. Those manifests enumerate native
components but do not provide their full per-component notices. These native
components have not been independently license-audited, and applicable LGPL
source, relinking, or corresponding-source duties have not been certified.
Review those obligations before external image distribution. Preserve
`/app/licenses` and the package manifests when distributing the image. The
development-only `axe-core` package is excluded from the runtime image.

The audit excludes the Node.js runtime, Docker base image, user-supplied agent
resources and MCP servers, and optional package builds for platforms that
were not installed for this review. Check licenses in the exact final image
before redistribution.
