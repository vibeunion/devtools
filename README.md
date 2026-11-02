# VibeUnion DevTools

Shared DevTools infrastructure for Svelte applications and SupaCloud.

## Packages

- `@vibeunion/devtools-protocol`: JSON-safe diagnostics, trace metadata,
  snapshots, redaction, cache operation types, the svadmin snapshot shape,
  and Vibe Coding inspection/patch contracts (`vibe.inspect`, `vibe.patch`,
  `ResourcePatch`, `SelfHealingReport`).
- `@vibeunion/devtools-devframe`: Devframe in-page channel helpers for page
  adapters and panels. `installPageScriptBridge` and `installDevtoolsPageBridge`
  share the transport lifecycle (SSR guard, development opt-in, dispose-on-reinstall,
  global registration) for adapters, supporting snapshot inspection, cache actions,
  and agent writeback patches (`applyPatch`).
- `@vibeunion/devtools-supacloud`: SupaCloud compiler/task adapters that map
  SupaCloud payloads into the shared protocol.

The repository owns the shared protocol and transport. Product repositories
should provide adapters rather than copy the contract or Devframe wiring.

## Consumers

`@vibeunion/devtools-protocol` is the single source of truth for the DevTools
contract:

- `@svadmin/devtools-contract` re-exports it so the svadmin ecosystem keeps its
  published entry point without owning a second copy.
- `@supacloud/devtools-contract` is being folded into the same re-export once the
  outstanding branch is merged.

Product-specific diagnostics (svadmin provider/resource/route/permission
inspection, SupaCloud compiler/task mapping) stay in their owning repositories
and only depend on the shared contract.

## Development

```sh
bun install
bun run test
bun run check
bun run build
```

## Release

Push a `vX.Y.Z` tag to build and publish all three packages to npm, then create
a GitHub Release with generated notes. Configure GitHub Actions as a trusted
publisher for each `@vibeunion` package on npm; the workflow uses npm OIDC and
does not require an `NPM_TOKEN` secret. The workflow can also be started
manually with a version number.

Cache mutations are intended for local development tooling. Production
operations require a separate authorization and audit path.

Page bridges are disabled by default. Hosts must explicitly pass
`development: import.meta.env.DEV` and call `bridge?.dispose()` on teardown
or hot-module replacement. This flag is an opt-in, not an authorization boundary.

Cache operation types are not implementations: adapters must advertise only
operations they actually support. Clearing a mutation cache does not cancel an
in-flight server write.
