# Contributing to Ghost

For **help**, **support**, **questions** and **ideas** please use **[our forum](https://forum.ghost.org)**  🚑.

---

## Where to Start

If you're a developer looking to contribute, but you're not sure where to begin: Check out the [good first issue](https://github.com/TryGhost/Ghost/labels/good%20first%20issue) label on Github, which contains small piece of work that have been specifically flagged as being friendly to new contributors.

After that, if you're looking for something a little more challenging to sink your teeth into, there's a broader [help wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) label encompassing issues which need some love.

If you've got an idea for a new feature, please start by suggesting it in the [forum](https://forum.ghost.org), as adding new features to Ghost first requires generating consensus around a design and spec.


## Working on Ghost Core

If you're going to work on Ghost core you'll need to go through a slightly more involved install and setup process than the usual Ghost CLI version.

First you'll need to fork both [Ghost](https://github.com/tryghost/ghost) and [Ghost-Admin](https://github.com/tryghost/ghost-admin) to your personal Github account, and then follow the detailed [install from source](https://ghost.org/docs/install/source/) setup guide.


### Branching Guide

`master` on the main repository always contains the latest changes. This means that it is WIP for the next minor version and should NOT be considered stable. Stable versions are tagged using [semantic versioning](http://semver.org/).

On your local repository, you should always work on a branch to make keeping up-to-date and submitting pull requests easier, but in most cases you should submit your pull requests to `master`. Where necessary, for example if multiple people are contributing on a large feature, or if a feature requires a database change, we make use of feature branches.


### Commit Messages

We have a handful of simple standards for commit messages which help us to generate readable changelogs. Please follow this wherever possible and mention the associated issue number.

- **1st line:** Max 80 character summary written in past tense
- **2nd line:** [Always blank]
- **3rd line:** `refs/closes #000` or `no issue`
- **4th line:** Whatever you want. Any extra details can be included from here

If your change is **user-facing** please prepend the first line of your commit with **an emoji key**.
We are following [gitmoji](https://gitmoji.carloscuesta.me/).

**Main emojis we are using:**

- ✨ Feature
- 🎨 Improvement / change
- 🐛 Bug Fix
- 💡 Anything else flagged to users or whoever is writing release notes

Good commit message examples: [one](https://github.com/TryGhost/Ghost/commit/61db6defde3b10a4022c86efac29cf15ae60983f), [two](https://github.com/TryGhost/Ghost/commit/b392d1925a9f961d7b4bf781ee86393a7773ed4b) and [three](https://github.com/TryGhost/Ghost/commit/e4807a779c28a754e3f8ae871a26a8aad12ca9a9).



### Submitting Pull Requests

We aim to merge any straightforward, well-understood bug fixes or improvements immediately, as long as they pass our tests (run `yarn test` to check locally). We generally don’t merge new features and larger changes without prior discussion with the core product team for tech/design specification.

Please provide plenty of context and reasoning around your changes, to help us merge quickly. Closing an already open issue is our preferred workflow. If your PR gets out of date, we may ask you to rebase as you are more familiar with your changes than we will be.



---

## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide, royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights (including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and publicly perform and display the Contributions on any licensing terms, including without limitation:
(a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the above license. If Your employer has rights to intellectual property that You create, You represent that You have received permission to make the Contributions on behalf of that employer, or that Your employer has waived such rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that conflicts with the terms of this license.

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
