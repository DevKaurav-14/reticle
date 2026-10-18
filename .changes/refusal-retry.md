### Fixed

- **`@reticlehq/server` — the CLI remembered a refused flow set forever.** `.reticle/cloud-state.json` kept the platform's refusal of a flow or capsule set (and of a run) until the item changed. When the platform relaxed its rule, the set stayed refused until you deleted the entry by hand. Each refusal now records the CLI version and the time. The set is offered once more when the CLI version changes or after seven days. A refusal recorded by an older CLI is offered once more on the first sync.
