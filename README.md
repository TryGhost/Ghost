# [Ghost v0.1.0](https://github.com/TryGhost/Ghost) [![Build Status](https://magnum.travis-ci.com/TryGhost/Ghost.png?token=hMRLUurj2P3wzBdscyQs&branch=master)](https://magnum.travis-ci.com/TryGhost/Ghost)

Ghost is a free, open, simple blogging platform that's available to anyone who wants to use it. Lovingly created and maintained by [John O'Nolan](http://twitter.com/JohnONolan) + [Hannah Wolfe](http://twitter.com/ErisDS) + an amazing group of [contributors](https://github.com/TryGhost/Ghost/contributors).

Visit the project's website at [http://tryghost.org](http://tryghost.org)!


## Getting Started

1. Run the app from the command line
2. Navigate to /ghost/ - you will be prompted to log in
3. Create a new user
4. Log in
5. Start using Ghost

Note - this is still very alpha. Not everything works yet.

### Currently Working Features

* Login / Logout / Register
	* User can register an email address & password
        * User can login
        * User can logout
        * All /ghost/ routes (the admin) are auth-protected
* Dashboard
	* new post link
* Admin menu
	* G, dashboard, content, new post & settings menu items go to correct pages
* Content screen
	* Lists all posts with correct titles (incorrect time etc)
    * Select post in list highlights that post and opens it in the preview pane
* Write screen
	* Live preview works for all standard markdown
    * Save draft button saves entered title & content. Everything is published by default.
    * Editing/opening existing post puts correct info in title and content panels & save updates content.
* Database
	* The database is created and populated with basic data on first run of the server
    * New posts and edits save and last forever
    * The data can be reset by opening data/datastore.db and emptying the file. The next restart of the server will cause the database to be recreated and repopulated.
* Frontend
	* Homepage lists a number of posts as configured in config.js
    * Clicking on an individual post loads an individual post page
    * Date formatting helper uses moment


## Working on Ghost Core

**Note:** It is highly recommended that you use the [Ghost-Vagrant](https://github.com/TryGhost/Ghost-Vagrant) setup for developing Ghost.

1. Clone the git repo
2. cd into the project folder and run `npm install`.
	* If the install fails with errors to do with "node-gyp rebuild", follow the Sqlite3 install instructions
    * Usually if you're within vagrant, and have installed the guest plugins and updated that, this will not happen
3. run `grunt init` from the root. (make sure you have Casper 1.1 installed though, or have installed `bourbon` on your vagrant. See Ghost-Vagrant for that)

Frontend can be located at [localhost:3333](localhost:3333), Admin is at [localhost:3333/ghost](localhost:3333/ghost)

Whist developing you may wish to use **grunt watch** to watch for changes to handlebars and sass and recompile automatically

### Updating with the latest changes

Pulling down the latest changes from master will often require more than just a pull, you may also need to do one or more of the following:

 * **npm install** - fetch any new dependencies
 * **grunt** - will recompile handlebars templates and sass for the admin (as long as you have previously run grunt init to install bourbon)
 * git submodule update - fetch the latest changes to Casper (the default theme)
 * delete core/shared/data/testdb.db - delete the database and allow Ghost to recreate the fixtures

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

With bourbon, all you have to do is run `grunt init` from the root of Ghost, which will compile the admin section. For everything else, use `sass <sourcefile> <targetfile>`.

We also recommend [CodeKit](http://incident57.com/codekit/) (Paid/Mac) & [Scout](http://mhs.github.io/scout-app/) (Free/Mac/PC).


## Copyright & License

Copyright (C) 2013 The Ghost Foundation - Released under the MIT Lincense.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.