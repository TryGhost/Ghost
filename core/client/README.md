# [Ghost-UI](http://github.com/TryGhost/Ghost-UI)
[Travis] [SauceLabs]

Ghost-UI is the user interface framework which is used to build the [Ghost](http://ghost.org) blogging platform, created and maintained by a [passionate group](http://github.com/TryGhost/Ghost-UI/contributors) of designers and front-end developers with the support and involvement of the Ghost community. It is structurally based on the [Bootstrap](http://getbootstrap.com) framework.

***Note: This repository is currently a reasonably broken work in progress. It's brand new, and we're just getting everything set up for the first time.***


## Table of Contents

- [Quick Start](#quick-start)
- [Bugs and Feature Requests](#bugs-and-feature-requests)
- [Documentation](#documentation)
- [Compiling CSS and JavaScript](#compiling-css-and-javascript)
- [Contributing](#contributing)
- [Community](#community)
- [Versioning](#versioning)
- [Copyright and License](#copyright-and-license)


## Quick Start

Three quick start options are available:

- [Download the latest release](https://github.com/TryGhost/Ghost-UI/releases)
- Install with [Bower](http://bower.io): `bower install ghost-ui`
- Clone the repository: `git clone https://github.com/TryGhost/Ghost-UI.git`


### What's Included

Within the download you'll find the following directories and files, logically grouping common assets and providing both compiled and minified variations. You'll see something like this:

```
ghost-ui/
├── css/
│   ├── ghost-ui.css
│   └── ghost-ui.min.css
├── js/
│   ├── ghost-ui.js
│   └── ghost-ui.min.js
└── fonts/
    ├── tbc.eot
    ├── tbc.svg
    ├── tbc.ttf
    └── tbc.woff
```

We provide compiled CSS and JS (`ghost-ui.*`), as well as compiled and minified CSS and JS (`ghost-ui.min.*`). Fonts from <tbc> are also included.


## Bugs and Feature Requests

Have a bug or a feature request? Please first read the [issue guidelines](https://github.com/TryGhost/Ghost-UI/blob/master/CONTRIBUTING.md#using-the-issue-tracker) and search for existing and closed issues. If your problem or idea is not addressed yet, [please open a new issue](https://github.com/TryGhost/Ghost-UI/issues/new).


## Documentation

The documentation, included in this repo in the root directory, is built with [Jekyll](http://jekyllrb.com) and publicly hosted on GitHub Pages at <http://ui.ghost.org>. The docs may also be run locally.

### Running Documentation Locally

1. If necessary, [install Jekyll](http://jekyllrb.com/docs/installation) (requires v1.x).
  - **Windows users:** Read [this unofficial guide](https://github.com/juthilo/run-jekyll-on-windows/) to get Jekyll up and running without problems. We use Pygments for syntax highlighting, so make sure to read the sections on installing Python and Pygments.
2. From the root `/ghost-ui` directory, run `jekyll serve` in the command line.
  - **Windows users:** While we use Jekyll's `encoding` setting, you might still need to change the command prompt's character encoding ([code page](http://en.wikipedia.org/wiki/Windows_code_page)) to UTF-8 so Jekyll runs without errors. For Ruby 2.0.0, run `chcp 65001` first. For Ruby 1.9.3, you can alternatively do `SET LANG=en_EN.UTF-8`.
3. Open <http://localhost:9001> in your browser.

Learn more about using Jekyll by reading its [documentation](http://jekyllrb.com/docs/home/).


## Compiling CSS and JavaScript

Ghost-UI uses [Grunt](http://gruntjs.com/) with convenient methods for working with the framework. It's how we compile our code, run tests, and more. To use it, install the required dependencies as directed below and then check out the available Grunt commands.


### Install Dependencies

From the command line:

1. Install Ruby and bundler globally with `gem install bundler`.
2. Install Ruby dependencies with `bundle install`.
3. Install `grunt-cli` globally with `npm install -g grunt-cli`.
4. Navigate to the root `/Ghost-UI` directory, then run `npm install`. npm will look at [package.json](https://github.com/TryGhost/Ghost-UI/blob/master/package.json) and automatically install the necessary local dependencies listed there.

When completed, you'll be able to run the various Grunt commands provided from the command line.

**Unfamiliar with `npm`? Don't have node installed?** That's a-okay. [npm](http://npmjs.org/) is the node.js package manager, it allows you to install and easily manage development dependencies. [Download and install node.js](http://nodejs.org/download/) before proceeding.


### Available Grunt Commands

#### $ grunt
Run `grunt` to run tests locally and compile the CSS and JavaScript into `/dist`. **Uses [Sass](http://sass-lang.com/) and [UglifyJS](http://lisperator.net/uglifyjs/).**

#### $ grunt dist
`grunt dist` creates the `/dist` directory with compiled files. **Uses [Sass](http://sass-lang.com/) and [UglifyJS](http://lisperator.net/uglifyjs/).**

#### $ grunt test
Runs [JSHint](http://jshint.com) and [QUnit](http://qunitjs.com/) tests headlessly in [PhantomJS](http://phantomjs.org/) (used for CI).

#### $ grunt dev
This is a convenience method for watching development files and automatically building them whenever they change.

### Hooking Ghost-UI up to Ghost

Want to see your Ghost-UI changes working live in your local development copy of [Ghost](http://github.com/TryGhost/Ghost)? Check out a copy of both repositories and follow these instructions:

#### Inside the Ghost-UI repo:

* `$ bower link`
* `$ grunt dev`

#### Inside the Ghost repo:

* `$ bower link ghost-ui`
* `$ grunt dev`

Now whenever you save a file in Ghost-UI - the changes will filter into the core Ghost repository.

### Troubleshooting Dependencies

Should you encounter problems with installing dependencies or running Grunt commands, uninstall all previous dependency versions (global and local). Then, rerun `npm install`.


## Contributing

Please read through our [contributing guidelines](https://github.com/TryGhost/Ghost-UI/blob/master/CONTRIBUTING.md). Included are directions for opening issues, coding standards, and notes on development. If your pull request contains JavaScript patches or features, you must include relevant unit tests.


## Community

Keep track of development and community news.

- Follow [@TryGhost on Twitter](http://twitter.com/TryGhost)
- Read and subscribe to [The Ghost Development Blog](http://dev.ghost.org)
- Chat on IRC. On the `irc.freenode.net` server, in the `#ghost` channel
- Participate in [The Ghost Forums](https://ghost.org/forum/) and meet fellow Ghost users


## Versioning

`NB: Pre-1.0 we're play pretty fast and loose with Semver`

For transparency into our release cycle and in striving to maintain backward compatibility, Ghost-UI is maintained under the Semantic Versioning guidelines.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>`

And constructed with the following guidelines:

- Breaking backward compatibility **bumps the major** while resetting minor and patch
- New additions without breaking backward compatibility **bumps the minor** while resetting the patch
- Bug fixes and misc changes **bumps only the patch**

For more information on SemVer, please visit <http://semver.org/>.


## Copyright and License

Copyright (c) 2013-2014 Ghost Foundation - Released under the [MIT license](LICENSE).
