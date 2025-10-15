# Repository Guidelines

## Project Structure & Module Organization
- `src/components/ui/*`: Atomic UI components (Radix/ShadCN-based). Each component should have a `*.stories.tsx` file next to it.
- `src/components/layout/*`: Reusable layout containers (Page, Heading, Header, ViewHeader, ErrorPage).
- `src/components/features/*`: Higher-level, opinionated components (e.g., PostShareModal, SourceTabs).
- `src/hooks/*`: Custom React hooks.
- `src/lib/utils.ts`: Shared utilities (class merging, formatting, chart helpers).
- `src/providers/*` and `src/ShadeApp.tsx`: Context + app wrapper that scopes styles to `.shade`.
- `src/assets/*`: Logos and custom icon SVGs (icons auto-exported via `Icon`).
- `test/unit/*`: Vitest tests. `test/unit/utils/test-utils.tsx` provides a `render` helper.
- Build artifacts: `es/` (compiled ESM) and `types/` (generated `.d.ts`). Storybook config lives in `.storybook/`.

## Build, Test, and Development Commands
- `yarn build` — Type declarations + Vite library build to `es/`.
- `yarn test` — Type-checks then runs Vitest with coverage.
- `yarn test:unit` / `yarn test:types` — Run unit tests or TS type-checks only.
- `yarn lint` — ESLint for source and tests (`tailwindcss` plugin enabled).
- `yarn storybook` — Run Storybook locally. `yarn build-storybook` — static export.

## Coding Style & Naming Conventions
- React + TypeScript. Prefer composable components over heavy prop configuration.
- Filenames: ShadCN-generated files keep kebab-case; component identifiers use `PascalCase`.
- Functions/vars: `camelCase`. Keep file-scoped components in the same file.
- Always forward and merge `className` with `cn(...)`. Use CVA for variants when useful.
- Tailwind is scoped via `.shade`; dark mode uses `.dark`. Follow ESLint and `tailwindcss/*` rules.

## Component API Patterns
- Prefer compound subcomponents for multi‑region components (e.g., `Header.Title`, `Header.Meta`, `Header.Actions`) instead of many props.
- Keep parts small and focused; attach them as static properties and export as named exports.
- Expose Radix/HTML props where sensible; always include `className` and merge with `cn(...)`.
- Demonstrate each part in Storybook stories (e.g., “With actions”, “With meta”).

## Adding New Components
- Prefer ShadCN first: search for an equivalent and add via `npx shadcn@latest add <component>`. Follow the guardrails above to avoid accidental overwrites.
- Location & exports: place new UI components under `src/components/ui` and export them from `src/index.ts`.
- Storybook: add a sibling `*.stories.tsx` file with an overview (what/why) and stories showing different use cases/variants (sizes, states, important props). If you've added a ShadCN component then copy the examples from the ShadCN component documentation at https://ui.shadcn.com/docs/components/[component name].
- Implementation: forward `className` and merge with `cn(...)`; use CVA for variants where appropriate.
- Verification: `yarn lint`, `yarn test`, plus `yarn storybook` to visually validate stories before opening a PR.
- **Important**: Always run `yarn lint` after making changes to fix any ESLint errors and warnings before committing.

## Testing Guidelines (TBD)
We are finalizing a formal testing strategy.

Interim expectations:
- Use the existing setup (Vitest + Testing Library + jsdom) when adding tests.
- Location/patterns: `test/unit/**/*.(test).(ts|tsx|js)`; use `test/unit/utils/test-utils.tsx`’s `render` when a wrapper is needed.
- For new UI components, prioritize comprehensive Storybook stories; add focused unit tests where they provide real value (e.g., hooks, utils, logic-heavy parts).
- No strict coverage threshold yet; run `yarn test` locally to ensure the suite passes.

## Commit & Pull Request Guidelines
- Commit messages are the release notes. Follow this structure:
  - 1st line: ≤ 80 chars, past tense, start with one of: Fixed/Changed/Updated/Improved/Added/Removed/Reverted/Moved/Released/Bumped/Cleaned.
  - 2nd line: blank.
  - 3rd line: magic word + absolute issue URL (e.g., `ref https://linear.app/...` or `closes ...`).
  - 4th+: explain the “why”/context behind the change.
- Gotchas: don’t use `ref:` (colon) — magic word must be followed by a space; Linear requires full URLs.
 - Dependency bumps: focus the message on resulting user‑visible changes (no need to list which internal packages changed).
- PRs: describe changes, link issues, add screenshots/gifs for UI changes, and update/add stories.

## Storybook Documentation for New Components
Refer to “Adding New Components” for the process. Story content should:
- Include a short overview (what the component does and primary use case).
- Demonstrate key variants and states (sizes, disabled/loading, critical props).
- Be minimal but representative; prefer CVA variants/props over ad‑hoc class overrides.
 - Avoid obvious technical implementation details (e.g., which libraries are used). Prefer one‑line guidance per story explaining when to use that variant/size/state.

## Notes for Contributors (and Agents)
- Do not rename ShadCN-generated files purely for casing.
- Use the `@` alias for internal imports (e.g., `@/lib/utils`).
- When changing tokens/config, verify Storybook and a library build still succeed.
- When adding new components to Shade, always look for a ShadCN/UI equivalent and if it exists add it using `npx`.

## ShadCN Component Installation Guardrails
- Never overwrite existing Shade components during `npx shadcn@latest add <name>` prompts. Choose “No” when asked to overwrite.
- Always work on a fresh branch and commit a clean baseline before running the installer so you can easily revert: `git checkout -b chore/shadcn-add-<name>`.
- If a component already exists in `src/components/ui`, generate the new version in a temporary workspace (scratch repo), then manually diff and port only the desired changes into the existing Shade file.
- After integrating, run `yarn lint`, `yarn test`, and verify in Storybook before merging.
