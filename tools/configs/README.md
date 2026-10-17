# Shared tooling configuration

Reusable configuration and lint policy for the repository's workspaces. Add
shared conventions here; keep a workspace's small local configuration beside the
workspace and compose the shared factories or presets.

| Directory                   | Purpose                                           | Consumer                                                    |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| [eslint/](eslint/README.md) | Node/library rule factories and shared rule atoms | `@internal/cfg-eslint`                                      |
| `eslint-react/`             | React workspace rule factories                    | `@internal/cfg-eslint-react`                                |
| `oxlint/`                   | Custom lint rules and plugin entrypoints          | Root Oxlint configuration; `@internal/cfg-oxlint` typecheck |
| `typescript/`               | Strict ESM and browser compiler presets           | `@internal/cfg-typescript` JSON presets                     |
| `vite-public-app/`          | Shared public-app build setup and declarations    | `@internal/cfg-vite-public-app`                             |
| `vitest/`                   | Shared test configuration                         | `@internal/cfg-vitest`                                      |

Configuration can use JavaScript, JSON, declarations or TypeScript according to
its loader. Custom Oxlint rules are TypeScript; their private workspace checks
them without adding a build or package API. Use the
[ESLint guide](eslint/README.md) for factory composition, plugin dependency
ownership and Oxlint scope changes.

Use `workspace:` dependencies for shared config packages. Changes to a shared
preset need validation in representative consumers, not just a check of the
configuration itself. Add execution, publishing and reporting scripts to
[repository automation](../scripts/README.md), and contributor commands to
[gx](../gx/README.md). The [tooling ownership guide](../README.md) defines the
boundaries.
