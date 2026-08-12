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

We have a handful of simple standards for commit messages which help us to generate readable changelogs. Please follow this wherever possible and mention the associated issue number.

- **1st line:** Max 80 character summary
   - Written in past tense e.g. “Fixed the thing” not “Fixes the thing”
   - Start with one of: Fixed, Changed, Updated, Improved, Added, Removed, Reverted, Moved, Released, Bumped, Cleaned
- **2nd line:** [Always blank]
- **3rd line:** `ref <issue link>`, `fixes <issue link>`, `closes <issue link>` or blank
- **4th line:** Why this change was made - the code includes the what, the commit message should describe the context of why - why this, why now, why not something else?

If your change is **user-facing** please prepend the first line of your commit with **an emoji key**. If the commit is for an alpha feature, no emoji is needed. We are following [gitmoji](https://gitmoji.carloscuesta.me/).

**Main emojis we are using:**

- ✨ Feature
- 🎨 Improvement / change
- 🐛 Bug Fix
- 🌐 i18n (translation) submissions  [[See Translating Ghost docs for more detail](https://www.notion.so/5af2858289b44f9194f73f8a1e17af59?pvs=25#bef8c9988e294a4b9a6dd624136de36f)]
- 💡 Anything else flagged to users or whoever is writing release notes

Good commit message examples: [new feature](https://github.com/TryGhost/Ghost/commit/61db6defde3b10a4022c86efac29cf15ae60983f), [bug fix](https://github.com/TryGhost/Ghost/commit/6ef835bb5879421ae9133541ebf8c4e560a4a90e) and [translation](https://github.com/TryGhost/Ghost/commit/83904c1611ae7ab3257b3b7d55f03e50cead62d7).

**Bumping @tryghost dependencies**

When bumping `@tryghost/*` dependencies, the first line should follow the above format and say what has changed, not say what has been bumped.

There is no need to include what modules have changed in the commit message, as this is _very_ clear from the contents of the commit. The commit should focus on surfacing the underlying changes from the dependencies - what actually changed as a result of this dependency bump?

[Good example](https://github.com/TryGhost/Ghost/commit/95751a0e5fb719bb5bca74cb97fb5f29b225094f)

## Changesets

Ghost publishes several workspace packages to npm — the `@tryghost/*` editor and adapter packages under `koenig/` and `packages/`. When your change affects one of these publishable packages, including by changing a catalog entry it consumes, add a **changeset** so it gets a version bump and a changelog entry:

```bash
pnpm change
```

This records which packages changed and the bump type (patch / minor / major); the summary you provide becomes the changelog entry. If the change genuinely needs no release (an internal refactor, tests, tooling), record that explicitly instead:

```bash
pnpm change --bump none
```

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
