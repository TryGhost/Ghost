2.0.0 / 2014-10-21
==================

 * remove: support for node 0.6.x, 0.4.x
 * fix: landing reporter with non ansi characters (#211)
 * fix: html reporter - preserve query params when navigating to suites/tests (#1358)
 * fix: json stream reporter add error message to failed test
 * fix: fixes for visionmedia -> mochajs
 * fix: use stdio, fixes node deprecation warnings (#1391)

1.21.5 / 2014-10-11
==================

 * fix: build for NodeJS v0.6.x
 * fix: do not attempt to highlight syntax when non-HTML reporter is used
 * update: escape-string-regexp to 1.0.2.
 * fix: botched indentation in canonicalize()
 * fix: .gitignore: ignore .patch and .diff files
 * fix: changed 'Catched' to 'Caught' in uncaught exception error handler messages
 * add: `pending` field for json reporter
 * fix: Runner.prototype.uncaught: don't double-end runnables that already have a state.
 * fix: --recursive, broken by f0facd2e
 * update: replaces escapeRegexp with the escape-string-regexp package.
 * update: commander to 2.3.0.
 * update: diff to 1.0.8.
 * fix: ability to disable syntax highlighting (#1329)
 * fix: added empty object to errorJSON() call to catch when no error is present
 * fix: never time out after calling enableTimeouts(false)
 * fix: timeout(0) will work at suite level (#1300)
 * Fix for --watch+only() issue (#888 )
 * fix: respect err.showDiff, add Base reporter test (#810)

1.22.1-3 / 2014-07-27
==================

  * fix: disabling timeouts with this.timeout(0) (#1301)

1.22.1-3 / 2014-07-27
==================

  * fix: local uis and reporters (#1288)
  * fix: building 1.21.0's changes in the browser (#1284)

1.21.0 / 2014-07-23
==================

  * add: --no-timeouts option (#1262, #1268)
  * add: --*- deprecation node flags (#1217)
  * add: --watch-extensions argument (#1247)
  * change: spec reporter is default (#1228)
  * fix: diff output showing incorrect +/- (#1182)
  * fix: diffs of circular structures (#1179)
  * fix: re-render the progress bar when progress has changed only (#1151)
  * fix support for environments with global and window (#1159)
  * fix: reverting to previously defined onerror handler (#1178)
  * fix: stringify non error objects passed to done() (#1270)
  * fix: using local ui, reporters (#1267)
  * fix: cleaning es6 arrows (#1176)
  * fix: don't include attrs in failure tag for xunit (#1244)
  * fix: fail tests that return a promise if promise is rejected w/o a reason (#1224)
  * fix: showing failed tests in doc reporter (#1117)
  * fix: dot reporter dots being off (#1204)
  * fix: catch empty throws (#1219)
  * fix: honoring timeout for sync operations (#1242)
  * update: growl to 1.8.0

1.20.1 / 2014-06-03
==================

  * update: should dev dependency to ~4.0.0 (#1231)

1.20.0 / 2014-05-28
==================

  * add: filenames to suite objects (#1222)

1.19.0 / 2014-05-17
==================

  * add: browser script option to package.json
  * add: export file in Mocha.Test objects (#1174)
  * add: add docs for wrapped node flags
  * fix: mocha.run() to return error status in browser (#1216)
  * fix: clean() to show failure details (#1205)
  * fix: regex that generates html for new keyword (#1201)
  * fix: sibling suites have inherited but separate contexts (#1164)


1.18.2 / 2014-03-18
==================

  * fix: html runner was prevented from using #mocha as the default root el (#1162)

1.18.1 / 2014-03-18
==================

  * fix: named before/after hooks in bdd, tdd, qunit interfaces (#1161)

1.18.0 / 2014-03-13
==================

  * add: promise support (#329)
  * add: named before/after hooks (#966)

1.17.1 / 2014-01-22
==================

  * fix: expected messages in should.js (should.js#168)
  * fix: expect errno global in node versions < v0.9.11 (#1111)
  * fix: unreliable checkGlobals optimization (#1110)

1.17.0 / 2014-01-09
==================

  * add: able to require globals (describe, it, etc.) through mocha (#1077)
  * fix: abort previous run on --watch change (#1100)
  * fix: reset context for each --watch triggered run (#1099)
  * fix: error when cli can't resolve path or pattern (#799)
  * fix: canonicalize objects before stringifying and diffing them (#1079)
  * fix: make CR call behave like carriage return for non tty (#1087)


1.16.2 / 2013-12-23
==================

  * fix: couple issues with ie 8 (#1082, #1081)
  * fix: issue running the xunit reporter in browsers (#1068)
  * fix: issue with firefox < 3.5 (#725)


1.16.1 / 2013-12-19
==================

  * fix: recompiled for missed changes from the last release


1.16.0 / 2013-12-19
==================

  * add: Runnable.globals(arr) for per test global whitelist (#1046)
  * add: mocha.throwError(err) for assertion libs to call (#985)
  * remove: --watch's spinner (#806)
  * fix: duplicate test output for multi-line specs in spec reporter (#1006)
  * fix: gracefully exit on SIGINT (#1063)
  * fix expose the specified ui only in the browser (#984)
  * fix: ensure process exit code is preserved when using --no-exit (#1059)
  * fix: return true from window.onerror handler (#868)
  * fix: xunit reporter to use process.stdout.write (#1068)
  * fix: utils.clean(str) indentation (#761)
  * fix: xunit reporter returning test duration a NaN (#1039)

1.15.1 / 2013-12-03
==================

  * fix: recompiled for missed changes from the last release

1.15.0 / 2013-12-02
==================

  * add: `--no-exit` to prevent `process.exit()` (#1018)
  * fix: using inline diffs (#1044)
  * fix: show pending test details in xunit reporter (#1051)
  * fix: faster global leak detection (#1024)
  * fix: yui compression (#1035)
  * fix: wrapping long lines in test results (#1030, #1031)
  * fix: handle errors in hooks (#1043)

1.14.0 / 2013-11-02
==================

  * add: unified diff (#862)
  * add: set MOCHA_COLORS env var to use colors (#965)
  * add: able to override tests links in html reporters (#776)
  * remove: teamcity reporter (#954)
  * update: commander dependency to 2.0.0 (#1010)
  * fix: mocha --ui will try to require the ui if not built in, as --reporter does (#1022)
  * fix: send cursor commands only if isatty (#184, #1003)
  * fix: include assertion message in base reporter (#993, #991)
  * fix: consistent return of it, it.only, and describe, describe.only (#840)

1.13.0 / 2013-09-15
==================

  * add: sort test files with --sort (#813)
  * update: diff depedency to 1.0.7
  * update: glob dependency to 3.2.3 (#927)
  * fix: diffs show whitespace differences (#976)
  * fix: improve global leaks (#783)
  * fix: firefox window.getInterface leak
  * fix: accessing iframe via window[iframeIndex] leak
  * fix: faster global leak checking
  * fix: reporter pending css selector (#970)

1.12.1 / 2013-08-29
==================

 * remove test.js from .gitignore
 * update included version of ms.js

1.12.0 / 2013-07-01
==================

 * add: prevent diffs for differing types. Closes #900
 * add `Mocha.process` hack for phantomjs
 * fix: use compilers with requires
 * fix regexps in diffs. Closes #890
 * fix xunit NaN on failure. Closes #894
 * fix: strip tab indentation in `clean` utility method
 * fix: textmate bundle installation

1.11.0 / 2013-06-12
==================

 * add --prof support
 * add --harmony support
 * add --harmony-generators support
 * add "Uncaught " prefix to uncaught exceptions
 * add web workers support
 * add `suite.skip()`
 * change to output # of pending / passing even on failures. Closes #872
 * fix: prevent hooks from being called if we are bailing
 * fix `this.timeout(0)`

1.10.0 / 2013-05-21
==================

 * add add better globbing support for windows via `glob` module
 * add support to pass through flags such as --debug-brk=1234. Closes #852
 * add test.only, test.skip to qunit interface
 * change to always use word-based diffs for now. Closes #733
 * change `mocha init` tests.html to index.html
 * fix `process` global leak in the browser
 * fix: use resolve() instead of join() for --require
 * fix: filterLeaks() condition to not consider indices in global object as leaks
 * fix: restrict mocha.css styling to #mocha id
 * fix: save timer references to avoid Sinon interfering in the browser build.

1.9.0 / 2013-04-03
==================

  * add improved setImmediate implementation
  * replace --ignore-leaks with --check-leaks
  * change default of ignoreLeaks to true. Closes #791
  * remove scrolling for HTML reporter
  * fix retina support
  * fix tmbundle, restrict to js scope

1.8.2 / 2013-03-11
==================

  * add `setImmediate` support for 0.10.x
  * fix mocha -w spinner on windows

1.8.1 / 2013-01-09
==================

  * fix .bail() arity check causing it to default to true

1.8.0 / 2013-01-08
==================

  * add Mocha() options bail support
  * add `Mocha#bail()` method
  * add instanceof check back for inheriting from Error
  * add component.json
  * add diff.js to browser build
  * update growl
  * fix TAP reporter failures comment :D

1.7.4 / 2012-12-06
==================

  * add total number of passes and failures to TAP
  * remove .bind() calls. re #680
  * fix indexOf. Closes #680

1.7.3 / 2012-11-30
==================

  * fix uncaught error support for the browser
  * revert uncaught "fix" which breaks node

1.7.2 / 2012-11-28
==================

  * fix uncaught errors to expose the original error message

1.7.0 / 2012-11-07
==================

  * add `--async-only` support to prevent false positives for missing `done()`
  * add sorting by filename in code coverage
  * add HTML 5 doctype to browser template.
  * add play button to html reporter to rerun a single test
  * add `this.timeout(ms)` as Suite#timeout(ms). Closes #599
  * update growl dependency to 1.6.x
  * fix encoding of test-case ?grep. Closes #637
  * fix unicode chars on windows
  * fix dom globals in Opera/IE. Closes #243
  * fix markdown reporter a tags
  * fix `this.timeout("5s")` support

1.6.0 / 2012-10-02
==================

  * add object diffs when `err.showDiff` is present
  * add hiding of empty suites when pass/failures are toggled
  * add faster `.length` checks to `checkGlobals()` before performing the filter

1.5.0 / 2012-09-21
==================

  * add `ms()` to `.slow()` and `.timeout()`
  * add `Mocha#checkLeaks()` to re-enable global leak checks
  * add `this.slow()` option [aheckmann]
  * add tab, CR, LF to error diffs for now
  * add faster `.checkGlobals()` solution [guille]
  * remove `fn.call()` from reduce util
  * remove `fn.call()` from filter util
  * fix forEach. Closes #582
  * fix relaying of signals [TooTallNate]
  * fix TAP reporter grep number

1.4.2 / 2012-09-01
==================

  * add support to multiple `Mocha#globals()` calls, and strings
  * add `mocha.reporter()` constructor support [jfirebaugh]
  * add `mocha.timeout()`
  * move query-string parser to utils.js
  * move highlight code to utils.js
  * fix third-party reporter support [exogen]
  * fix client-side API to match node-side [jfirebaugh]
  * fix mocha in iframe [joliss]

1.4.1 / 2012-08-28
==================

  * add missing `Markdown` export
  * fix `Mocha#grep()`, escape regexp strings
  * fix reference error when `devicePixelRatio` is not defined. Closes #549

1.4.0 / 2012-08-22
==================

  * add mkdir -p to `mocha init`. Closes #539
  * add `.only()`. Closes #524
  * add `.skip()`. Closes #524
  * change str.trim() to use utils.trim(). Closes #533
  * fix HTML progress indicator retina display
  * fix url-encoding of click-to-grep HTML functionality

1.3.2 / 2012-08-01
==================

  * fix exports double-execution regression. Closes #531

1.3.1 / 2012-08-01
==================

  * add passes/failures toggling to HTML reporter
  * add pending state to `xit()` and `xdescribe()` [Brian Moore]
  * add the @charset "UTF-8"; to fix #522 with FireFox. [Jonathan Creamer]
  * add border-bottom to #stats links
  * add check for runnable in `Runner#uncaught()`. Closes #494
  * add 0.4 and 0.6 back to travis.yml
  * add `-E, --growl-errors` to growl on failures only
  * add prefixes to debug() names. Closes #497
  * add `Mocha#invert()` to js api
  * change dot reporter to use sexy unicode dots
  * fix error when clicking pending test in HTML reporter
  * fix `make tm`

1.3.0 / 2012-07-05
==================

  * add window scrolling to `HTML` reporter
  * add v8 `--trace-*` option support
  * add support for custom reports via `--reporter MODULE`
  * add `--invert` switch to invert `--grep` matches
  * fix export of `Nyan` reporter. Closes #495
  * fix escaping of `HTML` suite titles. Closes #486
  * fix `done()` called multiple times with an error test
  * change `--grep` - regexp escape the input

1.2.2 / 2012-06-28
==================

  * Added 0.8.0 support

1.2.1 / 2012-06-25
==================

  * Added `this.test.error(err)` support to after each hooks. Closes #287
  * Added: export top-level suite on global mocha object (mocha.suite). Closes #448
  * Fixed `js` code block format error in markdown reporter
  * Fixed deprecation warning when using `path.existsSync`
  * Fixed --globals with wildcard
  * Fixed chars in nyan when his head moves back
  * Remove `--growl` from test/mocha.opts. Closes #289

1.2.0 / 2012-06-17
==================

  * Added `nyan` reporter [Atsuya Takagi]
  * Added `mocha init <path>` to copy client files
  * Added "specify" synonym for "it" [domenic]
  * Added global leak wildcard support [nathanbowser]
  * Fixed runner emitter leak. closes #432
  * Fixed omission of .js extension. Closes #454

1.1.0 / 2012-05-30
==================

  * Added: check each `mocha(1)` arg for directories to walk
  * Added `--recursive` [tricknotes]
  * Added `context` for BDD [hokaccha]
  * Added styling for new clickable titles
  * Added clickable suite titles to HTML reporter
  * Added warning when strings are thrown as errors
  * Changed: green arrows again in HTML reporter styling
  * Changed ul/li elements instead of divs for better copy-and-pasting [joliss]
  * Fixed issue #325 - add better grep support to js api
  * Fixed: save timer references to avoid Sinon interfering.

1.0.3 / 2012-04-30
==================

  * Fixed string diff newlines
  * Fixed: removed mocha.css target. Closes #401

1.0.2 / 2012-04-25
==================

  * Added HTML reporter duration. Closes #47
  * Fixed: one postMessage event listener [exogen]
  * Fixed: allow --globals to be used multiple times. Closes #100 [brendannee]
  * Fixed #158: removes jquery include from browser tests
  * Fixed grep. Closes #372 [brendannee]
  * Fixed #166 - When grepping don't display the empty suites
  * Removed test/browser/style.css. Closes #385

1.0.1 / 2012-04-04
==================

  * Fixed `.timeout()` in hooks
  * Fixed: allow callback for `mocha.run()` in client version
  * Fixed browser hook error display. Closes #361

1.0.0 / 2012-03-24
==================

  * Added js API. Closes #265
  * Added: initial run of tests with `--watch`. Closes #345
  * Added: mark `location` as a global on the CS. Closes #311
  * Added `markdown` reporter (github flavour)
  * Added: scrolling menu to coverage.html. Closes #335
  * Added source line to html report for Safari [Tyson Tate]
  * Added "min" reporter, useful for `--watch` [Jakub Nešetřil]
  * Added support for arbitrary compilers via . Closes #338 [Ian Young]
  * Added Teamcity export to lib/reporters/index [Michael Riley]
  * Fixed chopping of first char in error reporting. Closes #334 [reported by topfunky]
  * Fixed terrible FF / Opera stack traces

0.14.1 / 2012-03-06
==================

  * Added lib-cov to _.npmignore_
  * Added reporter to `mocha.run([reporter])` as argument
  * Added some margin-top to the HTML reporter
  * Removed jQuery dependency
  * Fixed `--watch`: purge require cache. Closes #266

0.14.0 / 2012-03-01
==================

  * Added string diff support for terminal reporters

0.13.0 / 2012-02-23
==================

  * Added preliminary test coverage support. Closes #5
  * Added `HTMLCov` reporter
  * Added `JSONCov` reporter [kunklejr]
  * Added `xdescribe()` and `xit()` to the BDD interface. Closes #263 (docs   * Changed: make json reporter output pretty json
  * Fixed node-inspector support, swapped `--debug` for `debug` to match node.
needed)
Closes #247

0.12.1 / 2012-02-14
==================

  * Added `npm docs mocha` support [TooTallNate]
  * Added a `Context` object used for hook and test-case this. Closes #253
  * Fixed `Suite#clone()` `.ctx` reference. Closes #262

0.12.0 / 2012-02-02
==================

  * Added .coffee `--watch` support. Closes #242
  * Added support to `--require` files relative to the CWD. Closes #241
  * Added quick n dirty syntax highlighting. Closes #248
  * Changed: made HTML progress indicator smaller
  * Fixed xunit errors attribute [dhendo]

0.10.2 / 2012-01-21
==================

  * Fixed suite count in reporter stats. Closes #222
  * Fixed `done()` after timeout error reporting [Phil Sung]
  * Changed the 0-based errors to 1

0.10.1 / 2012-01-17
==================

  * Added support for node 0.7.x
  * Fixed absolute path support. Closes #215 [kompiro]
  * Fixed `--no-colors` option [Jussi Virtanen]
  * Fixed Arial CSS typo in the correct file

0.10.0 / 2012-01-13
==================

  * Added `-b, --bail` to exit on first exception [guillermo]
  * Added support for `-gc` / `--expose-gc` [TooTallNate]
  * Added `qunit`-inspired interface
  * Added MIT LICENSE. Closes #194
  * Added: `--watch` all .js in the CWD. Closes #139
  * Fixed `self.test` reference in runner. Closes #189
  * Fixed double reporting of uncaught exceptions after timeout. Closes #195

0.8.2 / 2012-01-05
==================

  * Added test-case context support. Closes #113
  * Fixed exit status. Closes #187
  * Update commander. Closes #190

0.8.1 / 2011-12-30
==================

  * Fixed reporting of uncaught exceptions. Closes #183
  * Fixed error message defaulting [indutny]
  * Changed mocha(1) from bash to node for windows [Nathan Rajlich]

0.8.0 / 2011-12-28
==================

  * Added `XUnit` reporter [FeeFighters/visionmedia]
  * Added `say(1)` notification support [Maciej Małecki]
  * Changed: fail when done() is invoked with a non-Error. Closes #171
  * Fixed `err.stack`, defaulting to message. Closes #180
  * Fixed: `make tm` mkdir -p the dest. Closes #137
  * Fixed mocha(1) --help bin name
  * Fixed `-d` for `--debug` support

0.7.1 / 2011-12-22
==================

  * Removed `mocha-debug(1)`, use `mocha --debug`
  * Fixed CWD relative requires
  * Fixed growl issue on windows [Raynos]
  * Fixed: platform specific line endings [TooTallNate]
  * Fixed: escape strings in HTML reporter. Closes #164

0.7.0 / 2011-12-18
==================

  * Added support for IE{7,8} [guille]
  * Changed: better browser nextTick implementation [guille]

0.6.0 / 2011-12-18
==================

  * Added setZeroTimeout timeout for browser (nicer stack traces). Closes #153
  * Added "view source" on hover for HTML reporter to make it obvious
  * Changed: replace custom growl with growl lib
  * Fixed duplicate reporting for HTML reporter. Closes #154
  * Fixed silent hook errors in the HTML reporter. Closes #150

0.5.0 / 2011-12-14
==================

  * Added: push node_modules directory onto module.paths for relative require Closes #93
  * Added teamcity reporter [blindsey]
  * Fixed: recover from uncaught exceptions for tests. Closes #94
  * Fixed: only emit "test end" for uncaught within test, not hook

0.4.0 / 2011-12-14
==================

  * Added support for test-specific timeouts via `this.timeout(0)`. Closes #134
  * Added guillermo's client-side EventEmitter. Closes #132
  * Added progress indicator to the HTML reporter
  * Fixed slow browser tests. Closes #135
  * Fixed "suite" color for light terminals
  * Fixed `require()` leak spotted by [guillermo]

0.3.6 / 2011-12-09
==================

  * Removed suite merging (for now)

0.3.5 / 2011-12-08
==================

  * Added support for `window.onerror` [guillermo]
  * Fixed: clear timeout on uncaught exceptions. Closes #131 [guillermo]
  * Added `mocha.css` to PHONY list.
  * Added `mocha.js` to PHONY list.

0.3.4 / 2011-12-08
==================

  * Added: allow `done()` to be called with non-Error
  * Added: return Runner from `mocha.run()`. Closes #126
  * Fixed: run afterEach even on failures. Closes #125
  * Fixed clobbering of current runnable. Closes #121

0.3.3 / 2011-12-08
==================

  * Fixed hook timeouts. Closes #120
  * Fixed uncaught exceptions in hooks

0.3.2 / 2011-12-05
==================

  * Fixed weird reporting when `err.message` is not present

0.3.1 / 2011-12-04
==================

  * Fixed hook event emitter leak. Closes #117
  * Fixed: export `Spec` constructor. Closes #116

0.3.0 / 2011-12-04
==================

  * Added `-w, --watch`. Closes #72
  * Added `--ignore-leaks` to ignore global leak checking
  * Added browser `?grep=pattern` support
  * Added `--globals <names>` to specify accepted globals. Closes #99
  * Fixed `mocha-debug(1)` on some systems. Closes #232
  * Fixed growl total, use `runner.total`

0.2.0 / 2011-11-30
==================

  * Added `--globals <names>` to specify accepted globals. Closes #99
  * Fixed funky highlighting of messages. Closes #97
  * Fixed `mocha-debug(1)`. Closes #232
  * Fixed growl total, use runner.total

0.1.0 / 2011-11-29
==================

  * Added `suiteSetup` and `suiteTeardown` to TDD interface [David Henderson]
  * Added growl icons. Closes #84
  * Fixed coffee-script support

0.0.8 / 2011-11-25
==================

  * Fixed: use `Runner#total` for accurate reporting

0.0.7 / 2011-11-25
==================

  * Added `Hook`
  * Added `Runnable`
  * Changed: `Test` is `Runnable`
  * Fixed global leak reporting in hooks
  * Fixed: > 2 calls to done() only report the error once
  * Fixed: clear timer on failure. Closes #80

0.0.6 / 2011-11-25
==================

  * Fixed return on immediate async error. Closes #80

0.0.5 / 2011-11-24
==================

  * Fixed: make mocha.opts whitespace less picky [kkaefer]

0.0.4 / 2011-11-24
==================

  * Added `--interfaces`
  * Added `--reporters`
  * Added `-c, --colors`. Closes #69
  * Fixed hook timeouts

0.0.3 / 2011-11-23
==================

  * Added `-C, --no-colors` to explicitly disable
  * Added coffee-script support

0.0.2 / 2011-11-22
==================

  * Fixed global leak detection due to Safari bind() change
  * Fixed: escape html entities in Doc reporter
  * Fixed: escape html entities in HTML reporter
  * Fixed pending test support for HTML reporter. Closes #66

0.0.1 / 2011-11-22
==================

  * Added `--timeout` second shorthand support, ex `--timeout 3s`.
  * Fixed "test end" event for uncaughtExceptions. Closes #61

0.0.1-alpha6 / 2011-11-19
==================

  * Added travis CI support (needs enabling when public)
  * Added preliminary browser support
  * Added `make mocha.css` target. Closes #45
  * Added stack trace to TAP errors. Closes #52
  * Renamed tearDown to teardown. Closes #49
  * Fixed: cascading hooksc. Closes #30
  * Fixed some colors for non-tty
  * Fixed errors thrown in sync test-cases due to nextTick
  * Fixed Base.window.width... again give precedence to 0.6.x

0.0.1-alpha5 / 2011-11-17
==================

  * Added `doc` reporter. Closes #33
  * Added suite merging. Closes #28
  * Added TextMate bundle and `make tm`. Closes #20

0.0.1-alpha4 / 2011-11-15
==================

  * Fixed getWindowSize() for 0.4.x

0.0.1-alpha3 / 2011-11-15
==================

  * Added `-s, --slow <ms>` to specify "slow" test threshold
  * Added `mocha-debug(1)`
  * Added `mocha.opts` support. Closes #31
  * Added: default [files] to _test/*.js_
  * Added protection against multiple calls to `done()`. Closes #35
  * Changed: bright yellow for slow Dot reporter tests

0.0.1-alpha1 / 2011-11-08
==================

  * Missed this one :)

0.0.1-alpha1 / 2011-11-08
==================

  * Initial release
