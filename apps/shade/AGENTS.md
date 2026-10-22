# Shade agent guidance

Read the human documentation before changing Shade:

- [`README.md`](./README.md) is for people using Shade: installing it in an
  app, and how Ghost Admin sets it up.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) is for working on Shade: development,
  layers, conventions, Storybook, tests and publishing. Read
  [Layers](./CONTRIBUTING.md#layers) to decide where code belongs, and review
  the [common anti-patterns](./CONTRIBUTING.md#common-anti-patterns) before
  making a change.
- The Storybook docs in `src/docs/` explain how to use Shade:
  [introduction](./src/docs/introduction.mdx),
  [component contracts](./src/docs/component-contracts.mdx),
  [patterns](./src/docs/patterns-guide.mdx),
  [primitives](./src/docs/primitives-guide.mdx),
  [recipes](./src/docs/recipes-guide.mdx), and
  [tokens](./src/docs/tokens.mdx).

- When building screens with Shade, use the design skills in
  [`skills/`](./skills/). For page headers and their actions, use
  [`shade-page-header`](./skills/shade-page-header/SKILL.md).

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
- Update the Storybook docs when a shared rule for using Shade changes, and
  `CONTRIBUTING.md` when a rule for working on Shade changes; do not make this
  file the only source.
- The npm package ships code only. Storybook serves the docs as Markdown at
  `/docs/<page>.md` and `/llms.txt`, generated from the `.mdx` sources; see
  [Docs for agents](./CONTRIBUTING.md#docs-for-agents).
- The design skills live in [`skills/`](./skills/). Apps install them with
  `npx skills add TryGhost/Ghost/apps/shade/skills`; `build-ghost-app-ui` is
  their front door and is for apps only. In this repo, `.agents/skills` links
  the other six, so agents working on Ghost find them as before. They hold no
  rules: each routes to the docs, so a rule change belongs in the `.mdx`
  source. Follow [Skills](./CONTRIBUTING.md#skills) when changing them.
- `dev-skill/` holds the internal `ghost-app-ui-dev-setup` skill for Ghost's
  own team. It isn't shipped or installed with the design skills.
