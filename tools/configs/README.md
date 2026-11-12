# Shared tooling configuration

Reusable configuration and lint policy for the repository's workspaces. Add
shared conventions here; keep a workspace's small local configuration beside the
workspace and compose the shared factories or presets.

| Directory                   | Purpose                                           | Consumer                                                    |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| [eslint/](eslint/README.md) | Node/library rule factories and shared rule atoms | `@internal/cfg-eslint`                                      |
| `eslint-react/`             | React workspace rule factories                    | `@internal/cfg-eslint-react`                                |
| `oxlint/`                   | Custom lint rules and plugin entrypoints          | Root Oxlint configuration; `@internal/cfg-oxlint` typecheck |
| `test-workers/`             | Worker count for expensive test suites            | `@internal/cfg-test-workers`                                |
| `typescript/`               | Strict ESM and browser compiler presets           | `@internal/cfg-typescript` JSON presets                     |
| `vite-public-app/`          | Shared public-app build setup and declarations    | `@internal/cfg-vite-public-app`                             |
| `vitest/`                   | Shared test configuration                         | `@internal/cfg-vitest`                                      |

Configuration can use JavaScript, JSON, declarations or TypeScript according to
its loader. Custom Oxlint rules and the test worker count are TypeScript; each
private workspace type-checks its own source without adding a build. Use the
[ESLint guide](eslint/README.md) for factory composition, plugin dependency
ownership and Oxlint scope changes.

`oxlint/legacy-services.ts` decides which services are legacy, and so which
roots the `ghost/service-root-shape` rule skips. Boundary lint and the gx service
commands import the same reader, so the rule does not depend on automation.

Use `workspace:` dependencies for shared config packages. Changes to a shared
preset need validation in representative consumers, not just a check of the
configuration itself. Add execution, publishing and reporting scripts to
[repository automation](../scripts/README.md), and contributor commands to
[gx](../gx/README.md). The [tooling ownership guide](../README.md) defines the
boundaries.
