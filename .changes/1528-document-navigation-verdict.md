### Fixed

- **`@reticlehq/server` — `reticle_act_and_wait` no longer exposes `session disconnected` when the acted-on document navigates away.** A full-page form submission can close the old SDK connection before the action reply arrives; Reticle now treats that known transport loss as an unobserved action and uses its bounded successor observation path without redispatching the action. Closes [#1528](https://github.com/reticlehq/reticle/issues/1528).
