# Runtime third-party notices

The registry runtime includes `sharp` 0.35.5, licensed under Apache-2.0, and
the prebuilt `@img/sharp-libvips-linuxmusl-x64` and
`@img/sharp-libvips-linux-x64` 1.3.4 packages, marked LGPL-3.0-or-later.
The corresponding license texts are in this directory.
Because LGPL-3.0 incorporates GPL-3.0 terms, both full license texts are
included here. The sharp license is Apache-2.0.

The libvips binaries identify libvips 8.18.7. The package build scripts and
exact bundled dependency versions are published by the binary packager at
<https://github.com/lovell/sharp-libvips/tree/v1.3.4>; the libvips source is
published at <https://github.com/libvips/libvips/tree/v8.18.7>. The sharp
source is published at <https://github.com/lovell/sharp/tree/v0.35.5>.
Exact `versions.json` manifests for both shipped x64 variants are preserved as
`sharp-libvips-linuxmusl-x64-versions.json` and
`sharp-libvips-linux-x64-versions.json`. They enumerate the bundled native
components and versions.

These files preserve upstream provenance, but the manifests do not replace
per-component license notices. The license terms for every native component
listed in those manifests have not been independently audited here. Before
external image distribution, review the exact bundle's notice obligations and
any applicable LGPL source, relinking, or corresponding-source requirements.
Preserve this directory and the package's original manifests when distributing
the image.
