# Contributing to Ghost

For **help**, **support**, **questions** and **ideas** please use **[our forum](https://forum.ghost.org)**  🚑.

If you're [raising a bug](https://docs.ghost.org/docs/contributing#bugs) 🐛 please be sure to [include as much info as possible](https://docs.ghost.org/docs/contributing#bug-template) so that we can fix it!

---

## Where to Start

If you're a developer looking to contribute, but you're not sure where to begin: Check out the [good first issue](https://github.com/TryGhost/Ghost/labels/good%20first%20issue) label on Github, which contains small piece of work that have been specifically flagged as being friendly to new contributors.

After that, if you're looking for something a little more challenging to sink your teeth into, there's a broader [help wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) label encompassing issues which need some love.


## Working on Ghost Core

If you're going to work on Ghost core you'll need to go through a slightly more involved install and setup process than the usual Ghost CLI version.

First you'll need to fork both [Ghost](https://github.com/tryghost/ghost) and [Ghost-Admin](https://github.comc/tryghost/ghost-admin) to your personal Github account, and then follow the detailed [install from source](https://docs.ghost.org/install/source/) setup guide.


#### Branching Guide

`master` on the main repository always contains the latest changes. This means that it is WIP for the next minor version and should NOT be considered stable. Stable versions are tagged using [semantic versioning](http://semver.org/). 

On your local repository, you should always work on a branch to make keeping up-to-date and submitting pull requests easier, but in most cases you should submit your pull requests to `master`. Where necessary, for example if multiple people are contributing on a large feature, or if a feature requires a database change, we make use of feature branches. If you are working on something which you feel needs to go into a feature branch, let Hannah know and she will create this for you.


#### Commit Messages

We have a handful of simple standards for commit messages which help us to generate readable changelogs. Please follow this wherever possible!

- **1st line:** Max 80 character summary written in past tense
- **2nd line:** [Always blank]
- **3rd line:** `refs/closes #000` or `no issue`
- **4th line:** Whatever you want. Any extra details can be included from here

If your change is **user-facing** please prepend the first line of your commit with one of the following emoji keys, which are used in the changelog:

- ✨ Feature
- 🎨 Improvement
- 🐛 Bug Fix

Good commit message examples: [one](https://github.com/TryGhost/Ghost/commit/61db6defde3b10a4022c86efac29cf15ae60983f), [two](https://github.com/TryGhost/Ghost/commit/b392d1925a9f961d7b4bf781ee86393a7773ed4b) and [three](https://github.com/TryGhost/Ghost/commit/e4807a779c28a754e3f8ae871a26a8aad12ca9a9).


#### Submitting Pull Requests

Before submitting a PR, first ensure that your code passes all tests by running `yarn test` from the root directory.

When submitting a Pull Request please make sure you give as much information as possible about your change and why you made any particular design or structural decisions. Context is always helpful.

Ensuring that your feature branch is up to date and has a clean working tree without merge conflicts will help us test, review and merge it faster. The easier it is for us to merge a PR, the more likely we are to do it.

If you need help, you can always open a PR and let us know what you're struggling with, or reach out via [the forum](https://forum.ghost.org).


## What Happens Next

Small changes usually get merged as soon as we've had chance to read through them. For more involved changes one of us will checkout your PR, rebase with master if required and then run basic sanity / regression tests on the code, run the Casper tests and re-run grunt validate. If your PR has fallen behind master and can no longer be merged, we will in most cases rebase / merge master. In some cases with lots of small changes we will ask you to do this as you are more familiar with your changes than we will be.

If any changes or discussion are needed, we'll let you know!


---

## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide, royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights (including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and publicly perform and display the Contributions on any licensing terms, including without limitation:
(a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the above license. If Your employer has rights to intellectual property that You create, You represent that You have received permission to make the Contributions on behalf of that employer, or that Your employer has waived such rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that conflicts with the terms of this license.

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
