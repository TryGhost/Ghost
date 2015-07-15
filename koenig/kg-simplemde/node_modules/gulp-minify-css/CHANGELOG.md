# Change Log

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org/).

## [1.2.0] - 2015-06-25

- dependency
  * Use [readable-stream](https://github.com/nodejs/readable-stream) instead of [through2](https://github.com/rvagg/through2)

## [1.1.6] - 2015-06-04

- dependency
  * Bump [object-assign](https://github.com/sindresorhus/object-assign) to v3.0.0

## [1.1.5] - 2015-06-03

- index.js
  * Fix the relative path problem ([#105](https://github.com/murphydanger/gulp-minify-css/issues/105)) by reproducing the `cleancss` CLI behavior faithfully.

## [1.1.4] - 2015-06-02

- index.js
  * Remove the file-path workarounds since clean-css v3.3.0 treats paths correctly.

## [1.1.3] - 2015-05-31

This version is exactly the same as v1.1.2. See [the discussion about it](https://github.com/murphydanger/gulp-minify-css/commit/a0357378a80845353b496a6f347040b8afbba79b#commitcomment-11456375).

## [1.1.2] - 2015-05-31

### Changed

- Reflect the update of the repository owner name.

## [1.1.1] - 2015-05-03

### Changed

- index.js
  * Improve path handlong for more correct Source Map. ([#89](https://github.com/jonathanepollack/gulp-minify-css/issues/89))

## [1.1.0] - 2015-04-21

### Added

- CHANGELOG.md for project clarity.

### Changed

- index.js
  * Follow th internal changes of clean-css v3.2.x

## [1.0.0] - 2015-03-10

### Changed

- test/sourceMaps.js
  * gulp-sourcemaps doesn’t support stream mode, so we don’t need to test the result of Source Map in stream mode.
- README.md
  * 'Breaking Changes' section removed, as those changes are now 3 months old and are no longer surprising.


### Removed

- `cache` option -- this violated the 'do one thing well' principle of gulp.
- test/cache.js
  * No more `cache` option in the API means no need for those tests.