# Contributing to Ghost

So you're interested in giving us a hand? That's awesome! We've put together some brief guidelines that should help you get started quickly and easily.


## Reporting An Issue

If you think you've found a problem with Ghost, or you'd like to make a request for a new feature in the codebase… please follow these steps:

1. **Search for existing issues** - The most important step! Help us keep duplicate issues to a minimum by checking to see if someone has already reported your problem or requested your idea.
2. **Describe your issue in detail** - Help us help you. Before opening any issue, please read the [Issue Guidelines](https://github.com/necolas/issue-guidelines), written by [Nicolas Gallagher](https://github.com/necolas/). Include operating system and version, browser and version, version of Ghost, customized or vanilla build, etc. where appropriate. Also include steps to reproduce the bug.
3. **Include a screencast if relevant** - Is your issue about a design or front end feature or bug? The most helpful thing in the world is if we can *see* what you're talking about. Use [LICEcap](http://www.cockos.com/licecap/) to quickly and easily record a short screencast (24fps) and save it as an animated gif! Embed it directly into your github issue. Kapow.


## Working on Ghost Core

**Note:** It is recommended that you use the [Ghost-Vagrant](https://github.com/TryGhost/Ghost-Vagrant) setup for developing Ghost.

**Pre-requisites:**

* node 0.10 or 0.11
* ruby and the gems 'sass' and 'bourbon'
* if you want to build the docs, python and pygments


## Key Branches & Tags

- **[master](https://github.com/TryGhost/Ghost)** is the bleeding edge development branch. All work on the next release is here.
- **[gh-pages](http://tryghost.github.io/Ghost)** is The Ghost Guide documentation for Getting Started with Ghost.
- **[releases](https://github.com/TryGhost/Ghost/releases)** are used to contain stable tagged versions of Ghost.



### Setup Instructions

1. Clone the git repo
2. cd into the project folder
3. Run `git submodule update --init`
4. Run `npm install -g grunt-cli`
5. Run `npm install`.
	* If the install fails with errors to do with "node-gyp rebuild", follow the SQLite3 install instructions below this list
    * Usually if you're within vagrant, and have installed the guest plugins and updated that, this will not happen
6. run `grunt init` from the root - this installs Bourbon, compiles SASS and compiles Handlebars templates

Frontend can be located at [localhost:2368](http://localhost:2368), Admin is at [localhost:2368/ghost/](http://localhost:2368/ghost/)

Whist developing you may wish to use **grunt watch** to watch for changes to handlebars and sass and recompile automatically


### SQLite3 Install Instructions

*Only needed if you experienced errors in Step 5 above - Skip this otherwise*

Ghost depends upon SQLite3, which has to be built for each OS. NPM is as smart as it can be about this, and as long as your machine has all the pre-requisites for compiling/building a C++ program, the npm install still works.

**For Mac users:** The easiest way to do this is to download/install XCode from the App Store (free). This will automatically install all the tools you need - you don't need to open the app.

**For Everyone else:** if you don't have the required pre-requisites, you will need to either get them, or as a shortcut, obtain a precompiled SQLite3 package for your OS. We have created some of these [here](https://github.com/developmentseed/node-sqlite3/issues/106).

The pre-compiled package should be downloaded, extracted and placed in the node\_modules folder, such that it lives in node\_modules/sqlite3, if you have a partial install of the SQLite3 package, replace it with the files you downloaded from github. Be sure that all the SQLite3 files and folders live directly in node\_modules/sqlite3 - there should note be a node\_modules/sqlite3/sqlite3 folder.


### Compiling CSS & JavaScript

A SASS compiler is required to work with the CSS in this project. You can either do this by running `grunt` from the commandline - or by using a 3rd party app. We recommend [CodeKit](http://incident57.com/codekit/) (Paid/Mac) & [Scout](http://mhs.github.io/scout-app/) (Free/Mac/PC).


## Coding standards

Good, clear and consistent code styles are pivotal in the success of any software project. Good use of style can reduce errors, consistency will enable us to work together efficiently.

### JavaScript

* JSLint is King (see JSLint section below).
* Use strict mode
* Protect the global scope
* Indent with 4 spaces
* Max line lenght 120
* Use unix line endings
* Document as you go - we are using groc and jsdoc formats
* Write tests, unit tests are in nodeunit, functional using casperjs

For more in depth information please read the official [Ghost Coding Standards](https://github.com/TryGhost/Ghost/wiki/Code-standards).


### HTML & CSS

- Two spaces for HTML indentation. Never tabs.
- Four spaces for SASS indentation. Never tabs.
- Double quotes only, never single quotes.
- Use tags and elements appropriate for an HTML5 doctype (e.g., self-closing tags)
- Adhere to the [Recess CSS property order](http://markdotto.com/2011/11/29/css-property-order/).
- Always a space after a property's colon (.e.g, `display: block;` and not `display:block;`).
- End all lines with a semi-colon.
- For multiple, comma-separated selectors, place each selector on its own line.

For more in depth information please read [Mark Otto](http://github.com/mdo)'s excellent [Code Guide](http://github.com/mdo/code-guide)


## Submitting Pull Requests

The easier it is for us to merge a PR, the faster we'll be able to do it. Please take steps to make merging easy and keep the history clean and useful.

Firstly, **always work on a branch**, it will make your life much easier - honest. Not touching the master branch will also simplify keeping your fork up-to-date.

*Note:* If you are not comfortable with git & using rebase, make a special 'merge' branch of your branch to do these things on, then if something goes awry you can always go back to your working branch and try again.

### Clean-up history

Whilst you're working on your branch on your own, you can do all the commits you like - lots of little commits are highly recommended. However, when you come to submit a PR, you should clean your history ready for public consumption.

- Run `git log master..your-branch-name` to see how many commits there are on your branch
- Run `git rebase -i HEAD~#` where # is the number of commits you have done on your branch

Use the interactive rebase to edit your history. Unless you have good reason to keep more than one commit, I recommend marking the first commit with 'r' and the others with 's'. This lets you keep the first commit only, but change the message. You commit message(s) should follow the pattern described in the [notes](https://github.com/TryGhost/Ghost/wiki/Git-workflow#notes-on-writing-good-commit-messages) above. The first line of your commit message will appear in the change log which goes out to our VIPs with each pre-release, so please keep that in mind.

### Check it passes the tests

Run `grunt validate` to check that your work passes JSLint and the server-side mocha unit tests. If this fails, your PR will throw an error when submitted.

Our functional tests are not yet hooked up to grunt validate, but details on how to run them can be found in `core/test/functional/base.js` if you're making changes to the UI it's worth running these.

### Need Help?

If you're not completely clear on how to submit / update / *do* Pull Requests, please check out our in depth [Git Workflow guide](https://github.com/TryGhost/Ghost/wiki/Git-Workflow) for Ghost.


## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide, royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights (including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and publicly perform and display the Contributions on any licensing terms, including without limitation: (a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the above license. If Your employer has rights to intellectual property that You create, You represent that You have received permission to make the Contributions on behalf of that employer, or that Your employer has waived such rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that conflicts with the terms of this license. 

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.