### Fixed

- **`@reticlehq/browser`, `@reticlehq/server` — an app that calls `connect()` itself lost its project id after `reticle init`.** The app's own `connect()` ran first and sent `HELLO` without an id. The build plugin's `connect({ projectId })` came later and was ignored, so every session of that app went to `~/.reticle/unmatched/`. A later `connect()` that names a project now announces it on the live socket, and the bridge moves the session's evidence into that project. A page that already declared a project keeps it.
