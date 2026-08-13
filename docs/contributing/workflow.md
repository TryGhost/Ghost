# Contribution workflow

This guide covers the path from a working development environment to a reviewed
pull request. Use the [development setup](development-setup.md) first if Ghost is
not already running locally.

## Choose work

Issues labelled
[good first issue](https://github.com/TryGhost/Ghost/labels/good%20first%20issue)
are intended to be approachable first contributions. The broader
[help wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) list contains
other contributions the project would welcome.

Discuss new features and substantial product or architectural changes in the
[Ghost Forum](https://forum.ghost.org/) before implementing them. A focused bug
fix or agreed improvement can usually proceed directly.

## Start from current `main`

Update the canonical checkout, then create a descriptive branch:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
pnpm setup

git switch -c concise-change-name
```

Keep unrelated changes on separate branches and in separate pull requests. If a
larger effort needs a shared or release branch, agree that with the maintainers
first; ordinary pull requests target `main`.

## Make and validate the change

Add or update automated tests when behavior changes. Run the most focused checks
for the code you touched, following the README beside that workspace. Before
handing off a change, use the repository's one-stop lint and test command:

```bash
pnpm check
```

`pnpm check` runs `pnpm lint` followed by `pnpm test`. It does not include the
browser E2E suite or Ember Admin tests, so run those separately when the affected
area requires them. CI uses the Nx affected graph and path filters to select the
relevant lint, unit, integration, acceptance, build, and browser-test jobs for a
pull request.

## Record package release intent

Changes that affect a publishable `@tryghost/*` package under `koenig/` or
`packages/`, including changes to catalog entries consumed by that package, need
a changeset so the package receives an appropriate version and changelog entry:

```bash
pnpm change
```

Choose patch, minor, or major according to the package's public compatibility
impact. The summary becomes the changelog entry, so describe the result for the
package's consumers.

If a changed publishable package genuinely requires no release—for example, a
test-only or internal tooling change—record that explicitly:

```bash
pnpm change --bump none
```

Use `pnpm change status` to inspect pending release intent. CI rejects changes
that affect publishable packages without a covering changeset. Changes that do
not affect a publishable package do not need one.

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


## Publish the branch

Everyone can clone, run, and modify the canonical repository without a fork. The
publication step depends on whether you can push branches to `TryGhost/Ghost`.

### Maintainers

Push the current branch directly:

```bash
git push -u origin HEAD
gh pr create --base main
```

### External contributors

Create a fork when the change is ready to publish. With the GitHub CLI, the fork
can be created from the existing canonical checkout and added as a separate
remote:

```bash
gh repo fork --remote --remote-name fork
git push -u fork HEAD
gh pr create --repo TryGhost/Ghost --base main
```

The equivalent GitHub web or desktop flow is also fine. Tooling or a coding agent
may perform these steps on your behalf; check the proposed remote, branch, and
pull request before authorizing a push.

## Open the pull request

Target `main` unless a maintainer has asked for another base branch. The pull
request should explain:

- why the change is needed;
- what behavior or contract changes;
- how it was tested;
- any compatibility, release, migration, or rollout considerations.

Link the issue when one exists and include screenshots for visible UI changes.
Keep the branch current if requested and respond to review feedback with new
commits. CI must pass before merge; skipped jobs are expected when they are not
relevant to the changed paths.
