# Members Drop-in script for Ghost themes

## Prerequisites

[Node.js](http://nodejs.org/) >= 6 must be installed.

## Installation

- Running `yarn install` in the module's root directory will install everything you need for development.

## Building

- `yarn build` will build the module for publishing to npm as well as `umd` build for script tag.

- `yarn clean clean` will delete built resources.


## Usage

```html
<script src="members-theme-dropin.min.js"></script>
```

Script is setup to auto-execute on load if it finds relevant data on page.

## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.
