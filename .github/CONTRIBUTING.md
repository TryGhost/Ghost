# Contributing to Ghost

For **help**, **support**, **questions** and **ideas** please use **[our forum](https://forum.ghost.org)**  🚑.

---

## Where to Start

The [codebase documentation](../docs/README.md) explains how to set up the
monorepo and find your way around it. Start with the
[development setup guide](../docs/contributing/development-setup.md), then use
the [contribution workflow](../docs/contributing/workflow.md) when you are ready
to make a change.

If you're not sure what to work on, start with
[good first issues](https://github.com/TryGhost/Ghost/labels/good%20first%20issue)
or browse the broader
[help wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) list.

Discuss new features and substantial product or architectural changes in the
[forum](https://forum.ghost.org) before implementing them.

## Commit Messages

We have a handful of simple standards for commit messages which keep the main
branch readable and generate useful release notes. They matter most for pull
request titles and squash commits; follow them for intermediate commits where
practical.

```text
<optional release-note emoji> <past-tense summary, at most 80 characters>

<optional issue relationship, or "no ref">

<why this change was made>
```

- Start the summary with `Fixed`, `Changed`, `Updated`, `Improved`, `Added`,
  `Removed`, `Reverted`, `Moved`, `Released`, `Bumped`, or `Cleaned`.
- Keep the second line blank.
- When an issue exists, use a supported relationship followed by its URL, such
  as `ref <issue URL>`, `fixes <issue URL>`, or `closes <issue URL>`. Use
  `no ref` when it is useful to state explicitly that there is no issue, or
  leave this line blank.
- Explain the context in the body: why this change, why now, and why this
  approach. The diff already describes what changed.

The local hook warns about most deviations without blocking the commit. It
does require the common invalid forms `refs ...` and `ref: ...` to be corrected
to a supported relationship such as `ref ...`.

### Release-note emojis

A leading release-note emoji opts the squash commit into generated release
notes. Add one only for a significant change that is relevant to users, and
write the summary from their perspective. Alpha or experimental work does not
need an emoji until it becomes user-facing.

- ✨ Feature
- 🎨 Improvement or change
- 🐛 Bug fix
- 💡 Other noteworthy user-facing change

Use 🌐 for [translation submissions](../docs/contributing/translating-ghost.md).
Translation commits are not selected for generated release notes by that emoji
alone.

Good final commit examples include a [new feature](https://github.com/TryGhost/Ghost/commit/61db6defde3b10a4022c86efac29cf15ae60983f),
a [bug fix](https://github.com/TryGhost/Ghost/commit/6ef835bb5879421ae9133541ebf8c4e560a4a90e),
and a [translation](https://github.com/TryGhost/Ghost/commit/83904c1611ae7ab3257b3b7d55f03e50cead62d7).

**Bumping @tryghost dependencies**

When bumping `@tryghost/*` dependencies, describe the user-visible result rather
than which packages were bumped. The diff already shows the package changes;
the message should explain what changed because of them. See this
[good example](https://github.com/TryGhost/Ghost/commit/95751a0e5fb719bb5bca74cb97fb5f29b225094f).

## Changesets

Ghost publishes several workspace packages to npm — the `@tryghost/*` editor and adapter packages under `koenig/` and `packages/`. When your change affects one of these publishable packages, including by changing a catalog entry it consumes, add a **changeset** so it gets a version bump and a changelog entry:

```bash
pnpm change
```

This records which packages changed and the bump type (patch / minor / major); the summary you provide becomes the changelog entry. If the change genuinely needs no release (an internal refactor, tests, tooling), record that explicitly instead:

```bash
pnpm change --bump none
```

A package `README.md` is published with the package and requires a release.
Repository-only Markdown such as `AGENTS.md`, `CLAUDE.md`, changelogs, and
package-local `docs/` does not.

CI enforces this — the **Check app version bump** job fails a pull request that affects a publishable package without a covering changeset. The pre-commit hook prints a non-blocking reminder locally, and `pnpm change status` shows what's currently pending.

For more detail, see the [contribution workflow](../docs/contributing/workflow.md).

## Submitting Pull Requests

We aim to merge any straightforward, well-understood bug fixes or improvements immediately, as long as they pass our tests (run `pnpm check` to ensure everything works). We generally don’t merge new features and larger changes without prior discussion with the core product team for tech/design specification.

Please provide plenty of context and reasoning around your changes, to help us merge quickly. Closing an already open issue is our preferred workflow. If your PR gets out of date, we may ask you to rebase as you are more familiar with your changes than we will be.

For branch, validation, and pull request details, follow the
[contribution workflow](../docs/contributing/workflow.md).

---

## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide, royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights (including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and publicly perform and display the Contributions on any licensing terms, including without limitation:
(a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the above license. If Your employer has rights to intellectual property that You create, You represent that You have received permission to make the Contributions on behalf of that employer, or that Your employer has waived such rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that conflicts with the terms of this license.

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
