# [Ghost](https://github.com/TryGhost/Ghost) [![Build Status](https://magnum.travis-ci.com/TryGhost/Ghost.png?token=hMRLUurj2P3wzBdscyQs&branch=master)](https://magnum.travis-ci.com/TryGhost/Ghost)

Ghost is a free, open, simple blogging platform that's available to anyone who wants to use it. Lovingly created and maintained by [John O'Nolan](http://twitter.com/JohnONolan) + [Hannah Wolfe](http://twitter.com/ErisDS) + an amazing group of [contributors](https://github.com/TryGhost/Ghost/contributors).

Visit the project's website at [http://ghost.org](http://ghost.org)!


## Getting Started

There are two main ways to get started with Ghost:

1. Working from a Release - these are pre-built zip packages found on ghost.org. Installation instructions are below.
2. Working from the GitHub repo - instructions can be found in [CONTRIBUTING.md](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md)

### Installing from a Release

*Please Note:* Releases are pre-built packages, GitHub releases (tags) are not. To install from GitHub you need to follow the [contributing guide](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md).

1.  Once you've downloaded one of the releases, unzip it, and place the directory wherever you would like to run the code
2.  Fire up a terminal (or node command prompt in Windows) and change directory to the root of the Ghost application (where config.example.js and index.js are)
4.  run `npm install --production` to install the node dependencies
4.  To start ghost, run `npm start`
5.  Visit `http://localhost:2368/` in your web browser


### Updating with the latest changes

**Warning:** The Ghost file system contains your database and config. Be sure to back these up first.

1. Make a backup of your data!
2. Update the files by pasting new files over the top of old ones. If prompted by your OS or FTP client to 'merge' or 'replace' always choose 'merge'.
3. Run npm install
4. Run npm update
5. Restart the application
6. Log out and log back in again.


### Logging in For The First Time

Once you have the Ghost server up and running, you should be able to navigate to `http://localhost:2368/ghost/` from a web browser, where you will be prompted for a login.

1.  Click on the "register new user" link
2.  Enter your user details (careful here: There is no password reset yet!)
3.  Return to the login screen and use those details to log in.

Note - this is still very alpha. Not everything works yet.


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

Want to report a bug, request a feature, or help us build Ghost? Check out our in depth guide to [Contributing to Ghost](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md). We need all the help we can get!


## Community

Keep track of Ghost development and Ghost community activity.

* Follow Ghost on [Twitter](http://twitter.com/TryGhost), [Facebook](http://facebook.com/tryghostapp) and [Google+](https://plus.google.com/114465948129362706086).
* Read and subscribe to the [The Official Ghost Blog](http://blog.ghost.org).
* Chat with Ghost developers on IRC. We're on `irc.freenode.net`, in the `#Ghost` channel.


## Copyright & License

Copyright (C) 2013 The Ghost Foundation - Released under the MIT Lincense.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.