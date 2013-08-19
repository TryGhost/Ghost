# [Ghost](https://github.com/TryGhost/Ghost) [![Build Status](https://magnum.travis-ci.com/TryGhost/Ghost.png?token=hMRLUurj2P3wzBdscyQs&branch=master)](https://magnum.travis-ci.com/TryGhost/Ghost)

Ghost is a free, open, simple blogging platform that's available to anyone who wants to use it. Lovingly created and maintained by [John O'Nolan](http://twitter.com/JohnONolan) + [Hannah Wolfe](http://twitter.com/ErisDS) + an amazing group of [contributors](https://github.com/TryGhost/Ghost/contributors).

Visit the project's website at [http://tryghost.org](http://tryghost.org)!


## Getting Started

### Installing from a VIP Release

*Please Note:* VIP Releases are pre-built packages, GitHub releases (tags) are not. To install from a GitHub release you need to follow instructions 2-5 from the [Working on Ghost Core](#working-on-ghost-core) section.

1.  Once you've downloaded one of the release packages, unzip it, and place the directory wherever you would like to run the code
2.  Fire up a terminal (or node command prompt in Windows) and change directory to the root of the Ghost application (where config.js and index.js are)
3.  run `npm install` to install the node dependencies (if you get errors to do with SQLite, please see the SQLite3 instructions below this list)
4.  To start ghost, run `npm start`
5.  Visit `http://localhost:2368/` in your web browser

### SQLite3 Install Instructions

*Only needed if you experienced errors in Step 3 above - Skip this otherwise*

Ghost depends upon SQLite3, which has to be built for each OS. NPM is as smart as it can be about this, and as long as your machine has all the pre-requisites for compiling/building a C++ program, the npm install still works.

**For Mac users:** The easiest way to do this is to download/install XCode from the App Store (free). This will automatically install all the tools you need - you don't need to open the app.

**For Everyone else:** if you don't have the required pre-requisites, you will need to either get them, or as a shortcut, obtain a precompiled SQLite3 package for your OS. We have created some of these [here](https://github.com/developmentseed/node-sqlite3/issues/106).

The pre-compiled package should be downloaded, extracted and placed in the node\_modules folder, such that it lives in node\_modules/sqlite3, if you have a partial install of the SQLite3 package, replace it with the files you downloaded from github. Be sure that all the SQLite3 files and folders live directly in node\_modules/sqlite3 - there should note be a node\_modules/sqlite3/sqlite3 folder.

### Logging in For The First Time

Once you have the Ghost server up and running, you should be able to navigate to `http://localhost:2368/ghost` from a web browser, where you will be prompted for a login.

1.  Click on the "register new user" link
2.  Enter your user details (careful here: There is no password reset yet!)
3.  Return to the login screen and use those details to log in.


Note - this is still very alpha. Not everything works yet.


### Updating with the latest changes

Pulling down the latest changes from master will often require more than just a pull, you may also need to do one or more of the following:

 * `npm install` - fetch any new dependencies
 * `git submodule update` - fetch the latest changes to Casper (the default theme)
 * `grunt` - will recompile handlebars templates and sass for the admin (as long as you have previously run `grunt init` to install bourbon)
 * delete core/server/data/*.db - delete the database and allow Ghost to recreate the fixtures


## Versioning

For transparency and insight into our release cycle, and for striving to maintain backward compatibility, Ghost will be maintained according to the [Semantic Versioning](http://semver.org/) guidelines as much as possible.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>-<build>`

Constructed with the following guidelines:

* A new *major* release indicates a large change where backwards compatibility is broken.
* A new *minor* release indicates a normal change that maintains backwards compatibility.
* A new *patch* release indicates a bugfix or small change which does not affect compatibility.
* A new *build* release indicates this is a pre-release of the version.


## Reporting Bugs and Contributing Code

Want to report a bug, request a feature, or help us build Ghost? Check out our in dept guide to [Contributing to Ghost](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md). We need all the help we can get!

## Community

Keep track of Ghost development and Ghost community activity.

* Follow Ghost on [Twitter](http://twitter.com/TryGhost), [Facebook](http://facebook.com/tryghostapp) and [Google+](https://plus.google.com/114465948129362706086).
* Read and subscribe to the [The Official Ghost Blog](http://blog.tryghost.org).
* Chat with Ghost developers on IRC. We're on `irc.freenode.net`, in the `#Ghost` channel.


## Copyright & License

Copyright (C) 2013 The Ghost Foundation - Released under the MIT Lincense.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.