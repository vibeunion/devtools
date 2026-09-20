# VibeUnion DevTools

Shared DevTools infrastructure for Svelte applications and SupaCloud.

## Packages

- `@vibeunion/devtools-protocol`: JSON-safe diagnostics, trace metadata,
  snapshots, redaction, and the complete local cache mutation contract.
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
