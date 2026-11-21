# Library feedback

This document records concrete behavior observed while integrating
`@lib-core-mfe/module-frontend` v0.2.0 and, after
[ADR-0005](./adr/0005-fragment-frontend-runtime.md),
`@lib-core-mfe/fragment-frontend` v0.1.0. It distinguishes missing capabilities
from defects; the library itself is not modified in this repository.

## Static manifest generation

- **Tried:** use the library's manifest configuration during the remote build
  so each static provider can publish a manifest without a server-side
  runtime.
- **Expected:** a documented builder or CLI emits the same version,
  integrity, and module contract consumed by `<Module>`.
- **Observed:** the package exposes `serveModules` as Node middleware, but no
  static manifest-generation API. Reimplementing the output would duplicate
  the library's version and SRI behavior.
- **Project workaround:** run `serveModules` in a Vercel Node Function per
  provider. The function includes the built module assets and restricts CORS
  with `MFE_HOST_ORIGINS`; see
  [ADR-0003](./adr/0003-module-manifest-delivery.md).
- **Suggested library improvement:** expose a supported build-time manifest
  generator, or document a static deployment contract that preserves the
  runtime's version and integrity semantics.

## fragment-frontend v0.1.0

- **Client-only Consumer:** `FragmentSlot` hydrates markup that is already in
  the page and has no client-render fallback, although the registered entry
  exposes `mount`. A Consumer without a server needs its own server endpoint to
  obtain the HTML (see ADR-0005). **Suggested improvement:** let `FragmentSlot`
  call `mount` when no server markup is present.
- **Interactivity gap:** the fragment is visible before its bundle hydrates, and
  there is no signal in the markup that it is not yet interactive. The E2E
  tests wait for the Host's ready mark.
- **Styles:** CSS is not part of the streamed fragment, so server markup is
  unstyled until the Provider's client bundle injects it.
