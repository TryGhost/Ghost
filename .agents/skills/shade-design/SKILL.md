---
name: shade-design
description: Find the Shade design skill for a UI task in Ghost Admin. Use when building or changing an Admin screen, page, layout, header, colours, dark mode or Shade imports.
---

# Shade design

Shade's design skills live in `apps/shade/skills/`. Open the one that matches
the task, and follow its workflow and self-check before finishing:

| Task                                                   | Skill                                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Starting or restructuring a page, route or screen      | [`shade-page-templates`](../../../apps/shade/skills/shade-page-templates/SKILL.md)     |
| Adding or changing a page header or its actions        | [`shade-page-header`](../../../apps/shade/skills/shade-page-header/SKILL.md)           |
| Laying out, spacing, aligning or stacking elements     | [`shade-use-primitives`](../../../apps/shade/skills/shade-use-primitives/SKILL.md)     |
| Choosing colours for surfaces, text, borders or hovers | [`shade-tokens-not-hex`](../../../apps/shade/skills/shade-tokens-not-hex/SKILL.md)     |
| Writing `dark:` classes, or a dark-mode-only problem   | [`shade-no-dark-variants`](../../../apps/shade/skills/shade-no-dark-variants/SKILL.md) |
| Importing from `@tryghost/shade` or adding Shade       | [`shade-imports`](../../../apps/shade/skills/shade-imports/SKILL.md)                   |
| Setting up Shade in a Ghost app, or checking a screen  | [`build-ghost-app-ui`](../../../apps/shade/skills/build-ghost-app-ui/SKILL.md)         |

A screen usually needs several: start with page templates, then the rest as
you reach them.

In the Ghost repo, the docs are the running Storybook (`http://localhost:6006`,
`pnpm storybook` in `apps/shade`) or the `.mdx` sources in `apps/shade/src`.

Changing Shade itself, such as adding a component, is contributor work: use
`shade-component-decision` and `shade-new-component` instead.
