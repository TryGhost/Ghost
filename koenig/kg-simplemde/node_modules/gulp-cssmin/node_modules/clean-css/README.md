[![NPM version](https://img.shields.io/npm/v/clean-css.svg?style=flat)](https://www.npmjs.com/package/clean-css)
[![Linux Build Status](https://img.shields.io/travis/jakubpawlowicz/clean-css/master.svg?style=flat&label=Linux%20build)](https://travis-ci.org/jakubpawlowicz/clean-css)
[![Windows Build status](https://img.shields.io/appveyor/ci/jakubpawlowicz/clean-css/master.svg?style=flat&label=Windows%20build)](https://ci.appveyor.com/project/jakubpawlowicz/clean-css/branch/master)
[![Dependency Status](https://img.shields.io/david/jakubpawlowicz/clean-css.svg?style=flat)](https://david-dm.org/jakubpawlowicz/clean-css)
[![devDependency Status](https://img.shields.io/david/dev/jakubpawlowicz/clean-css.svg?style=flat)](https://david-dm.org/jakubpawlowicz/clean-css#info=devDependencies)

## What is clean-css?

Clean-css is a fast and efficient [Node.js](http://nodejs.org/) library for minifying CSS files.

According to [tests](http://goalsmashers.github.io/css-minification-benchmark/) it is one of the best available.


## Usage

### What are the requirements?

```
Node.js 0.10.0+ (tested on CentOS, Ubuntu, OS X 10.6+, and Windows 7+)
```

### How to install clean-css?

```
npm install clean-css
```

### How to upgrade clean-css from 2.x to 3.x?

#### Command-line interface (CLI) - no breaking changes.

#### Node.js module

* `noAdvanced` became `advanced` - make sure to reverse the value;
* `noAggressiveMerging` became `aggressiveMerging` - make sure to reverse the value;
* `noRebase` became `rebase` - make sure to reverse the value;
* no longer possible to use `CleanCSS` as a function as `new CleanCSS` is always required;
* `minify` method returns a hash instead of a string now, so use `new CleanCSS().minify(source).styles` instead of `new CleanCSS().minify(source)`. This change is due to addition of source-maps.
* `stats`, `errors`, and `warnings` are now a properties of a hash returned by `minify` method (see above) instead of CleanCSS instance.

### How to use clean-css CLI?

Clean-css accepts the following command line arguments (please make sure
you use `<source-file>` as the very last argument to avoid potential issues):

```
cleancss [options] source-file, [source-file, ...]

-h, --help                      Output usage information
-v, --version                   Output the version number
-b, --keep-line-breaks          Keep line breaks
--s0                            Remove all special comments, i.e. /*! comment */
--s1                            Remove all special comments but the first one
-r, --root [root-path]          A root path to which resolve absolute @import rules
                                and rebase relative URLs
-o, --output [output-file]      Use [output-file] as output instead of STDOUT
-s, --skip-import               Disable @import processing
--skip-rebase                   Disable URLs rebasing
--skip-advanced                 Disable advanced optimizations - selector & property merging,
                                reduction, etc.
--skip-aggressive-merging       Disable properties merging based on their order
--skip-media-merging            Disable `@media` merging
--skip-restructuring            Disable restructuring optimizations
--skip-shorthand-compacting     Disable shorthand compacting
--rounding-precision [N]        Rounds to `N` decimal places. Defaults to 2. -1 disables rounding.
-c, --compatibility [ie7|ie8]   Force compatibility mode (see Readme for advanced examples)
--source-map                    Enables building input's source map
--source-map-inline-sources     Enables inlining sources inside source map's `sourcesContent` field
--semantic-merging              Enables semantic merging mode by assuming BEM-like content (warning, this may break your styling!)
-d, --debug                     Shows debug information (minification time & compression efficiency)
```

#### Examples:

To minify a **public.css** file into **public-min.css** do:

```
cleancss -o public-min.css public.css
```

To minify the same **public.css** into the standard output skip the `-o` parameter:

```
cleancss public.css
```

More likely you would like to concatenate a couple of files.
If you are on a Unix-like system:

```bash
cat one.css two.css three.css | cleancss -o merged-and-minified.css
```

On Windows:

```bat
type one.css two.css three.css | cleancss -o merged-and-minified.css
```

Or even gzip the result at once:

```bash
cat one.css two.css three.css | cleancss | gzip -9 -c > merged-minified-and-gzipped.css.gz
```

### How to use clean-css programmatically?

```js
var CleanCSS = require('clean-css');
var source = 'a{font-weight:bold;}';
var minified = new CleanCSS().minify(source).styles;
```

CleanCSS constructor accepts a hash as a parameter, i.e.,
`new CleanCSS(options)` with the following options available:

* `advanced` - set to false to disable advanced optimizations - selector & property merging, reduction, etc.
* `aggressiveMerging` - set to false to disable aggressive merging of properties.
* `benchmark` - turns on benchmarking mode measuring time spent on cleaning up (run `npm run bench` to see example)
* `compatibility` - enables compatibility mode, see [below for more examples](#how-to-set-compatibility-mode)
* `debug` - set to true to get minification statistics under `stats` property (see `test/custom-test.js` for examples)
* `inliner` - a hash of options for `@import` inliner, see test/protocol-imports-test.js for examples
* `keepBreaks` - whether to keep line breaks (default is false)
* `keepSpecialComments` - `*` for keeping all (default), `1` for keeping first one only, `0` for removing all
* `mediaMerging` - whether to merge `@media` blocks (default is true)
* `processImport` - whether to process `@import` rules
* `rebase` - set to false to skip URL rebasing
* `relativeTo` - path to **resolve** relative `@import` rules and URLs
* `restructuring` - set to false to disable restructuring in advanced optimizations
* `root` - path to **resolve** absolute `@import` rules and **rebase** relative URLs
* `roundingPrecision` - rounding precision; defaults to `2`; `-1` disables rounding
* `semanticMerging` - set to true to enable semantic merging mode which assumes BEM-like content (default is false as it's highly likely this will break your stylesheets - **use with caution**!)
* `shorthandCompacting` - set to false to skip shorthand compacting (default is true unless sourceMap is set when it's false)
* `sourceMap` - exposes source map under `sourceMap` property, e.g. `new CleanCSS().minify(source).sourceMap` (default is false)
  If input styles are a product of CSS preprocessor (LESS, SASS) an input source map can be passed as a string.
* `sourceMapInlineSources` - set to true to inline sources inside a source map's `sourcesContent` field (defaults to false)
  It is also required to process inlined sources from input source maps.
* `target` - path to a folder or an output file to which **rebase** all URLs

The output of `minify` method (or the 2nd argument to passed callback) is a hash containing the following fields:

* `styles` - optimized output CSS as a string
* `sourceMap` - output source map (if requested with `sourceMap` option)
* `errors` - a list of errors raised
* `warnings` - a list of warnings raised
* `stats` - a hash of statistic information (if requested with `debug` option):
  * `originalSize` - original content size (after import inlining)
  * `minifiedSize` - optimized content size
  * `timeSpent` - time spent on optimizations
  * `efficiency` - a ratio of output size to input size (e.g. 25% if content was reduced from 100 bytes to 75 bytes)

#### How to make sure remote `@import`s are processed correctly?

In order to inline remote `@import` statements you need to provide a callback to minify method, e.g.:

```js
var CleanCSS = require('clean-css');
var source = '@import url(http://path/to/remote/styles);';
new CleanCSS().minify(source, function (errors, minified) {
  // minified.styles
});
```

This is due to a fact, that, while local files can be read synchronously, remote resources can only be processed asynchronously.
If you don't provide a callback, then remote `@import`s will be left intact.

### How to use clean-css with build tools?

* [Broccoli](https://github.com/broccolijs/broccoli#broccoli): [broccoli-clean-css](https://github.com/shinnn/broccoli-clean-css)
* [Brunch](http://brunch.io/): [clean-css-brunch](https://github.com/brunch/clean-css-brunch)
* [Grunt](http://gruntjs.com): [grunt-contrib-cssmin](https://github.com/gruntjs/grunt-contrib-cssmin)
* [Gulp](http://gulpjs.com/): [gulp-minify-css](https://github.com/jonathanepollack/gulp-minify-css)
* [Gulp](http://gulpjs.com/): [using vinyl-map as a wrapper - courtesy of @sogko](https://github.com/jakubpawlowicz/clean-css/issues/342)
* [component-builder2](https://github.com/component/builder2.js): [builder-clean-css](https://github.com/poying/builder-clean-css)
* [Metalsmith](http://metalsmith.io): [metalsmith-clean-css](https://github.com/aymericbeaumet/metalsmith-clean-css)

### What are the clean-css' dev commands?

First clone the source, then run:

* `npm run bench` for clean-css benchmarks (see [test/bench.js](https://github.com/jakubpawlowicz/clean-css/blob/master/test/bench.js) for details)
* `npm run browserify` to create the browser-ready clean-css version
* `npm run check` to check JS sources with [JSHint](https://github.com/jshint/jshint/)
* `npm test` for the test suite

## How to contribute to clean-css?

See [CONTRIBUTING.md](https://github.com/jakubpawlowicz/clean-css/blob/master/CONTRIBUTING.md).

## Tips & Tricks

### How to preserve a comment block?

Use the `/*!` notation instead of the standard one `/*`:

```css
/*!
  Important comments included in minified output.
*/
```

### How to rebase relative image URLs

Clean-css will handle it automatically for you (since version 1.1) in the following cases:

* When using the CLI:
  1. Use an output path via `-o`/`--output` to rebase URLs as relative to the output file.
  2. Use a root path via `-r`/`--root` to rebase URLs as absolute from the given root path.
  3. If you specify both then `-r`/`--root` takes precendence.
* When using clean-css as a library:
  1. Use a combination of `relativeTo` and `target` options for relative rebase (same as 1 in CLI).
  2. Use a combination of `relativeTo` and `root` options for absolute rebase (same as 2 in CLI).
  3. `root` takes precendence over `target` as in CLI.

### How to generate source maps

Source maps are supported since version 3.0.

Additionally to mapping original CSS files, clean-css also supports input source maps, so minified styles can be mapped into their [LESS](http://lesscss.org/) or [SASS](http://sass-lang.com/) sources directly.

Source maps are generated using [source-map](https://github.com/mozilla/source-map/) module from Mozilla.

#### Using CLI

To generate a source map, use `--source-map` switch, e.g.:

```
cleancss --source-map --output styles.min.css styles.css
```

Name of the output file is required, so a map file, named by adding `.map` suffix to output file name, can be created (styles.min.css.map in this case).

#### Using API

To generate a source map, use `sourceMap: true` option, e.g.:

```js
new CleanCSS({ sourceMap: true, target: pathToOutputDirectory })
  .minify(source, function (minified) {
    // access minified.sourceMap for SourceMapGenerator object
    // see https://github.com/mozilla/source-map/#sourcemapgenerator for more details
    // see https://github.com/jakubpawlowicz/clean-css/blob/master/bin/cleancss#L114 on how it's used in clean-css' CLI
});
```

Using API you can also pass an input source map directly:

```js
new CleanCSS({ sourceMap: inputSourceMapAsString, target: pathToOutputDirectory })
  .minify(source, function (minified) {
    // access minified.sourceMap to access SourceMapGenerator object
    // see https://github.com/mozilla/source-map/#sourcemapgenerator for more details
    // see https://github.com/jakubpawlowicz/clean-css/blob/master/bin/cleancss#L114 on how it's used in clean-css' CLI
});
```

Or even multiple input source maps at once (available since version 3.1):

```js
new CleanCSS({ sourceMap: true, target: pathToOutputDirectory }).minify({
  'path/to/source/1': {
    styles: '...styles...',
    sourceMap: '...source-map...'
  },
  'path/to/source/2': {
    styles: '...styles...',
    sourceMap: '...source-map...'
  }
}, function (minified) {
  // access minified.sourceMap as above
});
```

### How to minify multiple files with API

#### Passing an array

```js
new CleanCSS().minify(['path/to/file/one', 'path/to/file/two']);
```

#### Passing a hash

```js
new CleanCSS().minify({
  'path/to/file/one': {
    styles: 'contents of file one'
  },
  'path/to/file/two': {
    styles: 'contents of file two'
  }
});
```

### How to set compatibility mode

Compatibility settings are controlled by `--compatibility` switch (CLI) and `compatibility` option (library mode).

In both modes the following values are allowed:

* `'ie7'` - Internet Explorer 7 compatibility mode
* `'ie8'` - Internet Explorer 8 compatibility mode
* `''` or `'*'` (default) - Internet Explorer 9+ compatibility mode

Since clean-css 3 a fine grained control is available over
[those settings](https://github.com/jakubpawlowicz/clean-css/blob/master/lib/utils/compatibility.js),
with the following options available:

* `'[+-]colors.opacity'` - - turn on (+) / off (-) `rgba()` / `hsla()` declarations removal
* `'[+-]properties.backgroundClipMerging'` - turn on / off background-clip merging into shorthand
* `'[+-]properties.backgroundOriginMerging'` - turn on / off background-origin merging into shorthand
* `'[+-]properties.backgroundSizeMerging'` - turn on / off background-size merging into shorthand
* `'[+-]properties.colors'` - turn on / off any color optimizations
* `'[+-]properties.iePrefixHack'` - turn on / off IE prefix hack removal
* `'[+-]properties.ieSuffixHack'` - turn on / off IE suffix hack removal
* `'[+-]properties.merging'` - turn on / off property merging based on understandability
* `'[+-]properties.spaceAfterClosingBrace'` - turn on / off removing space after closing brace - `url() no-repeat` into `url()no-repeat`
* `'[+-]properties.urlQuotes'` - turn on / off `url()` quoting
* `'[+-]properties.zeroUnits'` - turn on / off units removal after a `0` value
* `'[+-]selectors.adjacentSpace'` - turn on / off extra space before `nav` element
* `'[+-]selectors.ie7Hack'` - turn on / off IE7 selector hack removal (`*+html...`)
* `'[+-]selectors.special'` - a regular expression with all special, unmergeable selectors (leave it empty unless you know what you are doing)
* `'[+-]units.ch'` - turn on / off treating `ch` as a proper unit
* `'[+-]units.rem'` - turn on / off treating `rem` as a proper unit
* `'[+-]units.vh'` - turn on / off treating `vh` as a proper unit
* `'[+-]units.vm'` - turn on / off treating `vm` as a proper unit
* `'[+-]units.vmax'` - turn on / off treating `vmax` as a proper unit
* `'[+-]units.vmin'` - turn on / off treating `vmin` as a proper unit
* `'[+-]units.vm'` - turn on / off treating `vm` as a proper unit

For example, using `--compatibility 'ie8,+units.rem'` will ensure IE8 compatiblity while enabling `rem` units so the following style `margin:0px 0rem` can be shortened to `margin:0`, while in pure IE8 mode it can't be.

To pass a single off (-) switch in CLI please use the following syntax `--compatibility *,-units.rem`.

In library mode you can also pass `compatiblity` as a hash of options.

## Acknowledgments (sorted alphabetically)

* Anthony Barre ([@abarre](https://github.com/abarre)) for improvements to
  `@import` processing, namely introducing the `--skip-import` /
  `processImport` options.
* Simon Altschuler ([@altschuler](https://github.com/altschuler)) for fixing
  `@import` processing inside comments.
* Isaac ([@facelessuser](https://github.com/facelessuser)) for pointing out
  a flaw in clean-css' stateless mode.
* Jan Michael Alonzo ([@jmalonzo](https://github.com/jmalonzo)) for a patch
  removing node.js' old `sys` package.
* Luke Page ([@lukeapage](https://github.com/lukeapage)) for suggestions and testing the source maps feature.
  Plus everyone else involved in [#125](https://github.com/jakubpawlowicz/clean-css/issues/125) for pushing it forward.
* Timur Kristóf ([@Venemo](https://github.com/Venemo)) for an outstanding
  contribution of advanced property optimizer for 2.2 release.
* Vincent Voyer ([@vvo](https://github.com/vvo)) for a patch with better
  empty element regex and for inspiring us to do many performance improvements
  in 0.4 release.
* [@XhmikosR](https://github.com/XhmikosR) for suggesting new features
  (option to remove special comments and strip out URLs quotation) and
  pointing out numerous improvements (JSHint, media queries).

## License

Clean-css is released under the [MIT License](https://github.com/jakubpawlowicz/clean-css/blob/master/LICENSE).
