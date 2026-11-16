# Domains

Spike: see [the findings log](../../docs/plans/domain-spike-findings.md). This
folder holds Ghost's server code grouped by domain, beside `ghost/core`.

Each folder here is one domain. [`network`](network/CONTEXT.md) is the first.
A domain's files are found by the folder and name they have, when Ghost starts:

| Folder or file                               | What it holds                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `CONTEXT.md`                                 | What the domain owns and the words it uses. Required.                    |
| `actions/`, `data/`, `events/`               | The only folders code outside the domain may import                      |
| `http/`                                      | `routes.ts` (routes as data), endpoints, controllers                     |
| `services/<name>/`                           | A service root (`index.ts`) and its implementation                       |
| `repositories/`, `entities/`, `emails/`      | Stored data, core objects, templates and renderers                       |
| `listeners/`, `jobs/`                        | One file per reaction to an event; background work with its own schedule |
| `settings.ts`, `permissions.ts`, `schema.ts` | Fragments merged into the central registries                             |
| `transition/`                                | Code moved in but not reshaped. Nothing in it is found automatically.    |
| `test/`                                      | `unit/`, `integration/`, `e2e/`                                          |

`manifest.txt` lists every file the domain layer finds. A test fails when the
list changes; run `pnpm --filter ghost domains:list --write` when a change is
intended. `pnpm lint:domain-rules` checks folder shape and file names, and
`pnpm lint:boundaries` checks imports.
