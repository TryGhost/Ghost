---
name: shade-for-ghost-apps
description: Install Shade, Ghost's design system, in a Ghost app and find the skills and docs it ships. Use when building or changing a Ghost app's UI, or adding Shade to one.
---

# Shade for Ghost apps

A Ghost app's screens use Shade, the design system Ghost Admin is built with.
Shade's design skills and docs ship inside the `@tryghost/shade` npm package,
so they always match the installed version. This skill installs Shade and
points at them; the rules live there.

## Steps

1. Install Shade, unless `node_modules/@tryghost/shade/` exists. Use the
   `alpha` tag: `latest` is an older release. npm refuses Shade beside React
   19, which `npm create vite` scaffolds, so first move `react`, `react-dom`,
   `@types/react` and `@types/react-dom` to the versions
   `npm view @tryghost/shade@alpha peerDependencies` prints, then run
   `npm install @tryghost/shade@alpha`.
2. Open `node_modules/@tryghost/shade/skills/shade-in-ghost-app/SKILL.md` and
   follow it from its first step. It finishes the setup and walks building
   and checking a screen.
3. Add the pointer below to the app's `AGENTS.md`, creating the file if it's
   missing, so later sessions find Shade's skills without this one.

As you work, open the shipped skill that matches the task:

| Task                                                   | Open                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| Setting up Shade, or checking a screen before handover | `node_modules/@tryghost/shade/skills/shade-in-ghost-app/SKILL.md`     |
| Starting or restructuring a page or screen             | `node_modules/@tryghost/shade/skills/shade-page-templates/SKILL.md`   |
| Adding or changing a page header or its actions        | `node_modules/@tryghost/shade/skills/shade-page-header/SKILL.md`      |
| Laying out, spacing, aligning or stacking elements     | `node_modules/@tryghost/shade/skills/shade-use-primitives/SKILL.md`   |
| Choosing colours for surfaces, text, borders or hovers | `node_modules/@tryghost/shade/skills/shade-tokens-not-hex/SKILL.md`   |
| Writing `dark:` classes, or a dark-mode-only problem   | `node_modules/@tryghost/shade/skills/shade-no-dark-variants/SKILL.md` |
| Importing from `@tryghost/shade`                       | `node_modules/@tryghost/shade/skills/shade-imports/SKILL.md`          |
| Anything else about Shade                              | `node_modules/@tryghost/shade/docs/index.md`                          |

Read them in place: their links point into the package's `docs/` folder.

## The AGENTS.md pointer

Add this section to the app's `AGENTS.md` as it stands:

```markdown
## Shade

This app's UI uses Shade (`@tryghost/shade`). Before building or changing a
screen, read `node_modules/@tryghost/shade/skills/shade-in-ghost-app/SKILL.md`
and follow it. The other Shade skills are in
`node_modules/@tryghost/shade/skills/`, and the docs start at
`node_modules/@tryghost/shade/docs/index.md`. Read them in place.
```

## Self-check

- `node_modules/@tryghost/shade/package.json` has an alpha version.
- You followed `shade-in-ghost-app` through its own self-check.
- The app's `AGENTS.md` has the Shade section.
