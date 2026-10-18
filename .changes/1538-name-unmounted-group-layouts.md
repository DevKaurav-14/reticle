### Changed

- **`@reticlehq/init` — `reticle init` names the route-group root layouts it left without `<ReticleDev />`.** In a Next.js app whose root layouts live in route groups, init mounts ReticleDev in one of them (the one that renders `/`), and each root layout renders only its own routes, so the routes under the others went unobserved with nothing in the report saying so. A notice now names those layouts so they can be mounted too. Follows [#1574](https://github.com/reticlehq/reticle/pull/1574).
