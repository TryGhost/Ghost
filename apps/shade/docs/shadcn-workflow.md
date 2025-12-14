# ShadCN Component Workflow

## Adding New Components

1. **Check for ShadCN equivalent first** - search https://ui.shadcn.com/docs/components/
2. If it exists, add via `npx shadcn@latest add <component>`
3. Place new UI components under `src/components/ui`
4. Export from `src/index.ts`
5. Add a sibling `*.stories.tsx` file

## Installation Guardrails

**Never overwrite existing components:**
- Choose "No" when `npx shadcn@latest add` asks to overwrite
- Work on a fresh branch: `git checkout -b chore/shadcn-add-<name>`
- Commit a clean baseline before running the installer

**If a component already exists:**
1. Generate the new version in a temporary scratch repo
2. Manually diff and port only desired changes into the existing Shade file
3. Run `yarn lint`, `yarn test`, and verify in Storybook before merging

## Storybook Requirements

- Include a short overview (what the component does and primary use case)
- Demonstrate key variants and states (sizes, disabled/loading, critical props)
- Copy examples from ShadCN docs at https://ui.shadcn.com/docs/components/[name]
- Be minimal but representative

## Verification Checklist

After adding/modifying components:
```bash
yarn lint
yarn test
yarn storybook  # Visual verification
```
