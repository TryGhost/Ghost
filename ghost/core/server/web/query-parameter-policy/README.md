# Query-parameter policy

[policy.json](policy.json) is Ghost's canonical query-parameter allowlist.
[schema.ts](schema.ts) validates it, and [index.ts](index.ts) exposes the validated
policy to Core. The filtering middleware uses it in development and tests.
External infrastructure can import an export of the same policy; exporting it
alone does not update any external allowlist.

## Export contract

From a bootstrapped source checkout, run at the repository root:

```sh
pnpm query-parameter-policy:export --output /tmp/query-parameter-policy.json
```

The [exporter](../../../../scripts/export-query-parameter-policy.ts) runs through
`tsx`, validates the canonical policy and writes UTF-8 JSON. `--output` (or `-o`)
is required and resolves relative to the command's working directory; the command
runs in `ghost/` through the package alias. Missing parent directories are created
and an existing output file is overwritten. Invalid policy or arguments fail the
command. The exporter is not included in installed Ghost releases.

Schema version `1` contains `public` and `contentApi` arrays of `{name, reason}`
entries. Names must be nonempty, use only letters, underscores and hyphens, and
be unique within each list. Reasons must contain non-whitespace text. Unknown
object fields are omitted by validation. Array order is preserved; JSON uses
four-space indentation and a trailing newline. Unchanged input produces identical
bytes.

Consumers should check `schemaVersion` before interpreting the output. Coordinate
incompatible schema changes with consumers and introduce a new schema version.
Changes to allowed parameters must also reach any external filtering systems;
that synchronization is separate from this export command.

## Validation

The [policy tests](../../../../test/unit/server/web/query-parameter-policy.test.ts)
cover schema validation. The
[exporter test](../../../../test/unit/scripts/export-query-parameter-policy.test.ts)
runs the command, checks the canonical content and compares repeated exports
byte for byte. Both run in Ghost's unit suite. `pnpm --filter ghost test:types`
also checks the exporter without compiling it into the release.
