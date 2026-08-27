# Shade agent guidance

Read the human documentation before changing Shade:

- [`README.md`](./README.md) covers integration, development, and package tests.
- [Introduction](./src/docs/introduction.mdx) and
  [Layers](./src/docs/layers.mdx) explain the design system and where code
  belongs.
- [Contributing](./src/docs/contributing.mdx) defines implementation, Storybook,
  testing, and review requirements.
- Review the [common anti-patterns](./src/docs/contributing.mdx#common-anti-patterns)
  before making a change.
- [Component contracts](./src/docs/component-contracts.mdx),
  [patterns](./src/docs/patterns-guide.mdx),
  [primitives](./src/docs/primitives-guide.mdx),
  [recipes](./src/docs/recipes-guide.mdx), and
  [tokens](./src/docs/tokens.mdx) provide layer-specific guidance.

## Required workflow

- Use the repository Shade skills for the relevant task. In particular, use
  `shade-component-decision` before adding a component or pattern, and follow
  `shade-new-component` for the acceptance checklist.
- Import from layer-specific Shade subpaths, never the root barrel. Inside
  Shade, use the `@/` alias for cross-file imports.
- Never overwrite an existing component when using the ShadCN CLI. Follow the
  `shade-shadcn-install` skill.
- Do not import `@tryghost/shade/styles.css` or add another `ShadeApp` wrapper
  in an embedded Admin app; Admin owns the shared CSS and application wrapper.
- Use semantic tokens rather than raw colours or colour `dark:` variants, and
  use Shade primitives for layout-only wrappers.
- Run `pnpm lint` and `pnpm test`. Visually verify changed UI and stories in
  Storybook.
- Update the Storybook human documentation when a shared Shade convention
  changes; do not make this file the only source.
