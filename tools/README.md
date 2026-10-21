# Repository tooling

Use `tools/` for shared configuration, repository automation and contributor
commands. Keep build steps and Core policy exports for the `ghost/` server workspace
in `ghost/scripts/`, and installed-release commands in `ghost/bin/`.

## What goes where

Choose the owner by the job and execution environment. A CI caller or a developer
running a script manually does not, by itself, decide ownership.

| Job                                                                                                                       | Home                                         | How it runs                                                |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Reusable lint, test, TypeScript and browser-build presets and rules                                                       | [configs/](configs/README.md)                | Imported by workspace or root configuration                |
| Repository setup, validation, cross-workspace builds, CI reporting, versioning and releases                               | [scripts/](scripts/README.md)                | pnpm/Nx tasks, hooks and workflows                         |
| An interactive contributor task: generating code, previewing email, working with development data or managing a dev stack | [gx/](gx/README.md)                          | `pnpm gx <command>`; existing shortcuts may remain         |
| Build assets, package archives or export Core policy for the `ghost/` server workspace                                    | [ghost/scripts/](../ghost/scripts/README.md) | Ghost build/archive targets and documented export commands |
| A tool that must work against an installed Ghost release without contributor dependencies                                 | [ghost/bin/](../ghost/bin/README.md)         | Direct invocation in the installed tree                    |
| Application or domain behavior used by Ghost itself                                                                       | Its owning app, package or Core subsystem    | Imported by the application; a CLI can call it             |

`tools/configs` defines settings and rules imported by tools, such as ESLint or
Vite. `ghost/scripts` produces assets, release archives or policy exports for the
`ghost/` server workspace. Cross-workspace assembly, such as copying Admin and
Koenig outputs into Ghost, belongs in `tools/scripts/build`. Application policy
belongs in Core; a checkout exporter is executable tooling, not a reusable
development-tool preset.

These rules apply to every directory named `scripts`, including new directories
at any depth. A folder name does not establish an exception.

An app or package's own build/test helpers and local configuration can stay
beside that workspace. Use `tools/` for shared or repository-wide tooling and
contributor commands. A workflow's isolated install boundary can also justify
keeping its tooling local; see the owning README.

Keep command implementations with their owner. A gx wrapper around a developer
command left in an automation folder does not complete a move. Keep underlying
Core logic in Core, and test fixtures beside their tests.

## Shared and private support

Private helpers and tests belong to their tool's owner. In repository automation,
keep genuinely shared helpers in `scripts/lib/` and the suite in `scripts/test/`.
The automation groups in the [scripts README](scripts/README.md#automation-groups)
distinguish CI, build and release responsibilities from root setup/repair tools.

A helper used by both gx and automation can stay in `scripts/lib/`; package
scaffolding and shared development-environment setup are examples. Keep the
dependency direction `gx` → `scripts`. Production Ghost must not require either
private tooling workspace to boot or use its installed tools.

An executable configuration adapter can stay with its analysis tooling. Reserve
`configs/` for reusable configuration and policy; not every object exported for a
tool needs another config workspace.

## Language and execution

New repository automation and gx commands use TypeScript ESM, the shared strict
configuration and the Node version pinned in the repository. TypeScript source
execution and type checking are separate: Node strips erasable types, while the
workspace typecheck validates them. Declare dependencies in the owning workspace;
external versions use the catalog and local packages use `workspace:`.

JavaScript configuration entrypoints and loader adapters can remain JavaScript
where their consumer needs that format. Keep an intentional Bash hook in Bash
when it performs shell/bootstrap work. Ghost's `bin/*.ts` sources are compiled
with Core; its `.mts` build scripts run as ESM source. Follow the owning README
rather than assuming every TypeScript file shares one runtime.

Preinstall and repair tools must remain callable without installed dependencies.
The same applies to direct developer shutdown and private lifecycle hooks. Do not
route those paths through an installed CLI framework just to unify their names.

## Changing a tool

Read its owning README and inspect actual callers before changing its path or
runtime. Callers include package aliases, workflows and sparse checkouts, Nx
inputs, hooks, Docker copies, Renovate commands, tests and documentation.
Path-derived repository roots and private imports also change when a file moves.
Preserve dependency-free entrypoints and any installed-release path contracts.

Run the affected workspace checks and the repository's
[validation workflow](../docs/contributing/testing.md). For a shipped tool,
verify the compiled and packaged entrypoint as well as source execution.

Checkout exports of Core policy for external integrations belong in `ghost/scripts`.
Keep the canonical policy and validation in the owning Core subsystem, with a
thin exporter and a documented output contract. See the
[policy export pattern](../ghost/scripts/README.md#query-parameter-policy-export).
