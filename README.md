# [Ghost v0.1](https://github.com/TryGhost/Ghost) [![Build Status](https://magnum.travis-ci.com/TryGhost/Ghost.png?token=hMRLUurj2P3wzBdscyQs&branch=master)](https://magnum.travis-ci.com/TryGhost/Ghost)

Ghost is a free, open, simple blogging platform that's available to anyone who wants to use it. Created and maintained by [John O'Nolan](http://twitter.com/JohnONolan) + [Hannah Wolfe](http://twitter.com/ErisDS) + an amazing group of [contributors](https://github.com/TryGhost/Ghost/pulse).

Visit the project's home page at [http://tryghost.org](http://tryghost.org)!

## Early-Access Developer Introduction

Welcome to the Ghost core repo. The code here is the result of a few stolen hours of free time hacking a proof of concept for the Kickstarter video. Pretty much everything is subject to and expected to change. A full list of the currently-working features can be found [here](https://github.com/TryGhost/Ghost/wiki/Working-Features).

The top priorities right now are:

* Having a core RESTful API and consuming it internally
* Data model design & implementation - including a potential switch from JugglingDB to bookshelf.js
* Authentication and ACL
* Improving core architecture & design - modular structure, better dependency injection, testable code with tests


## Getting Started:

**Note:** It is highly recommended that you use the [Ghost-Vagrant](https://github.com/TryGhost/Ghost-Vagrant) setup for developing Ghost.

1. Clone the git repo
1. cd into the project folder and run `npm install`.
	* If the install fails with errors to do with "node-gyp rebuild", follow the Sqlite3 install instructions
1. cd into /core/admin/assets and run `compass compile --css-dir=css`

Frontend can be located at [localhost:3333](localhost:3333), Admin is at [localhost:3333/ghost](localhost:3333/ghost)

### SQLite3 Install Instructions
Ghost depends upon SQLite3, which has to be built for each OS. NPM is as smart as it can be about this, and as long as your machine has all the pre-requisites for compiling/building a C++ program, the npm install still works.

**For Mac users:** The easiest way to do this is to download/install XCode from the App Store (free). This will automatically install all the tools you need - you don't need to open the app.

**For Everyone else:** if you don't have the required pre-requisites, you will need to either get them, or as a shortcut, obtain a precompiled SQLite3 package for your OS. We have created some of these [here](https://github.com/developmentseed/node-sqlite3/issues/106).

The pre-compiled package should be downloaded, extracted and placed in the node\_modules folder, such that it lives in node\_modules/sqlite3, if you have a partial install of the SQLite3 package, replace it with the files you downloaded from github. Be sure that all the SQLite3 files and folders live directly in node\_modules/sqlite3 - there should note be a node\_modules/sqlite3/sqlite3 folder.

## Versioning

For transparency and insight into our release cycle, and for striving to maintain backward compatibility, Ghost will be maintained according to the [Semantic Versioning](http://semver.org/) guidelines as much as possible.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>`

Constructed with the following guidelines:

* A new *major* release indicates a large change where backwards compatibility is broken.
* A new *minor* release indicates a normal change that maintains backwards compatibility.
* A new *patch* release indicates a bugfix or small change which does not affect compatibility.

## Bugs

If you have a bug or feature request, please [open a new issue](https://github.com/TryGhost/Ghost/issues). Before opening any issue, please search for existing issues and read the [Issue Guidelines](https://github.com/necolas/issue-guidelines), written by [Nicolas Gallagher](https://github.com/necolas/).

## Contributions

Pleas submit pull requests in order to contribute back to Ghost - referencing any relevant or open issues in the bug tracker. 

All code should conform, strictly, to the Ghost project [Code Standards](https://github.com/TryGhost/Ghost/wiki/Code-standards).

All HTML and CSS should conform to the [Code Guide](http://github.com/mdo/code-guide), maintained by [Mark Otto](http://github.com/mdo).

## Community

Keep track of Ghost development and Ghost community activity.

* Follow Ghost on [Twitter](http://twitter.com/TryGhost), [Facebook](http://facebook.com/tryghostapp) and [Google+](https://plus.google.com/114465948129362706086).
* Read and subscribe to the [The Official Ghost Blog](http://blog.tryghost.org).
* Chat with Ghost developers on IRC. We're on `irc.freenode.net`, in the `#Ghost` channel.

## Compiling CSS & JavaScript

A SASS compiler is required to work with the CSS in this project.

Run `compass compile --css-dir=css` from /core/admin/assets.

We also recommend [CodeKit](http://incident57.com/codekit/) (Paid/Mac) & [Scout](http://mhs.github.io/scout-app/) (Free/Mac/PC).

## Copyright & License

Copyright (C) 2013 Ghost

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.