# VibeUnion DevTools

Shared DevTools infrastructure for Svelte applications and SupaCloud.

## Packages

- `@vibeunion/devtools-protocol`: JSON-safe diagnostics, trace metadata,
  snapshots, redaction, and local cache operation types.
- `@vibeunion/devtools-devframe`: Devframe in-page channel helpers for page
  adapters and panels.

The repository owns the shared protocol and transport. Product repositories
should provide adapters rather than copy the contract or Devframe wiring.

## Development

```sh
bun install
bun run test
bun run check
bun run build
```

Cache mutations are intended for local development tooling. Production
operations require a separate authorization and audit path.

Page bridges are disabled by default. Hosts must explicitly pass
`development: import.meta.env.DEV` and call `bridge?.dispose()` on teardown
or hot-module replacement. This flag is an opt-in, not an authorization boundary.

Cache operation types are not implementations: adapters must advertise only
operations they actually support. Clearing a mutation cache does not cancel an
in-flight server write.
