# Shade Design System

Ghost's design system built on shadcn/ui + Radix UI.

## Project Structure

- `src/components/ui/*` - Atomic UI components (Radix/ShadCN-based)
- `src/components/layout/*` - Reusable layout containers
- `src/components/features/*` - Higher-level, opinionated components
- `src/hooks/*` - Custom React hooks
- `src/lib/utils.ts` - Shared utilities
- `src/providers/*` - Context providers
- `test/unit/*` - Vitest tests

## Commands

```bash
yarn build           # Type declarations + Vite library build
yarn test            # Type-check + Vitest with coverage
yarn lint            # ESLint (tailwindcss plugin enabled)
yarn storybook       # Run Storybook locally
```

## Documentation

- `docs/shadcn-workflow.md` - Adding ShadCN components safely

## Component Patterns

- Prefer compound subcomponents for multi-region components (e.g., `Header.Title`, `Header.Actions`)
- Forward and merge `className` with `cn(...)`
- Use CVA for variants
- Each component should have a `*.stories.tsx` file
- Use the `@` alias for internal imports (e.g., `@/lib/utils`)

## Commit Messages

- 1st line: ≤80 chars, past tense (Fixed/Changed/Added/Removed)
- 2nd line: blank
- 3rd line: `ref` or `closes` + full issue URL
- 4th+: Explain the "why"
