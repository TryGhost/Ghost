# Welcome to the contributing guide for Ghost!

So you're interested in giving us a hand? That's awesome! We've put together some guidelines that should help
you get started quickly and easily. If you need help with contributing, visit the #ghost IRC channel on freenode. Thank you for stopping by!

**Quick Links:** [feature roadmap](https://github.com/TryGhost/Ghost/wiki/Roadmap) - [support forum](https://ghost.org/forum) - [documentation](http://support.ghost.org) - [developer wiki](https://github.com/TryGhost/Ghost/wiki) - [community guidelines](https://ghost.org/about/guidelines/) - [dev blog](http://dev.ghost.org)


### TL;DR

If you need help with Ghost or have questions, please use [the forum](https://ghost.org) (documentation is [here](http://support.ghost.org)). If you're [raising a bug](#bugs) please be sure to [include as much info as possible](#bug-template) so that we can fix it! If you've got some code you want to [pull request](#pull-requests) please [squash commits](https://github.com/TryGhost/Ghost/wiki/Git-workflow#wiki-clean-up-history), use this [commit message format](https://github.com/TryGhost/Ghost/wiki/Git-workflow#commit-messages) and check it passes the tests by running `grunt validate`. Thanks for helping us make Ghost better.


### Guideline Contents

There are lots and lots of ways to get involved, this document covers:

* [raising issues](#raising-issues)
    * [bug reports](#bugs)
    * [feature requests](#features)
    * [change requests](#changes)
* [working on Ghost core](#core)
    * [submitting pull requests](#pull-requests)
* [testing and quality assurance](#testing)
* [writing documentation](#documentation)
* [translation](#translation)


<a name="raising-issues"></a>
## Reporting An Issue

If you're looking to raise an issue because think you've found a problem with Ghost, or you'd like to make a request
for a new feature in the codebase, or any other reason… please read this first.

The GitHub issue tracker is the preferred channel for [bug reports](#bugs),
[feature requests](#features), [change requests](#changes) and [submitting pull
requests](#pull-requests), but please respect the following restrictions:

* Please **search for existing issues**. Help us keep duplicate issues to a minimum by checking to see if someone
has already reported your problem or requested your idea.

* Please **do not** use the issue tracker for personal support requests (use
  [the forum](http://ghost.org/forum) or IRC - #ghost on freenode).

* Please **do not** derail or troll issues. Keep the discussion on topic and respect the opinions of others.

<a name="bugs"></a>
### Bug Reports

A bug is a _demonstrable problem_ that is caused by the code in the repository.
Good bug reports are extremely helpful - thank you!

Guidelines for bug reports:

1. **Use the GitHub issue search** &mdash; check if the issue has already been
   reported.

2. **Check if the issue has been fixed** &mdash; try to reproduce it using the
   latest `master` or look for [closed issues in the current milestone](https://github.com/TryGhost/Ghost/issues?labels=&milestone=3&page=1&state=closed).

3. **Isolate the problem** &mdash; ideally create a [reduced test
   case](http://css-tricks.com/6263-reduced-test-cases/) and a live example.

4. **Include a screencast if relevant** - Is your issue about a design or front end feature or bug? The most
helpful thing in the world is if we can *see* what you're talking about.
Use [LICEcap](http://www.cockos.com/licecap/) to quickly and easily record a short screencast (24fps) and save it as an animated gif! Embed it directly into your GitHub issue. Kapow.

5. **Include as much info as possible!** Use the **Bug Report template** below or [click this link](https://github.com/TryGhost/Ghost/issues/new?title=Bug%3A&body=%23%23%23%20Issue%20Summary%0A%0A%23%23%23%20Steps%20to%20Reproduce%0A%0A1.%20This%20is%20the%20first%20step%0A%0AThis%20is%20a%20bug%20because...%0A%0A%23%23%23%20Technical%20details%0A%0A*%20Ghost%20Version%3A%20master%20-%20latest%20commit%3A%20%20INSERT%20COMMIT%20REF%0A*%20Client%20OS%3A%20%0A*%20Server%20OS%3A%20%0A*%20Node%20Version%3A%20%0A*%20Browser%3A%20%0A*%20Database%3A) to start creating a bug report with the template automatically.

A good bug report shouldn't leave others needing to chase you up for more information. Be sure to include the
details of your environment.

Here is a [real example](https://github.com/TryGhost/Ghost/issues/413) of a great bug report.

<a name="bug-template"></a>

Template Example ([click to use](https://github.com/TryGhost/Ghost/issues/new?title=Bug%3A&body=%23%23%23%20Issue%20Summary%0A%0A%23%23%23%20Steps%20to%20Reproduce%0A%0A1.%20This%20is%20the%20first%20step%0A%0AThis%20is%20a%20bug%20because...%0A%0A%23%23%23%20Technical%20details%0A%0A*%20Ghost%20Version%3A%20master%20-%20latest%20commit%3A%20%20INSERT%20COMMIT%20REF%0A*%20Client%20OS%3A%20%0A*%20Server%20OS%3A%20%0A*%20Node%20Version%3A%20%0A*%20Browser%3A%20%0A*%20Database%3A)):
```
Short and descriptive example bug report title

### Issue Summary

A summary of the issue and the browser/OS environment in which it occurs. If
suitable, include the steps required to reproduce the bug.

### Steps to Reproduce

1. This is the first step
2. This is the second step
3. Further steps, etc.

Any other information you want to share that is relevant to the issue being
reported. Especially, why do you consider this to be a bug? What do you expect to happen instead?

### Technical details:

* Ghost Version: master (latest commit: a761de2079dca4df49567b1bddac492f25033985)
* Client OS: Mac OS X 10.10.1
* Server OS: CentOS 6.4
* Node Version: 0.10.16
* Browser: Chrome 39.0.2171.71
* Database: SQLite / MySQL / postgres
```

<a name="features"></a>
### Feature Requests

If you've got a great idea, we want to hear about it. Our [user wishlist](http://ideas.ghost.org) exists so that we can learn more about what our community wants us to build.

Please use your discretion to decide whether a feature request belongs on the [wishlist](http://ideas.ghost.org) or whether it's better suited to a GitHub issue.

Before making a suggestion, here are a few handy tips on what to consider:

1. Visit the [Roadmap](https://github.com/TryGhost/Ghost/wiki/Roadmap), [wishlist](http://ideas.ghost.org) & **use the GitHub search** to
see if the feature has already been requested

2. Check out [What makes it into Ghost core?](https://github.com/TryGhost/Ghost/wiki/What-makes-it-into-Ghost-core%3F) - this explains the guidelines for what fits into the scope and aims of the project

3. Have a quick think about whether your feature is for the admin UI, the blog output, themes or apps - or does it affect multiple areas? This can help when describing your idea.

4. Remember, it's up to *you* to make a strong case to convince the project's leaders of the merits of a new
feature. Please provide as much detail and context as possible, this means explaining the use case and why it is
likely to be common. The strongest vote in favour of any feature request is hands-down, un-debatable traction on our user wishlist.


<a name="changes"></a>
### Change Requests

Change requests cover both architectural and functional changes to how Ghost works. If you have an idea for a
new or different dependency, a refactor, or an improvement to a feature, etc - please be sure to:

1. **Use the GitHub search** and check someone else didn't get there first

2. Take a moment to think about the best way to make a case for, and explain what you're thinking as it's up to you to convince the project's leaders the change is worthwhile. Some questions to consider are:
	- Is it really one idea or is it many?
	- What problem are you solving?
	- Why is what you are suggesting better than what's already there?

<a name="pull-requests"></a>
### Submitting Pull Requests

Pull requests are **awesome**. If you're looking to raise a PR for something which doesn't have an open issue, please think carefully about [raising an issue](#raising-issues) which your PR can close, especially if you're fixing a bug. This makes it more likely that there will be enough information available for your PR to be properly tested and merged. To make sure your PR is accepted as quickly as possible, please take a minute to check the guidelines on:

* [commit messages](https://github.com/TryGhost/Ghost/wiki/Git-workflow#commit-messages)
* [cleaning-up history](https://github.com/TryGhost/Ghost/wiki/Git-workflow#wiki-clean-up-history)
* [not breaking the build](https://github.com/TryGhost/Ghost/wiki/Git-workflow#check-it-passes-the-tests)


##### Need Help?

If you're not completely clear on how to submit / update / *do* Pull Requests, please check out our in depth
[Git Workflow guide](https://github.com/TryGhost/Ghost/wiki/Git-Workflow) for Ghost, or visit the #ghost IRC channel on freenode.org and we'll help you out.


<a name="testing"></a>
### Testing and Quality Assurance

Never underestimate just how useful quality assurance is. If you're looking to get involved with the code base and
don't know where to start, checking out and testing a pull request is one of the most useful things you could do.

If you want to get involved with testing Ghost, there is a set of
[QA Documentation](https://github.com/TryGhost/Ghost/wiki/QA-Documentation) on the wiki.

Essentially though, [check out the latest master](#core), take it for a spin, and if you find anything odd, please
follow the [bug report guidelines](#bug-reports) and let us know!

#### Checking out a Pull Request

The dev blog has [detailed instructions](http://dev.ghost.org/easy-git-pr-test/) on configuring your environment
 to allow you to checkout pull requests with this simple command: `pr #1234`

<a name="documentation"></a>
### Documentation

Ghost's user documentation can be found at [support.ghost.org](http://support.ghost.org), if you have feedback or would like to write some user documentation, please let us know by [emailing support](mailto:support@ghost.org).

Ghost's developer documentation can be found at [docs.ghost.org](http://docs.ghost.org). These docs are written and hosted on [readme.io](https://readme.io/) which has a suggested edits feature through which you can submit updates. If you'd like to get more involved than just making amendments, [email support](mailto:support@ghost.org) and let us know :)

<a name="translation"></a>
### Translation

Full documentation on contributing translations can be found at <http://docs.ghost.org/translations>

<a name="core"></a>
## Working on Ghost Core

Looking to get setup to work on Ghost? AWESOME! The [Ghost-Vagrant](https://github.com/TryGhost/Ghost-Vagrant) image is a super-easy way to get a ready-made environment for contributing, but if you'd rather install Ghost natively, here's how...

**What you'll need:**

- Node version 0.10.x & npm
- phantomjs 1.9.x and casperjs 1.1.x
([instructions](https://github.com/TryGhost/Ghost/wiki/Functional-testing-with-PhantomJS-and-CasperJS)) for running tests


### Installation / Setup Instructions

1. Check you have the pre-requisites listed above!
1. `git clone https://github.com/TryGhost/Ghost.git`- clone the git repo
1. `cd Ghost` - change into the project folder
1. `npm install -g grunt-cli` - to make it possible to run grunt commands (see [developer tips](#developer-tips) for more info on Grunt)
1. `npm install` - you need all the dependencies, so do not use the `--production` flag mentioned in user install guides
	* If the install fails with errors to do with "node-gyp rebuild" or "SQLite3", follow the SQLite3 install
instructions below this list
    * Usually if you're within vagrant, and have installed the guest plugins and updated that, this will not happen
1. `grunt init` - updates bower dependencies, copies assets and compiles Handlebars templates
1. If you're going to run in production mode, you also need to run `grunt prod`
1. `npm start` - starts Ghost or `grunt dev` will start it in watch mode

If something goes wrong, please see the
[troubleshooting tips](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md#troubleshooting--faq) below.

### Looking for something to work on?

If you're interested in contributing to Ghost and don't know where to start, here's a few tips:

- The [beginner label](https://github.com/TryGhost/Ghost/labels/beginner) indicates issues which should be suitable for someone new to the Ghost codebase
- The [help wanted label](https://github.com/TryGhost/Ghost/labels/help%20wanted) highlights issues that need a champion
- The [roadmap wiki page](https://github.com/TryGhost/Ghost/wiki/Roadmap#github-backlogs) has details of how we use milestones to prioritise issues

If you're still stuck, please come join us in the #ghost channel in IRC and let us know what you're interested in!


### Developer Tips
Whilst developing, you can take advantage of the [Grunt toolkit](https://github.com/TryGhost/Ghost/wiki/Grunt-Toolkit) to automatically compile assets, such as handlebars templates, sass and ember scripts. Some useful commands include:

- `grunt dev` => Watch for changes and automatically rebuild assets
- `grunt prod` => Build assets for the production environment
- `grunt validate` => Run the linting and test suite

Addresses for development:

- Front-end => <http://localhost:2368>
- Admin => <http://localhost:2368/ghost/>

### Updating with the latest changes

Pulling down the latest changes from master will often require more than just a pull, you may also need to do one
or more of the following:

- `npm install` - fetch any new dependencies
- `grunt init` - will fetch bower dependencies and recompile handlebars templates for the admin
- delete content/data/*.db - delete the database and allow Ghost to recreate the fixtures

### Key Branches & Tags

- **[master](https://github.com/TryGhost/Ghost)** is the bleeding edge development branch. All work on the next
release is here. Do **NOT** use this branch for a production site.
- **[stable](https://github.com/TryGhost/Ghost/tree/stable)** contains the latest release of Ghost. This branch may be used in production.
- **[gh-pages](http://github.com/TryGhost/Ghost/tree/gh-pages)** contains [The Ghost Guide](http://docs.ghost.org) our developer documentation.


## Grunt Toolkit

Ghost uses Grunt heavily to automate useful tasks such as building assets, testing, live reloading/watching etc etc

[Grunt Toolkit docs](https://github.com/TryGhost/Ghost/wiki/Grunt-Toolkit) are a worthwhile read for any would-be
contributor.

## Troubleshooting / FAQ

### I get "ERROR: Failed to lookup view "index"

Sounds like you don't have our default theme - Casper, your content/themes/casper folder is probably empty.
When cloning from GitHub be sure to use SSH and to run `git submodule update --init`.

### Ghost doesn't do anything - I get a blank screen

Sounds like you probably didn't run the right grunt command for building assets. You may need to run `grunt init` and if using production mode, `grunt prod` as well.

### I get `node-gyp` errors or SQLite3 doesn't install properly during npm install

Ghost depends upon SQLite3, which requires a native binary. These are provided for most major platforms, but if you
are using a more obscure *nix flavor you may need to follow
the [node-sqlite3 binary instructions](https://github.com/developmentseed/node-sqlite3/wiki/Binaries).


## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide,
royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights
(including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and
publicly perform and display the Contributions on any licensing terms, including without limitation:
(a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the
licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the
above license. If Your employer has rights to intellectual property that You create, You represent that You have
received permission to make the Contributions on behalf of that employer, or that Your employer has waived such
rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person
claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also
represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that
conflicts with the terms of this license.

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which
you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED,
INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS
FOR A PARTICULAR PURPOSE.
