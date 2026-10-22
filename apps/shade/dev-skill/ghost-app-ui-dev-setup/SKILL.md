---
name: ghost-app-ui-dev-setup
description: Prepare an empty folder for trying Ghost app UI development locally, with Shade's skills, local docs and the app SDK from a Ghost checkout.
disable-model-invocation: true
---

# Set up a folder for Ghost app UI development

This prepares the current folder so a fresh chat can build a Ghost app the way
an outside developer would: Shade's skills installed, Shade's docs served by the
local Storybook, the app SDK packed from the Ghost checkout, and an `AGENTS.md`
that reads like an ordinary app project's.

The build chat must see only what an outside developer sees. Keep the checkout
path out of every file in the folder, except the deny rules in step 8.

Do the steps in order. Each ends on a check; when one fails, stop and tell the
user. Commands and file contents are in [`reference.md`](reference.md).

## 1. Check the folder

1. Confirm the current folder is empty. Hidden system files such as
   `.DS_Store`, or an empty `.claude/`, are fine. Anything else: stop and ask.
2. Ask where the Ghost checkout is, suggesting `~/Code/Ghost`. It's
   `<checkout>` below.
3. Check `<checkout>/apps/shade/package.json` exists and the folder isn't
   inside `<checkout>`.

## 2. Ghost

1. Check `curl -s -o /dev/null -w '%{http_code}' http://localhost:2368/ghost/`
   prints `200`.
2. If not, offer to run `pnpm dev:up` in `<checkout>`, which runs Ghost in the
   background and prints its URL. Run it only on a yes, then check again.
3. Remind the user that Settings → Labs → Private features → **Apps** must be
   on. You can't check it without logging in.

## 3. Storybook

Storybook serves Shade's docs as Markdown, which the skills read.

1. Check `curl -sf -o /dev/null http://localhost:6006/llms.txt` succeeds. If
   so, go to step 4.
2. Otherwise start it detached, as in
   [Start Storybook](reference.md#start-storybook-step-3), and poll
   `llms.txt` every few seconds for up to three minutes. If it never answers,
   show the end of its log and stop.
3. Tell the user it keeps running after this chat, and how to stop it.

## 4. Shade's skills

1. Run `npx -y skills add <checkout>/apps/shade/skills -a claude-code codex -y`.
   `codex` puts the skills in `.agents/skills/`, which most clients read;
   `claude-code` links them into `.claude/skills/`.
2. Check `.agents/skills/` has `build-ghost-app-ui`, `shade-imports`,
   `shade-no-dark-variants`, `shade-page-header`, `shade-page-templates`,
   `shade-tokens-not-hex` and `shade-use-primitives`, each linked from
   `.claude/skills/`.

## 5. The `build-ghost-app` skill

`build-ghost-app/` beside this file stands in for the Ghost apps team's future
skill: the SDK, manifest, `connect()` and install link.

1. Install it from the checkout, so it's current:
   `npx -y skills add <checkout>/apps/shade/dev-skill/ghost-app-ui-dev-setup/build-ghost-app -a claude-code codex -y`
2. Check `.agents/skills/build-ghost-app/SKILL.md` exists and
   `.claude/skills/build-ghost-app` links to it.
3. Delete `skills-lock.json`: it records the checkout path, and nothing here
   needs it.

## 6. The app SDK

`@tryghost/app-sdk` isn't on npm. Build, pack and stamp it into
`vendor/tryghost-app-sdk.tgz`, then check npm installs it, as in
[Pack the app SDK](reference.md#pack-the-app-sdk-step-6). Done when the check's
`npm ls` exits 0 with `@quilted/threads` under the SDK.

## 7. `AGENTS.md`

Write it exactly as in [`AGENTS.md`](reference.md#agentsmd-step-7).

## 8. Guardrails

1. Write `.claude/settings.json` as in
   [`.claude/settings.json`](reference.md#claudesettingsjson-step-8). It keeps
   the build chat out of Ghost's source and off the user's browser.
2. Tell the user it applies in Claude Code only; other clients ignore it.

## 9. Starting state

1. Write a `.gitignore` with `node_modules` and `dist`.
2. Run `git init`, add everything, and commit as `Starting state`.
3. Check `git log --oneline` shows that one commit and `git status` is clean.

## 10. Hand over

Finish with this message, filling in the paths:

> Ready. Start a **new chat** in this folder and describe your app in your own
> words. This chat has seen the checkout path; a fresh one sees only what an
> outside developer would.
>
> When the app is built, run `npm run dev` here, then install it from
> http://localhost:2368/ghost/#/apps/install?manifest=http%3A%2F%2Flocalhost%3A5190%2Fghost-app.json
>
> To try unpublished Shade code once the app exists, run
> `pnpm pack:local <this folder>` in `<checkout>/apps/shade`.
