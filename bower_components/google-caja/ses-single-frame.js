// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * This file is concatenated into the top of the iframe scripts that caja.js
 * loads. It supplies the current build version of Caja. This is interpolated
 * into this file via build.xml rules.
 *
 * @provides cajaBuildVersion
 * @overrides window
 */

var cajaBuildVersion = '5669';

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['cajaBuildVersion'] = cajaBuildVersion;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Exports a {@code ses.logger} which logs to the
 * console if one exists.
 *
 * <p>This <code>logger.js</code> file both defines the logger API and
 * provides default implementations for its methods. Because
 * <code>logger.js</code> is normally packaged in
 * <code>initSES.js</code>, it is built to support being overridden by
 * a script run <i>earlier</i>. For example, for better diagnostics,
 * consider loading and initializing <code>useHTMLLogger.js</code> first.
 *
 * <p>The {@code ses.logger} API consists of
 * <dl>
 *   <dt>log, info, warn, and error methods</dt>
 *     <dd>each of which take a list of arguments which should be
 *         stringified and appended together. The logger should
 *         display this string associated with that severity level. If
 *         any of the arguments has an associated stack trace
 *         (presumably Error objects), then the logger <i>may</i> also
 *         show this stack trace. If no {@code ses.logger} already
 *         exists, the default provided here forwards to the
 *         pre-existing global {@code console} if one
 *         exists. Otherwise, all four of these do nothing. If we
 *         default to forwarding to the pre-existing {@code console} ,
 *         we prepend an empty string as first argument since we do
 *         not want to obligate all loggers to implement the console's
 *         "%" formatting. </dd>
 *   <dt>classify(postSeverity)</dt>
 *     <dd>where postSeverity is a severity
 *         record as defined by {@code ses.severities} in
 *         <code>repairES5.js</code>, and returns a helpful record
 *         consisting of a
 *         <dl>
 *           <dt>consoleLevel:</dt>
 *             <dd>which is one of 'log', 'info', 'warn', or
 *                 'error', which can be used to select one of the above
 *                 methods.</dd>
 *           <dt>note:</dt>
 *             <dd>containing some helpful text to display
 *                 explaining the impact of this severity on SES.</dd>
 *         </dl>
 *   <dt>reportRepairs(reports)</dt>
 *     <dd>where {@code reports} is the list of repair reports, each
 *         of which contains
 *       <dl>
 *         <dt>description:</dt>
 *           <dd>a string describing the problem</dd>
 *         <dt>preSeverity:</dt>
 *           <dd>a severity record (as defined by {@code
 *               ses.severities} in <code>repairES5.js</code>)
 *               indicating the level of severity of this problem if
 *               unrepaired. Or, if !canRepair, then the severity
 *               whether or not repaired.</dd>
 *         <dt>canRepair:</dt>
 *           <dd>a boolean indicating "if the repair exists and the test
 *               subsequently does not detect a problem, are we now ok?"</dd>
 *         <dt>urls:</dt>
 *           <dd>a list of URL strings, each of which points at a page
 *               relevant for documenting or tracking the bug in
 *               question. These are typically into bug-threads in issue
 *               trackers for the various browsers.</dd>
 *         <dt>sections:</dt>
 *           <dd>a list of strings, each of which is a relevant ES5.1
 *               section number.</dd>
 *         <dt>tests:</dt>
 *           <dd>a list of strings, each of which is the name of a
 *               relevant test262 or sputnik test case.</dd>
 *         <dt>postSeverity:</dt>
 *           <dd>a severity record (as defined by {@code
 *               ses.severities} in <code>repairES5.js</code>)
 *               indicating the level of severity of this problem
 *               after all repairs have been attempted.</dd>
 *         <dt>beforeFailure:</dt>
 *           <dd>The outcome of the test associated with this record
 *               as run before any attempted repairs. If {@code
 *               false}, it means there was no failure. If {@code
 *               true}, it means that the test fails in some way that
 *               the authors of <code>repairES5.js</code>
 *               expected. Otherwise it returns a string describing
 *               the symptoms of an unexpected form of failure. This
 *               is typically considered a more severe form of failure
 *               than {@code true}, since the authors have not
 *               anticipated the consequences and safety
 *               implications.</dd>
 *         <dt>afterFailure:</dt>
 *           <dd>The outcome of the test associated with this record
 *               as run after all attempted repairs.</dd>
 *       </dl>
 *       The default behavior here is to be silent.</dd>
 *   <dt>reportMax()</dt>
 *     <dd>Displays only a summary of the worst case
 *         severity seen so far, according to {@code ses.maxSeverity} as
 *         interpreted by {@code ses.logger.classify}.</dd>
 *   <dt>reportDiagnosis(severity, status, problemList)</dt>
 *     <dd>where {@code severity} is a severity record, {@code status}
 *         is a brief string description of a list of problems, and
 *         {@code problemList} is a list of strings, each of which is
 *         one occurrence of the described problem.
 *         The default behavior here should only the number of
 *         problems, not the individual problems.</dd>
 *   <dt>beginStartup()</dt>
 *     <dd>Invoked before all other logging.</dd>
 *   <dt>endStartup()</dt>
 *     <dd>Invoked after SES initialization has completed.</dd>
 * </dl>
 *
 * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or
 * anticipated ES6.
 *
 * //provides ses.logger
 * @author Mark S. Miller
 * @requires console
 * @overrides ses, loggerModule
 */
var ses;
if (!ses) { ses = {}; }

(function loggerModule() {
  "use strict";

  var logger;
  function logNowhere(str) {}

  var slice = [].slice;
  var apply = slice.apply;



  if (ses.logger) {
    logger = ses.logger;

  } else if (typeof console !== 'undefined' && 'log' in console) {
    // We no longer test (typeof console.log === 'function') since,
    // on IE9 and IE10preview, in violation of the ES5 spec, it
    // is callable but has typeof "object".
    // See https://connect.microsoft.com/IE/feedback/details/685962/
    //   console-log-and-others-are-callable-but-arent-typeof-function

    // We manually wrap each call to a console method because <ul>
    // <li>On some platforms, these methods depend on their
    //     this-binding being the console.
    // <li>All this has to work on platforms that might not have their
    //     own {@code Function.prototype.bind}, and has to work before
    //     we install an emulated bind.
    // </ul>

    var forward = function(level, args) {
      args = slice.call(args, 0);
      // We don't do "console.apply" because "console" is not a function
      // on IE 10 preview 2 and it has no apply method. But it is a
      // callable that Function.prototype.apply can successfully apply.
      // This code must work on ES3 where there's no bind. When we
      // decide to support defensiveness in realms with mutable
      // primordials, we will need to revisit the "call" below.
      apply.call(console[level], console, [''].concat(args));

      // See debug.js
      var getStack = ses.getStack;
      if (getStack) {
        for (var i = 0, len = args.length; i < len; i++) {
          var stack = getStack(args[i]);
          if (stack) {
            console[level]('', stack);
          }
        }
      }
    };

    logger = {
      log:   function log(var_args)   { forward('log', arguments); },
      info:  function info(var_args)  { forward('info', arguments); },
      warn:  function warn(var_args)  { forward('warn', arguments); },
      error: function error(var_args) { forward('error', arguments); },
      beginStartup: function beginStartup() {
        if (console.groupCollapsed) {
          console.groupCollapsed('SES initialization');
        } else if (console.group) {
          console.group('SES initialization');
        }
      },
      endStartup: function endStartup() {
        if (console.groupEnd) {
          console.groupEnd();
        }
      }
    };
  } else {
    logger = {
      log:   logNowhere,
      info:  logNowhere,
      warn:  logNowhere,
      error: logNowhere
    };
  }

  /**
   * Returns a record that's helpful for displaying a severity.
   *
   * <p>The record contains {@code consoleLevel} and {@code note}
   * properties whose values are strings. The {@code consoleLevel} is
   * {@code "log", "info", "warn", or "error"}, which can be used as
   * method names for {@code logger}, or, in an html context, as a css
   * class name. The {@code note} is a string stating the severity
   * level and its consequences for SES.
   */
  function defaultClassify(postSeverity) {
    var MAX_SES_SAFE = ses.severities.SAFE_SPEC_VIOLATION;

    var consoleLevel = 'log';
    var note = '';
    if (postSeverity.level > ses.severities.SAFE.level) {
      consoleLevel = 'info';
      note = postSeverity.description + '(' + postSeverity.level + ')';
      if (postSeverity.level > ses.maxAcceptableSeverity.level) {
        consoleLevel = 'error';
        note += ' is not suitable for SES';
      } else if (postSeverity.level > MAX_SES_SAFE.level) {
        consoleLevel = 'warn';
        note += ' is not SES-safe';
      }
      note += '.';
    }
    return {
      consoleLevel: consoleLevel,
      note: note
    };
  }

  if (!logger.classify) {
    logger.classify = defaultClassify;
  }

  /**
   * By default is chatty
   */
  function defaultReportRepairs(reports) {
    for (var i = 0; i < reports.length; i++) {
      var report = reports[i];
      if (report.status !== 'All fine') {
        logger.warn(report.status + ': ' + report.description);
      }
    }
  }

  if (!logger.reportRepairs) {
    logger.reportRepairs = defaultReportRepairs;
  }

  /**
   * By default, logs a report suitable for display on the console.
   */
  function defaultReportMax() {
    if (ses.getMaxSeverity().level > ses.severities.SAFE.level) {
      var maxClassification = ses.logger.classify(ses.getMaxSeverity());
      logger[maxClassification.consoleLevel](
        'Max Severity: ' + maxClassification.note);
    }
  }

  if (!logger.reportMax) {
    logger.reportMax = defaultReportMax;
  }

  function defaultReportDiagnosis(severity, status, problemList) {
    var classification = ses.logger.classify(severity);
    ses.logger[classification.consoleLevel](
      problemList.length + ' ' + status);
  }

  if (!logger.reportDiagnosis) {
    logger.reportDiagnosis = defaultReportDiagnosis;
  }

  function defaultBeginEndStartup() {}

  if (!logger.beginStartup) {
    logger.beginStartup = defaultBeginEndStartup;
  }

  if (!logger.endStartup) {
    logger.endStartup = defaultBeginEndStartup;
  }

  ses.logger = logger;

  // No better place to put this at the moment.
  // Balanced by endStartup in hookupSES[Plus].js
  logger.beginStartup();
})();
;
// Copyright (C) 2011-2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Framework for monkey-patching to avoid bugs and add
 * features. Applies only necessary patches and verifies they succeeded.
 *
 * //requires ses.acceptableProblems, ses.maxAcceptableSeverityName
 * //provides ses.statuses, ses.severities, ses._Repairer, ses._repairer,
 * //    ses._EarlyStringMap
 *
 * @author Mark S. Miller
 * @author Kevin Reid
 * @overrides ses
 */

var ses;

(function() {
  "use strict";

  var logger = ses.logger;

  /**
   * The severity levels.
   *
   * <dl>
   *   <dt>MAGICAL_UNICORN</dt>
   *     <dd>Unachievable magical mode used for testing.</dd>
   *   <dt>SAFE</dt><dd>no problem.</dd>
   *   <dt>SAFE_SPEC_VIOLATION</dt>
   *     <dd>safe (in an integrity sense) even if unrepaired. May
   *         still lead to inappropriate failures.</dd>
   *   <dt>UNSAFE_SPEC_VIOLATION</dt>
   *     <dd>a safety issue only indirectly, in that this spec
   *         violation may lead to the corruption of assumptions made
   *         by other security critical or defensive code.</dd>
   *   <dt>NOT_OCAP_SAFE</dt>
   *     <dd>a violation of object-capability rules among objects
   *         within a coarse-grained unit of isolation.</dd>
   *   <dt>NOT_ISOLATED</dt>
   *     <dd>an inability to reliably sandbox even coarse-grain units
   *         of isolation.</dd>
   *   <dt>NEW_SYMPTOM</dt>
   *     <dd>some test failed in a way we did not expect.</dd>
   *   <dt>NOT_SUPPORTED</dt>
   *     <dd>this platform cannot even support SES development in an
   *         unsafe manner.</dd>
   * </dl>
   */
  var severities = ses.severities = {
    MAGICAL_UNICORN:       { level: -1, description: 'Testing only' },
    SAFE:                  { level: 0, description: 'Safe' },
    SAFE_SPEC_VIOLATION:   { level: 1, description: 'Safe spec violation' },
    UNSAFE_SPEC_VIOLATION: { level: 3, description: 'Unsafe spec violation' },
    NOT_OCAP_SAFE:         { level: 4, description: 'Not ocap safe' },
    NOT_ISOLATED:          { level: 5, description: 'Not isolated' },
    NEW_SYMPTOM:           { level: 6, description: 'New symptom' },
    NOT_SUPPORTED:         { level: 7, description: 'Not supported' }
  };

  /**
   * Statuses.
   *
   * <dl>
   *   <dt>ALL_FINE</dt>
   *     <dd>test passed before and after.</dd>
   *   <dt>REPAIR_FAILED</dt>
   *     <dd>test failed before and after repair attempt.</dd>
   *   <dt>NOT_REPAIRED</dt>
   *     <dd>test failed before and after, with no repair to attempt.</dd>
   *   <dt>REPAIR_SKIPPED</dt>
   *     <dd>test failed before and after, and ses.acceptableProblems
   *         specified not to repair it.</dd>
   *   <dt>REPAIRED_UNSAFELY</dt>
   *     <dd>test failed before and passed after repair attempt, but
   *         the repair is known to be inadequate for security, so the
   *         real problem remains.</dd>
   *   <dt>REPAIRED</dt>
   *     <dd>test failed before and passed after repair attempt,
   *         repairing the problem (canRepair was true).</dd>
   *   <dt>ACCIDENTALLY_REPAIRED</dt>
   *      <dd>test failed before and passed after, despite no repair
   *          to attempt. (Must have been fixed by some other
   *          attempted repair.)</dd>
   *   <dt>BROKEN_BY_OTHER_ATTEMPTED_REPAIRS</dt>
   *      <dd>test passed before and failed after, indicating that
   *          some other attempted repair created the problem.</dd>
   * </dl>
   */
  var statuses = ses.statuses = {
    ALL_FINE:                          'All fine',
    REPAIR_FAILED:                     'Repair failed',
    NOT_REPAIRED:                      'Not repaired',
    REPAIR_SKIPPED:                    'Repair skipped',
    REPAIRED_UNSAFELY:                 'Repaired unsafely',
    REPAIRED:                          'Repaired',
    ACCIDENTALLY_REPAIRED:             'Accidentally repaired',
    BROKEN_BY_OTHER_ATTEMPTED_REPAIRS: 'Broken by other attempted repairs'
  };

  function validateSeverityName(severityName, failIfInvalid) {
    if (severityName) {
      var sev = ses.severities[severityName];
      if (sev && typeof sev.level === 'number' &&
        sev.level >= ses.severities.MAGICAL_UNICORN.level &&
        sev.level < ses.severities.NOT_SUPPORTED.level) {
        // do nothing
      } else if (failIfInvalid) {
        throw new RangeError('Bad SES severityName: ' + severityName);
      } else {
        logger.error('Ignoring bad severityName: ' + severityName + '.');
        severityName = 'SAFE_SPEC_VIOLATION';
      }
    } else {
      severityName = 'SAFE_SPEC_VIOLATION';
    }
    return severityName;
  }

  function lookupSeverityName(severityName, failIfInvalid) {
    return ses.severities[validateSeverityName(severityName, failIfInvalid)];
  }

  //////// General utilities /////////

  /**
   * Needs to work on ES3, since we want to correctly report failure
   * on an ES3 platform.
   */
  function strictForEachFn(list, callback) {
    for (var i = 0, len = list.length; i < len; i++) {
      callback(list[i], i);
    }
  }

  /**
   * Needs to work on ES3, since we want to correctly report failure
   * on an ES3 platform.
   */
  function strictMapFn(list, callback) {
    var result = [];
    for (var i = 0, len = list.length; i < len; i++) {
      result.push(callback(list[i], i));
    }
    return result;
  }

  /**
   * The Repairer and several test/repair routines want string-keyed maps.
   * Unfortunately, our exported StringMap is not yet available, and our repairs
   * include one which breaks Object.create(null). So, an ultra-minimal,
   * ES3-compatible implementation.
   */
  function EarlyStringMap() {
    var objAsMap = {};
    var self = {
      get: function(key) {
        return objAsMap[key + '$'];
      },
      set: function(key, value) {
        objAsMap[key + '$'] = value;
      },
      has: function(key) {
        return (key + '$') in objAsMap;
      },
      'delete': function(key) {
        return delete objAsMap[key + '$'];
      },
      forEach: function(callback) {
        for (var key in objAsMap) {
          if (key.lastIndexOf('$') === key.length - 1) {
            callback(objAsMap[key], key.slice(0, -1), self);
          }
        }
      }
    };
    return self;
  }

  // Exported for use in repairES5.js.
  ses._EarlyStringMap = EarlyStringMap;

  //////// The repairer /////////

  /**
   * A Repairer has a table of problems to detect and/or repair, and keeps track
   * of whether they have been (successfully or unsuccessfully) repaired.
   *
   * Ordinary SES initialization has only one Repairer; it is written as a class
   * for testing purposes.
   */
  function Repairer() {
    var self = this;

    /**
     * Configuration: the max post-repair severity that is considered acceptable
     * for SES operation.
     */
    var maxAcceptableSeverity = ses.severities.SAFE;

    /**
     * Configuration: an object whose enumerable keys are problem names and
     * whose values are records containing the following boolean properties,
     * defaulting to false if omitted:
     * <dl>
     *
     * <dt>{@code permit}
     * <dd>If this problem is not repaired, continue even if its severity
     * would otherwise be too great (currentSeverity will be as if this
     * problem does not exist). Use this for problems which are known
     * to be acceptable for the particular use case of SES.
     *
     * <p>THIS CONFIGURATION IS POTENTIALLY EXTREMELY DANGEROUS. Ignoring
     * problems can make SES itself insecure in subtle ways even if you
     * do not use any of the affected features in your own code. Do not
     * use it without full understanding of the implications.
     *
     * <p>TODO(kpreid): Add a flag to problem records to indicate whether
     * the problems may be ignored and check it here.
     * </dd>
     *
     * <dt>{@code doNotRepair}
     * <dd>Do not attempt to repair this problem.
     * Use this for problems whose repairs have unacceptable disadvantages.
     *
     * <p>Observe that if {@code permit} is also false, then this means to
     * abort rather than repairing, whereas if {@code permit} is true then
     * this means to continue without repairing the problem even if it is
     * repairable.
     *
     * </dl>
     */
    var acceptableProblems = {};

    /**
     * Whether acceptableProblems has been used and therefore should not be
     * modified.
     */
    var acceptableProblemsLocked = false;

    /**
     * As we start to repair, this will track the worst *post-repair* severity
     * seen so far.
     *
     * See also yetToRepair; the "current" severity is the maximum of
     * plannedSeverity and the contents of yetToRepair.
     */
    var plannedSeverity = ses.severities.SAFE;

    /**
     * All registered problem records, indexed by ID. See docs and
     * implementation of the registerProblem method for format details.
     *
     * These records are never exposed to clients.
     */
    var problemRecords = new EarlyStringMap();

    /**
     * All problem records whose test/repair/report steps have not yet been
     * executed; a subset of problemRecords.
     */
    var notDoneProblems = new EarlyStringMap();

    /**
     * This is all problems which have not been either repaired or shown not to
     * be present.
     */
    var yetToRepair = new EarlyStringMap();

    /**
     * Outcomes of the earliest test run (before repairs). Keys are problem IDs
     * and values are return values of test functions.
     */
    var earliestTests = new EarlyStringMap();

    /**
     * Outcomes of the latest test run (after repairs, or before repairs if
     * repairs have not been run yet). Keys are problem IDs and values are
     * return values of test functions.
     */
    var latestTests = new EarlyStringMap();

    /**
     * For reporting; contains the same keys as latestTests.
     */
    var reports = new EarlyStringMap();

    /**
     * All repair functions which have been executed and therefore should not
     * be retried.
     *
     * This is a table of repair functions and not of problem records because
     * multiple problem records may share the same repair.
     */
    var repairsPerformed = [];

    var postTestKludge = undefined;

    var aboutTo = void 0;

    //////// Internals /////////

    var defaultDisposition = { permit: false, doNotRepair: false };
    function disposition(problem) {
      acceptableProblemsLocked = true;
      return Object.prototype.hasOwnProperty.call(acceptableProblems,
          problem.id) ? acceptableProblems[problem.id] : defaultDisposition;
    }

    /**
     * Run all test functions.
     *
     * @param problems Array of problem records with tests to run.
     * @param doing What to put in aboutTo.
     */
    function runTests(problems, doing) {
      strictForEachFn(problems, function(problem) {
        var id = problem.id;
        aboutTo = [doing, ': ', problem.description];
        var result = (0,problem.test)();
        if (!earliestTests.has(id)) {
          earliestTests.set(id, result);
        }
        latestTests.set(id, result);

        var report = computeReport(problem);
        reports.set(problem.id, report);

        var repairPerformed =
          repairsPerformed.lastIndexOf(problem.repair) !== -1;

        // Update yetToRepair and plannedSeverity
        if (repairPerformed || !problem.repair ||
            disposition(problem).doNotRepair) {  // repair attempted/absent

          if (report.postSeverity.level > severities.SAFE.level
              && disposition(problem).permit) {
            logger.warn('Problem ignored by configuration (' +
                report.postSeverity.description + '): ' + problem.description);
          } else {
            // Lock in the failure if any, since it is no longer going to be
            // yetToRepair and so won't be counted in currentSeverity.
            self.updateMaxSeverity(report.postSeverity);
          }

          yetToRepair['delete'](id);  // quoted for ES3 compatibility

        } else if (!result) {  // test says OK
          yetToRepair['delete'](id);  // quoted for ES3 compatibility

        } else {  // repair not yet run
          yetToRepair.set(id, problem);
        }
      });
      aboutTo = void 0;
    }

    function computeReport(problem) {
      var status = statuses.ALL_FINE;
      var postSeverity = severities.SAFE;
      var beforeFailure = earliestTests.get(problem.id);
      // TODO(kpreid): We need to define new statuses, and employ them here,
      // for when a test or repair has not yet been run. (In the previous
      // design, reporting could only happen after test/repair/test phases.)
      var afterFailure = latestTests.get(problem.id);
      if (beforeFailure) { // failed before
        if (afterFailure) { // failed after
          if (disposition(problem).doNotRepair) {
            postSeverity = problem.preSeverity;
            status = statuses.REPAIR_SKIPPED;
          } else if (problem.repair) {
            postSeverity = problem.preSeverity;
            status = statuses.REPAIR_FAILED;
          } else {
            if (!problem.canRepair) {
              postSeverity = problem.preSeverity;
            } // else no repair + canRepair -> problem isn't safety issue
            status = statuses.NOT_REPAIRED;
          }
        } else { // succeeded after
          if (problem.repair &&
              repairsPerformed.lastIndexOf(problem.repair) !== -1) {
            if (!problem.canRepair) {
              // repair for development, not safety
              postSeverity = problem.preSeverity;
              status = statuses.REPAIRED_UNSAFELY;
            } else {
              status = statuses.REPAIRED;
            }
          } else {
            status = statuses.ACCIDENTALLY_REPAIRED;
          }
        }
      } else { // succeeded before
        if (afterFailure) { // failed after
          if (problem.repair || !problem.canRepair) {
            postSeverity = problem.preSeverity;
          } // else no repair + canRepair -> problem isn't safety issue
          status = statuses.BROKEN_BY_OTHER_ATTEMPTED_REPAIRS;
        } else { // succeeded after
          // nothing to see here, move along
        }
      }

      if (typeof beforeFailure === 'string') {
        logger.error('New Symptom (pre-repair, ' + problem.id + '): ' +
            beforeFailure);
        postSeverity = severities.NEW_SYMPTOM;
      }
      if (typeof afterFailure === 'string') {
        logger.error('New Symptom (post-repair, ' + problem.id + '): ' +
            afterFailure);
        postSeverity = severities.NEW_SYMPTOM;
      }

      return {
        id:            problem.id,
        description:   problem.description,
        preSeverity:   problem.preSeverity,
        canRepair:     problem.canRepair,
        urls:          problem.urls,
        sections:      problem.sections,
        tests:         problem.tests,
        status:        status,
        postSeverity:  postSeverity,
        beforeFailure: beforeFailure,
        afterFailure:  afterFailure
      };
    }

    // algorithm for the two ok methods
    function computeOk(actualSeverity, opt_criterionSeverity) {
      if ('string' === typeof opt_criterionSeverity) {
        opt_criterionSeverity = lookupSeverityName(opt_criterionSeverity, true);
      }
      if (!opt_criterionSeverity) {
        opt_criterionSeverity = maxAcceptableSeverity;
      }
      return actualSeverity.level <= opt_criterionSeverity.level;
    }

    //////// Methods /////////

    this.setMaxAcceptableSeverity = function(value) {
      // TODO(kpreid): Check some condition? Do only once?
      // Maybe make this external to the repairer?
      maxAcceptableSeverity = value;
    };

    this.setAcceptableProblems = function(value) {
      if (acceptableProblemsLocked) {
        throw new Error('Too late to setAcceptableProblems.');
      }
      acceptableProblems = value;
    };

    /**
     * The severity of problems which would be known to be observed by code
     * running now with no further repairs. This value may increase if new tests
     * are run or decrease if problems are repaired.
     *
     * This value should be used to determine whether it is yet safe to rely on
     * the guarantees that SES intends to provide.
     *
     * Tests which are registered but not yet run are counted.
     */
    this.getCurrentSeverity = function() {
      var severity = plannedSeverity;
      yetToRepair.forEach(function(problem) {
        if (problem.preSeverity.level > severity.level &&
            !disposition(problem).permit) {
          severity = problem.preSeverity;
        }
      });
      return severity;
    };

    /**
     * The severity of problems which have been confirmed to be present and
     * which are known to be unrepairable. This value can only increase.
     *
     * This value should be used to determine whether SES startup is futile
     * and should be aborted.
     */
    this.getPlannedSeverity = function() {
      return plannedSeverity;
    };

    this.addPostTestKludge = function(value) {
      if (postTestKludge) {
        throw new Error('Only one post-test kludge is supported');
      }
    };

    /**
     * Update the max based on the provided severity.
     *
     * <p>If the provided severity exceeds the max so far, update the
     * max to match.
     */
    // TODO(kpreid): Replace uses of this with higher level ops
    this.updateMaxSeverity = function updateMaxSeverity(severity) {
      if (severity.level > plannedSeverity.level) {
        // This is a useful breakpoint for answering the question "why is the
        // severity as high as it is".
        // if (severity.level > maxAcceptableSeverity.level) {
        //   console.info('Increasing planned severity.');
        // }
        plannedSeverity = severity;
      }
    };

    /**
     * Are all registered problems nonexistent, repaired, or no more severe than
     * opt_criterionSeverity (defaulting to maxAcceptableSeverity)?
     */
    this.okToUse = function okToUse(opt_criterionSeverity) {
      return computeOk(self.getCurrentSeverity(), opt_criterionSeverity);
    };

    /**
     * Are all registered problems nonexistent, repaired, not yet repaired, or
     * no more severe than maxAcceptableSeverity?
     */
    this.okToLoad = function okToLoad() {
      return computeOk(plannedSeverity);
    };

    /**
     * Each problem record has a <dl>
     *   <dt>id:</dt>
     *     <dd>a string uniquely identifying the record, which must
     *         be an UPPERCASE_WITH_UNDERSCORES style identifier.</dd>
     *   <dt>description:</dt>
     *     <dd>a string describing the problem</dd>
     *   <dt>test:</dt>
     *     <dd>a predicate testing for the presence of the problem</dd>
     *   <dt>repair:</dt>
     *     <dd>a function which attempts repair, or undefined if no
     *         repair is attempted for this problem</dd>
     *   <dt>preSeverity:</dt>
     *     <dd>an enum from ses.severities indicating the level of severity
     *         of this problem if unrepaired. Or, if !canRepair, then
     *         the severity whether or not repaired.</dd>
     *   <dt>canRepair:</dt>
     *     <dd>a boolean indicating "if the repair exists and the test
     *         subsequently does not detect a problem, are we now ok?"</dd>
     *   <dt>urls: (optional)</dt>
     *     <dd>a list of URL strings, each of which points at a page
     *         relevant for documenting or tracking the bug in
     *         question. These are typically into bug-threads in issue
     *         trackers for the various browsers.</dd>
     *   <dt>sections: (optional)</dt>
     *     <dd>a list of strings, each of which is a relevant ES5.1
     *         section number.</dd>
     *   <dt>tests: (optional)</dt>
     *     <dd>a list of strings, each of which is the name of a
     *         relevant test262 or sputnik test case.</dd>
     * </dl>
     * These problem records are the meta-data driving the testing and
     * repairing.
     */
    this.registerProblem = function(record) {
      var fullRecord = {
        id:            record.id,
        description:   record.description || record.id,
        test:          record.test,
        repair:        record.repair,
        preSeverity:   record.preSeverity,
        canRepair:     record.canRepair,
        urls:          record.urls || [],
        sections:      record.sections || [],
        tests:         record.tests || []
      };
      // check minimum requirements
      if (typeof fullRecord.id !== 'string') {
        throw new TypeError('record.id not a string');
      }
      if (!/^[A-Z0-9_]+$/.test(fullRecord.id)) {
        // This restriction, besides being a consistent naming convention,
        // ensures that problem IDs can be used as keys indiscriminately, as
        // Object.prototype has no all-uppercase properties.
        throw new TypeError(
            'record.id must contain only uppercase, numbers, and underscores');
      }
      if (typeof fullRecord.test !== 'function') {
        throw new TypeError('record.test not a function');
      }
      if (problemRecords.has(fullRecord.id)) {
        throw new Error('duplicate problem ID: ' + fullRecord.id);
      }
      // TODO(kpreid): validate preSeverity
      problemRecords.set(fullRecord.id, fullRecord);
      notDoneProblems.set(fullRecord.id, fullRecord);
      yetToRepair.set(fullRecord.id, fullRecord);
    };

    this.runTests = function runTestsMethod() {
      var todo = [];
      notDoneProblems.forEach(function(record) { todo.push(record); });
      runTests(todo, 'requested test');
    };

    /**
     * Run a set of tests & repairs.
     *
     * <ol>
     * <li>First run all the tests before repairing anything.
     * <li>Then repair all repairable failed tests.
     * <li>Some repair might fix multiple problems, but run each repair at most
     *     once.
     * <li>Then run all the tests again, in case some repairs break other tests.
     * </ol>
     */
    this.testAndRepair = function testAndRepair() {
      // snapshot for consistency paranoia
      var todo = [];
      notDoneProblems.forEach(function(record) { todo.push(record); });

      runTests(todo, 'pre test');
      strictForEachFn(todo, function(problem) {
        if (latestTests.get(problem.id) && !disposition(problem).doNotRepair) {
          var repair = problem.repair;
          if (repair && repairsPerformed.lastIndexOf(repair) === -1) {
            aboutTo = ['repair: ', problem.description];
            repair();
            repairsPerformed.push(repair);
          }
        }
      });
      runTests(todo, 'post test');

      // TODO(kpreid): Refactor to remove the need for this kludge; repairES5
      // needs a cleanup operation.
      if (postTestKludge) { postTestKludge(); }

      strictForEachFn(todo, function(problem, i) {
        // quoted for ES3 compatibility
        notDoneProblems['delete'](problem.id);
      });

      logger.reportRepairs(strictMapFn(todo, function(problem) {
        return reports.get(problem.id);
      }));
    };

    /**
     * Return a fresh array of all problem reports.
     *
     * Does not include problem records whose tests have not yet been run, but
     * that may be added in the future. TODO(kpreid): do that and define a
     * status enum value for it.
     *
     * Callers should not modify the report records but may deep freeze them
     * (this is not done automatically as Object.freeze may be broken).
     */
    this.getReports = function() {
      var array = [];
      reports.forEach(function(report) {
        array.push(report);
      });
      return array;
    };

    this.wasDoing = function() {
      return aboutTo ? '(' + aboutTo.join('') + ') ' : '';
    };
  }

  // exposed for unit testing
  ses._Repairer = Repairer;

  //////// Singleton repairer /////////

  /**
   * {@code ses.maxAcceptableSeverity} is the max post-repair severity
   * that is considered acceptable for proceeding with initializing SES
   * and enabling the execution of untrusted code.
   *
   * <p>[TODO(kpreid): Rewrite the rest of this comment to better
   * discuss repair-framework vs repairES5.]
   * 
   * <p>Although <code>repairES5.js</code> can be used standalone for
   * partial ES5 repairs, its primary purpose is to repair as a first
   * stage of <code>initSES.js</code> for purposes of supporting SES
   * security. In support of that purpose, we initialize
   * {@code ses.maxAcceptableSeverity} to the post-repair severity
   * level at which we should report that we are unable to adequately
   * support SES security. By default, this is set to
   * {@code ses.severities.SAFE_SPEC_VIOLATION}, which is the maximum
   * severity that we believe results in no loss of SES security.
   *
   * <p>If {@code ses.maxAcceptableSeverityName} is already set (to a
   * severity property name of a severity below {@code
   * ses.NOT_SUPPORTED}), then we use that setting to initialize
   * {@code ses.maxAcceptableSeverity} instead. For example, if we are
   * using SES only for isolation, then we could set it to
   * 'NOT_OCAP_SAFE', in which case repairs that are inadequate for
   * object-capability (ocap) safety would still be judged safe for
   * our purposes.
   *
   * <p>As repairs proceed, they update
   * {@code ses._repairer.getPlannedSeverity()} to track the worst case
   * post-repair severity seen so far. When {@code ses.ok()} is called,
   * it return whether {@code ses._repairer.getPlannedSeverity()} is
   * still less than or equal to {@code ses.maxAcceptableSeverity},
   * indicating that this platform still seems adequate for supporting
   * SES.
   *
   * <p>See also {@code ses.acceptableProblems} for overriding the
   * severity of specific known problems.
   */
  ses.maxAcceptableSeverityName =
    validateSeverityName(ses.maxAcceptableSeverityName, false);
  // TODO(kpreid): revisit whether this exists
  ses.maxAcceptableSeverity = ses.severities[ses.maxAcceptableSeverityName];

  ses.acceptableProblems = validateAcceptableProblems(ses.acceptableProblems);

  function validateAcceptableProblems(opt_problems) {
    var validated = {};
    if (opt_problems) {
      for (var problem in opt_problems) {
        // TODO(kpreid): Validate problem names.
        var flags = opt_problems[problem];
        if (typeof flags !== 'object') {
          throw new Error('ses.acceptableProblems["' + problem + '"] is not' +
              ' an object, but ' + flags);
        }
        var valFlags = {permit: false, doNotRepair: false};
        for (var flag in flags) {
          if (valFlags.hasOwnProperty(flag)) {
            valFlags[flag] = Boolean(flags[flag]);
          }
        }
        validated[problem] = valFlags;
      }
    }
    return validated;
  }

  // global instance for normal code path
  // TODO: Think about whether this is a "private" thing.
  ses._repairer = new Repairer();
  ses._repairer.setMaxAcceptableSeverity(ses.maxAcceptableSeverity);
  ses._repairer.setAcceptableProblems(ses.acceptableProblems);
}());
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Monkey patch almost ES5 platforms into a closer
 * emulation of full <a href=
 * "https://code.google.com/p/es-lab/wiki/SecureableES5">Secureable
 * ES5</a>.
 *
 * <p>Assumes only ES3, but only proceeds to do useful repairs when
 * the platform is close enough to ES5 to be worth attempting
 * repairs. Compatible with almost-ES5, ES5, ES5-strict, and
 * anticipated ES6.
 *
 * <p>Ignore the "...requires ___global_test_function___" below. We
 * create it, use it, and delete it all within this module. But we
 * need to lie to the linter since it can't tell.
 *
 * //requires ses.mitigateSrcGotchas
 * //provides ses.ok, ses.okToLoad, ses.getMaxSeverity
 * //provides ses.is, ses.makeDelayedTamperProof
 * //provides ses.makeCallerHarmless, ses.makeArgumentsHarmless
 * //provides ses.verifyStrictFunctionBody
 *
 * @author Mark S. Miller
 * @requires ___global_test_function___, ___global_valueOf_function___
 * @requires JSON, eval, this
 * @requires navigator, document, DOMException
 * @overrides ses, repairES5Module
 * @overrides RegExp, WeakMap, Object, parseInt
 */
var RegExp;
var ses;

/**
 * <p>Qualifying platforms generally include all JavaScript platforms
 * shown on <a href="http://kangax.github.com/es5-compat-table/"
 * >ECMAScript 5 compatibility table</a> that implement {@code
 * Object.getOwnPropertyNames}. At the time of this writing,
 * qualifying browsers already include the latest released versions of
 * Internet Explorer (9), Firefox (4), Chrome (11), and Safari
 * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript
 * engines, Rhino 1.73, and BESEN.
 *
 * <p>On such not-quite-ES5 platforms, some elements of these
 * emulations may lose SES safety, as enumerated in the comment on
 * each problem record in the {@code baseProblems} and {@code
 * supportedProblems} array below. The platform must at least provide
 * {@code Object.getOwnPropertyNames}, because it cannot reasonably be
 * emulated.
 *
 * <p>This file is useful by itself, as it has no dependencies on the
 * rest of SES. It creates no new global bindings, but merely repairs
 * standard globals or standard elements reachable from standard
 * globals. If the future-standard {@code WeakMap} global is present,
 * as it is currently on FF7.0a1, then it will repair it in place. The
 * one non-standard element that this file uses is {@code console} if
 * present, in order to report the repairs it found necessary, in
 * which case we use its {@code log, info, warn}, and {@code error}
 * methods. If {@code console.log} is absent, then this file performs
 * its repairs silently.
 *
 * <p>Generally, this file should be run as the first script in a
 * JavaScript context (i.e. a browser frame), as it relies on other
 * primordial objects and methods not yet being perturbed.
 *
 * <p>TODO(erights): This file tries to protect itself from some
 * post-initialization perturbation by stashing some of the
 * primordials it needs for later use, but this attempt is currently
 * incomplete. We need to revisit this when we support Confined-ES5,
 * as a variant of SES in which the primordials are not frozen. See
 * previous failed attempt at <a
 * href="https://codereview.appspot.com/5278046/" >Speeds up
 * WeakMap. Preparing to support unfrozen primordials.</a>. From
 * analysis of this failed attempt, it seems that the only practical
 * way to support CES is by use of two frames, where most of initSES
 * runs in a SES frame, and so can avoid worrying about most of these
 * perturbations.
 */
(function repairES5Module(global) {
  "use strict";

  var logger = ses.logger;
  var EarlyStringMap = ses._EarlyStringMap;

  /**
   * As we start to repair, this will track the worst post-repair
   * severity seen so far.
   *
   * TODO(kpreid): Revisit this; it's a shim for the old "ses.maxSeverity"
   * which is no longer a global property since it's now internal state of
   * the repairer.
   */
   ses.getMaxSeverity = function getMaxSeverity() {
     return ses._repairer.getCurrentSeverity();
   };

  /**
   * Are we in a condition to safely operate as SES?
   *
   * TODO(kpreid): This should subsume the 'dirty' flag from startSES
   * by making that into a "problem".
   */
  ses.ok = function ok(maxSeverity) {
    return ses._repairer.okToUse(maxSeverity);
  };

  /**
   * Are we in a condition to continue initializing SES (as opposed to
   * aborting)?
   *
   * Does not take a max severity argument because the severity during loading
   * is pre-chosen by maxAcceptableSeverity.
   */
  ses.okToLoad = function okToLoad() {
    if (arguments.length !== 0) {
      // catch a plausible mistake
      throw new Error('okToLoad takes no arguments');
    }
    return ses._repairer.okToLoad();
  };

  /**
   * Update the max based on the provided severity.
   *
   * <p>If the provided severity exceeds the max so far, update the
   * max to match.
   */
  ses.updateMaxSeverity = function updateMaxSeverity(severity) {
    // TODO(kpreid): Replace uses of this with new repair framework
    return ses._repairer.updateMaxSeverity(severity);
  };

  //////// Prepare for "caller" and "argument" testing and repair /////////

  /**
   * Needs to work on ES3, since repairES5.js may be run on an ES3
   * platform.
   */
  function strictForEachFn(list, callback) {
    for (var i = 0, len = list.length; i < len; i++) {
      callback(list[i], i);
    }
  }

  /**
   * A known strict-mode function for tests to use.
   */
  function strictFnSpecimen() {}

  var objToString = Object.prototype.toString;

  /**
   * Sample map early, to obtain a representative built-in for testing.
   *
   * <p>There is no reliable test for whether a function is a
   * built-in, and it is possible some of the tests below might
   * replace the built-in Array.prototype.map, though currently none
   * do. Since we <i>assume</i> (but with no reliable way to check)
   * that repairES5.js runs in its JavaScript context before anything
   * which might have replaced map, we sample it now. The map method
   * is a particularly nice one to sample, since it can easily be used
   * to test what the "caller" and "arguments" properties on a
   * in-progress built-in method reveals.
   */
  var builtInMapMethod = Array.prototype.map;

  var builtInForEach = Array.prototype.forEach;

  /**
   * http://wiki.ecmascript.org/doku.php?id=harmony:egal
   */
  var is = ses.is = Object.is || function(x, y) {
    if (x === y) {
      // 0 === -0, but they are not identical
      return x !== 0 || 1 / x === 1 / y;
    }

    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    return x !== x && y !== y;
  };


  /**
   * By the time this module exits, either this is repaired to be a
   * function that is adequate to make the "caller" property of a
   * strict or built-in function harmess, or this module has reported
   * a failure to repair.
   *
   * <p>Start off with the optimistic assumption that nothing is
   * needed to make the "caller" property of a strict or built-in
   * function harmless. We are not concerned with the "caller"
   * property of non-strict functions. It is not the responsibility of
   * this module to actually make these "caller" properties
   * harmless. Rather, this module only provides this function so
   * clients such as startSES.js can use it to do so on the functions
   * they whitelist.
   *
   * <p>If the "caller" property of strict functions are not already
   * harmless, then this platform cannot be repaired to be
   * SES-safe. The only reason why {@code makeCallerHarmless} must
   * work on strict functions in addition to built-in is that some of
   * the other repairs below will replace some of the built-ins with
   * strict functions, so startSES.js will apply {@code
   * makeCallerHarmless} blindly to both strict and built-in
   * functions. {@code makeCallerHarmless} simply need not to complete
   * without breaking anything when given a strict function argument.
   */
  ses.makeCallerHarmless = function assumeCallerHarmless(func, path) {
    return 'Apparently fine';
  };

  /**
   * By the time this module exits, either this is repaired to be a
   * function that is adequate to make the "arguments" property of a
   * strict or built-in function harmess, or this module has reported
   * a failure to repair.
   *
   * Exactly analogous to {@code makeCallerHarmless}, but for
   * "arguments" rather than "caller".
   */
  ses.makeArgumentsHarmless = function assumeArgumentsHarmless(func, path) {
    return 'Apparently fine';
  };

  var simpleTamperProofOk = false;

  /**
   * "makeTamperProof()" returns a "tamperProof(obj, opt_pushNext)"
   * function that acts like "Object.freeze(obj)", except that, if obj
   * is a <i>prototypical</i> object (defined below), it ensures that
   * the effect of freezing properties of obj does not suppress the
   * ability to override these properties on derived objects by simple
   * assignment.
   *
   * <p>If opt_pushNext is provided, then it is called for each value
   * obtained from an own property by reflective property access, so
   * that tamperProof's caller can arrange to visit each of these
   * values after tamperProof returns if it wishes to recur.
   *
   * <p>Because of lack of sufficient foresight at the time, ES5
   * unfortunately specified that a simple assignment to a
   * non-existent property must fail if it would override a
   * non-writable data property of the same name. (In retrospect, this
   * was a mistake, but it is now too late and we must live with the
   * consequences.) As a result, simply freezing an object to make it
   * tamper proof has the unfortunate side effect of breaking
   * previously correct code that is considered to have followed JS
   * best practices, if this previous code used assignment to
   * override.
   *
   * <p>To work around this mistake, tamperProof(obj) detects if obj
   * is <i>prototypical</i>, i.e., is an object whose own
   * "constructor" is a function whose "prototype" is this obj. For example,
   * Object.prototype and Function.prototype are prototypical.  If so,
   * then when tamper proofing it, prior to freezing, replace all its
   * configurable own data properties with accessor properties which
   * simulate what we should have specified -- that assignments to
   * derived objects succeed if otherwise possible. In this case,
   * opt_pushNext, if provided, is called on the value that this data
   * property had <i>and</i> on the accessors which replaced it.
   *
   * <p>Some platforms (Chrome and Safari as of this writing)
   * implement the assignment semantics ES5 should have specified
   * rather than what it did specify.
   * "test_ASSIGN_CAN_OVERRIDE_FROZEN()" below tests whether we are on
   * such a platform. If so, "repair_ASSIGN_CAN_OVERRIDE_FROZEN()"
   * sets simpleTamperProofOk, which informs makeTamperProof that the
   * complex workaround here is not needed on those platforms. If
   * opt_pushNext is provided, it must still use reflection to obtain
   * those values.
   *
   * <p>"makeTamperProof" should only be called after the trusted
   * initialization has done all the monkey patching that it is going
   * to do on the Object.* methods, but before any untrusted code runs
   * in this context.
   */
  function makeTamperProof() {

    // Sample these after all trusted monkey patching initialization
    // but before any untrusted code runs in this frame.
    var gopd = Object.getOwnPropertyDescriptor;
    var gopn = Object.getOwnPropertyNames;
    var getProtoOf = Object.getPrototypeOf;
    var freeze = Object.freeze;
    var isFrozen = Object.isFrozen;
    var defProp = Object.defineProperty;
    var call = Function.prototype.call;

    function forEachNonPoisonOwn(obj, callback) {
      var list = gopn(obj);
      var len = list.length;
      var i, j, name;  // crockford rule
      if (typeof obj === 'function') {
        for (i = 0, j = 0; i < len; i++) {
          name = list[i];
          if (name !== 'caller' && name !== 'arguments') {
            callback(name, j);
            j++;
          }
        }
      } else {
        strictForEachFn(list, callback);
      }
    }

    function simpleTamperProof(obj, opt_pushNext) {
      if (obj !== Object(obj)) { return obj; }
      if (opt_pushNext) {
        forEachNonPoisonOwn(obj, function(name) {
          var desc = gopd(obj, name);
          if ('value' in desc) {
            opt_pushNext(desc.value);
          } else {
            opt_pushNext(desc.get);
            opt_pushNext(desc.set);
          }
        });
      }
      return freeze(obj);
    }

    function tamperProof(obj, opt_pushNext) {
      if (obj !== Object(obj)) { return obj; }
      var func;
      if ((typeof obj === 'object' || obj === Function.prototype) &&
          !!gopd(obj, 'constructor') &&
          typeof (func = obj.constructor) === 'function' &&
          func.prototype === obj &&
          !isFrozen(obj)) {
        var pushNext = opt_pushNext || function(v) {};
        forEachNonPoisonOwn(obj, function(name) {
          var value;
          function getter() {
            return value;
          }

          function setter(newValue) {
            if (obj === this) {
              throw new TypeError('Cannot set virtually frozen property: ' +
                                  name);
            }
            if (!!gopd(this, name)) {
              this[name] = newValue;
            }
            // TODO(erights): Do all the inherited property checks
            defProp(this, name, {
              value: newValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          }
          var desc = gopd(obj, name);
          if ('value' in desc) {
            value = desc.value;
            // On some engines, and perhaps to become standard in ES6,
            // __proto__ already behaves as an accessor but is made to
            // appear to be a data property, so we should not try to
            // reconfigure it into another accessor.
            if (desc.configurable && name !== '__proto__') {
              getter.prototype = null;
              setter.prototype = null;
              defProp(obj, name, {
                get: getter,
                set: setter,
                // We should be able to omit the enumerable line, since it
                // should default to its existing setting.
                enumerable: desc.enumerable,
                configurable: false
              });
              pushNext(getter);
              pushNext(setter);
            }
            pushNext(value);
          } else {
            pushNext(desc.get);
            pushNext(desc.set);
          }
        });
        return freeze(obj);
      } else {
        return simpleTamperProof(obj, opt_pushNext);
      }
    }
    return simpleTamperProofOk ? simpleTamperProof : tamperProof;
  };


  var needToTamperProof = [];
  /**
   * Various repairs may expose non-standard objects that are not
   * reachable from startSES's root, and therefore not freezable by
   * startSES's normal whitelist traversal. However, freezing these
   * during repairES5.js may be too early, as it is before WeakMap.js
   * has had a chance to monkey patch Object.freeze if necessary, in
   * order to install hidden properties for its own use before the
   * object becomes non-extensible.
   * TODO(kpreid): Revisit this time-of-execution commentary in new world
   */
  function rememberToTamperProof(obj) {
    needToTamperProof.push(obj);
  }

  /**
   * Makes and returns a tamperProof(obj) function, and uses it to
   * tamper proof all objects whose tamper proofing had been delayed.
   *
   * <p>"makeDelayedTamperProof()" must only be called once.
   */
  var makeDelayedTamperProofCalled = false;
  ses.makeDelayedTamperProof = function makeDelayedTamperProof() {
    if (makeDelayedTamperProofCalled) {
      throw 'makeDelayedTamperProof() must only be called once.';
    }
    var tamperProof = makeTamperProof();
    strictForEachFn(needToTamperProof, tamperProof);
    needToTamperProof = void 0;
    makeDelayedTamperProofCalled = true;
    return tamperProof;
  };

  /**
   * Fails if {@code funcBodySrc} does not parse as a strict
   * FunctionBody.
   *
   * <p>ses.verifyStrictFunctionBody is exported from repairES5
   * because the best way to perform this verification on a given
   * platform depends on whether the platform's Function constructor
   * <a href=
   * "https://code.google.com/p/google-caja/issues/detail?id=1616"
   * >fails to verify that its body parses as a FunctionBody</a>. If
   * it does, repairES5 could have repaired the Function constructor
   * itself, but chooses not to, since its main client, startSES, has
   * to wrap and replace the Function constructor anyway.
   *
   * <p>On platforms not suffering from this bug,
   * ses.verifyStrictFunctionBody just calls the original Function
   * constructor to do this verification (See
   * simpleVerifyStrictFunctionBody). Otherwise, we repair
   * ses.verifyStrictFunctionBody
   *
   * <p>See verifyStrictFunctionBodyByEvalThrowing and
   * verifyStrictFunctionBodyByParsing.
   *
   * <p>Note that all verify*(allegedString) functions now always
   * start by coercing the alleged string to a guaranteed primitive
   * string, do their verification checks on that, and if it passes,
   * returns that. Otherwise they throw. If you don't know whether
   * something is a string before verifying, use only the output of
   * the verifier, not the input. Or coerce it early yourself.
   */
  ses.verifyStrictFunctionBody = simpleVerifyStrictFunctionBody;

  /**
   * The unsafe* variables hold precious values that must not escape
   * to untrusted code. When {@code eval} is invoked via {@code
   * unsafeEval}, this is a call to the indirect eval function, not
   * the direct eval operator.
   */
  var unsafeEval = eval;
  var UnsafeFunction = Function;

  /**
   * <p>We use Crock's trick of simply passing {@code funcBodySrc} to
   * the original {@code Function} constructor, which will throw a
   * SyntaxError if it does not parse as a FunctionBody.
   */
  function simpleVerifyStrictFunctionBody(funcBodySrc) {
    funcBodySrc = ''+funcBodySrc;
    UnsafeFunction('"use strict";' + funcBodySrc);
    return funcBodySrc;
  }

  /**
   * If Crock's trick is not safe, then
   * repair_CANT_SAFELY_VERIFY_SYNTAX may replace it with Ankur's trick,
   * depending on whether the platform also suffers from bugs that
   * would block it. See repair_CANT_SAFELY_VERIFY_SYNTAX for details.
   *
   * <p>To use Ankur's trick to check a FunctionBody rather than a
   * program, we use the trick in comment 7 at
   * https://code.google.com/p/google-caja/issues/detail?id=1616#c7
   * The criticism of it in comment 8 is blocked by Ankur's trick,
   * given the absence of the other bugs that
   * repair_CANT_SAFELY_VERIFY_SYNTAX checks in order to decide.
   *
   * <p>Testing once revealed that Crock's trick
   * (simpleVerifyStrictFunctionBody) executed over 100x faster on V8.
   */
  function verifyStrictFunctionBodyByEvalThrowing(funcBodySrc) {
    funcBodySrc = ''+funcBodySrc;
    try {
      unsafeEval('"use strict"; throw "not a SyntaxError 1";' +
                 '(function(){' + funcBodySrc +'\n});');
    } catch (outerErr) {
      if (outerErr === 'not a SyntaxError 1') {
        try {
          unsafeEval('throw "not a SyntaxError 2";' +
                     '(function(){{' + funcBodySrc +'\n}})');
        } catch (innerErr) {
          if (innerErr === 'not a SyntaxError 2') {
            // Presumably, if we got here, funcBodySrc parsed as a strict
            // function  body but was not executed, and {funcBodySrc}
            // parsed as a  non-strict function body but was not executed.
            // We try it again non-strict so that body level nested
            // function declarations will not get rejected. Accepting
            // them is beyond the ES5 spec, but is known to happen in
            // all implementations.
            return funcBodySrc;
          }
          if (innerErr instanceof SyntaxError) {
            // This case is likely symptomatic of an attack. But the
            // attack is thwarted and so need not be reported as
            // anything other than the SyntaxError it is.
            throw innerErr;
          }
        }
      }
      if (outerErr instanceof SyntaxError) {
        throw outerErr;
      }
    }
    throw new TypeError('Unexpected verification outcome');
  }

  var canMitigateSrcGotchas = typeof ses.mitigateSrcGotchas === 'function';

  /**
   * Due to https://code.google.com/p/v8/issues/detail?id=2728
   * we can't assume that SyntaxErrors are always early. If they're
   * not, then even Ankur's trick doesn't work, so we resort to a full
   * parse.
   *
   * <p>Only applicable if ses.mitigateSrcGotchas is available. To
   * accommodate constraints of Caja's initialization order, we do not
   * capture or invoke ses.mitigateSrcGotchas as the time repairES5 is
   * run. Rather we only test for its presence at repair time in order
   * to decide what verifier to use. We only use ses.mitigateSrcGotchas
   * later when we actually verify eval'ed code, and at that time we
   * use the current binding of ses.mitigateSrcGotchas.
   *
   * <p>Thus, clients (like Caja) that know they will be making a
   * real ses.mitigateSrcGotchas available after repair can
   * pre-install a placeholder function that, if accidentally invoked,
   * throws an error to complain that it was not replaced by the real
   * one. Then, sometime prior to the first verification, the client
   * should overwrite ses.mitigateSrcGotchas with the real one.
   */
  function verifyStrictFunctionBodyByParsing(funcBodySrc) {
    funcBodySrc = ''+funcBodySrc;
    var safeError;
    var newSrc;
    try {
      newSrc = ses.mitigateSrcGotchas(funcBodySrc,
                                      {parseFunctionBody: true},
                                      ses.logger);
    } catch (error) {
      // Shouldn't throw, but if it does, the exception is potentially
      // from a different context with an undefended prototype chain;
      // don't allow it to leak out.
      try {
        safeError = new Error(error.message);
      } catch (metaerror) {
        throw new Error(
          'Could not safely obtain error from mitigateSrcGotchas');
      }
      throw safeError;
    }

    // The following equality test is due to the peculiar API of
    // ses.mitigateSrcGotchas, which (TODO(jasvir)) should probably be
    // fixed instead. However, currently, since we're asking it only to
    // parse and not to rewrite, if the parse is successful it will
    // return its argument src string, which is fine.
    //
    // If the parse is not successful, ses.mitigateSrcGotchas
    // indicates the problem <i>only</i> by returning a string which,
    // if evaluated, would throw a SyntaxError with a non-informative
    // message. Since, in this case, these are the only possibilities,
    // we happen to be able to check for the error case by seeing
    // simply that the string returned is not the src string passed
    // in.
    if (newSrc !== funcBodySrc) {
      throw new SyntaxError('Failed to parse program');
    }
    return funcBodySrc;
  }

  /**
   * Where the "that" parameter represents a "this" that should have
   * been bound to "undefined" but may be bound to a global or
   * globaloid object.
   *
   * <p>The "desc" parameter is a string to describe the "that" if it
   * is something unexpected.
   */
  function testGlobalLeak(desc, that) {
    if (that === void 0) { return false; }
    if (that === global) { return true; }
    if (objToString.call(that) === '[object Window]') { return true; }
    return desc + ' leaked as: ' + that;
  }

  ////////////////////// Tests /////////////////////
  //
  // Each test is a function of no arguments that should not leave any
  // significant side effects, which tests for the presence of a
  // problem. It returns either
  // <ul>
  // <li>false, meaning that the problem does not seem to be present.
  // <li>true, meaning that the problem is present in a form that we expect.
  // <li>a non-empty string, meaning that there seems to be a related
  //     problem, but we're seeing a symptom different than what we
  //     expect. The string should describe the new symptom. It must
  //     be non-empty so that it is truthy.
  // </ul>
  // All the tests are run first to determine which corresponding
  // repairs to attempt. Then these repairs are run. Then all the
  // tests are rerun to see how they were effected by these repair
  // attempts. Finally, we report what happened.

  // Certain tests cannot operate without freezing primordial objects;
  // they must therefore be run in separate frames with fresh
  // primordials. Since the repairs will not have been performed in
  // those frames, we use these flags to have the tests explicitly
  // perform those repairs.
  //
  // TODO(kpreid): Figure out a better design for solving this problem.
  // For example, it would be good to generically run the relevant tests
  // after startSES has frozen everything and abort otherwise (this is
  // done as a special case for FREEZING_BREAKS_PROTOTYPES only).
  var repair_FREEZING_BREAKS_PROTOTYPES_wasApplied = false;
  var repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN_wasApplied = false;

  /**
   * If {@code Object.getOwnPropertyNames} is missing, we consider
   * this to be an ES3 browser which is unsuitable for attempting to
   * run SES.
   *
   * <p>If {@code Object.getOwnPropertyNames} is missing, there is no
   * way to emulate it.
   */
  function test_MISSING_GETOWNPROPNAMES() {
    return !('getOwnPropertyNames' in Object);
  }

  /**
   * If you can, see Opera bug DSK-383293@bugs.opera.com.
   *
   * <p>On some Operas, the Object.prototype.__proto__ property is an
   * accessor property, but the property descriptor of that property
   * has a setter, i.e., {@code desc.set}, which throws a TypeError
   * when one tries to read it. Unfortunately, this creates
   * problems beyond our attempts at support.
   */
  function test_PROTO_SETTER_UNGETTABLE() {
    var desc = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
    if (!desc) { return false; }
    try {
      void desc.set; // yes, just reading it
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return ''+err;
    }
    return false;
  }

  function inTestFrame(callback) {
    if (!document || !document.createElement) { return undefined; }
    var iframe = document.createElement('iframe');
    var container = document.body || document.getElementsByTagName('head')[0] ||
        document.documentElement || document;
    container.appendChild(iframe);
    try {
      return callback(iframe.contentWindow);
    } finally {
      container.removeChild(iframe);
    }
  }

  /**
   * Problem visible in Chrome 27.0.1428.0 canary and 27.0.1453.15 beta:
   * freezing Object.prototype breaks Object.create inheritance.
   * https://code.google.com/p/v8/issues/detail?id=2565
   */
  function test_FREEZING_BREAKS_PROTOTYPES() {
    // This problem is sufficiently problematic that testing for it breaks the
    // frame under some circumstances, so we create another frame to test in.
    // (However, if we've already frozen Object.prototype, we can test in this
    // frame without side effects.)
    var testObject;
    if (Object.isFrozen(Object.prototype)) {
      testObject = Object;
    } else {
      testObject = inTestFrame(function(window) { return window.Object; });
      if (!testObject) { return false; }  // not in a web browser

      // Apply the repair which should fix the problem to the testing frame.
      // TODO(kpreid): Design a better architecture to handle cases like this
      // than one-off state flags.
      if (repair_FREEZING_BREAKS_PROTOTYPES_wasApplied) {
        // optional argument not supplied by normal repair process
        repair_FREEZING_BREAKS_PROTOTYPES(testObject);
      }
    }

    var a = new testObject();
    testObject.freeze(testObject.prototype);
    var b = testObject.create(a);  // will fail to set [[Prototype]] to a
    var proto = Object.getPrototypeOf(b);
    if (proto === a) {
      return false;
    } else if (proto === testObject.prototype) {
      return true;
    } else {
      return 'Prototype of created object is neither specified prototype nor ' +
          'Object.prototype';
    }
  }
  // exported so we can test post-freeze
  ses.kludge_test_FREEZING_BREAKS_PROTOTYPES = test_FREEZING_BREAKS_PROTOTYPES;

  /**
   * Problem visible in Chrome 29.0.1547.41 beta and 30.0.1587.2 canary.
   * Freezing Object.prototype while it is in a WeakMap breaks WeakMaps.
   * https://code.google.com/p/v8/issues/detail?id=2829
   */
  function test_FREEZING_BREAKS_WEAKMAP() {
    // This problem cannot be detected until Object.prototype is frozen, and
    // therefore must be tested in a separate frame. This is technically wrong,
    // because the problem can occur on iframe-less standalone browsers.
    //
    // Our repair is to delete WeakMap (and let WeakMap.js construct the
    // emulated WeakMap), which we can detect here and is obviously sufficient.
    if (typeof WeakMap === 'undefined') {
      // No WeakMap, or it has been "repaired", so no need
      return false;
    } else {
      var result = inTestFrame(function(window) {
        // trigger problem
        var wm1 = new window.WeakMap();
        wm1.set(window.Object.prototype, true);
        window.Object.freeze(window.Object.prototype);

        // test for problem
        var wm2 = new window.WeakMap();
        var o = window.Object.create(window.Object.prototype);
        wm2.set(o, true);
        return [wm2.get(o)];
      });
      if (!result || result[0] === true) {
        return false;
      } else if (result[0] === undefined) {
        return true;
      } else {
        return 'Unexpected WeakMap value: ' + result[0];
      }
    }
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=64250
   *
   * <p>No workaround attempted. Just reporting that this platform is
   * not SES-safe.
   */
  function test_GLOBAL_LEAKS_FROM_GLOBAL_FUNCTION_CALLS() {
    global.___global_test_function___ = function() { return this; };
    var that = ___global_test_function___();
    delete global.___global_test_function___;
    return testGlobalLeak('Global func "this"', that);
  }

  /**
   * Detects whether the most painful ES3 leak is still with us.
   */
  function test_GLOBAL_LEAKS_FROM_ANON_FUNCTION_CALLS() {
    var that = (function(){ return this; })();
    return testGlobalLeak('Anon func "this"', that);
  }

  var strictThis = this;

  /**
   *
   */
  function test_GLOBAL_LEAKS_FROM_STRICT_THIS() {
    return testGlobalLeak('Strict "this"', strictThis);
  }

  /**
   * Detects
   * https://bugs.webkit.org/show_bug.cgi?id=51097
   * https://bugs.webkit.org/show_bug.cgi?id=58338
   * https://code.google.com/p/v8/issues/detail?id=1437
   *
   * <p>No workaround attempted. Just reporting that this platform is
   * not SES-safe.
   */
  function test_GLOBAL_LEAKS_FROM_BUILTINS() {
    var v = {}.valueOf;
    var that = 'dummy';
    try {
      that = v();
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'valueOf() threw: ' + err;
    }
    if (that === void 0) {
      // Should report as a safe spec violation
      return false;
    }
    return testGlobalLeak('valueOf()', that);
  }

  /**
   *
   */
  function test_GLOBAL_LEAKS_FROM_GLOBALLY_CALLED_BUILTINS() {
    global.___global_valueOf_function___ = {}.valueOf;
    var that = 'dummy';
    try {
      that = ___global_valueOf_function___();
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'valueOf() threw: ' + err;
    } finally {
      delete global.___global_valueOf_function___;
    }
    if (that === void 0) {
      // Should report as a safe spec violation
      return false;
    }
    return testGlobalLeak('Global valueOf()', that);
  }

  /**
   * v8 bug: Array prototype methods operate on window if called as functions
   * (literally, not with .call()/.apply()).
   */
  function test_GLOBAL_LEAKS_FROM_ARRAY_METHODS() {
    var readCanary = {};
    var writeCanary = {};

    var saved = [];
    function save(name) {
      var opt_desc = Object.getOwnPropertyDescriptor(global, name);
      saved.push([name, opt_desc]);
      return !!opt_desc;
    }
    // Save the state of all properties that our test might mutate. We save
    // 'length' and all numeric-indexed properties which
    //   * have indexes less than global.length,
    //   * are numbered consecutively from other saved properties, or
    //   * are possibly mutated by our tests (the + 2).
    var lengthVal = global.length;
    var minSaveLength =
        ((typeof lengthVal === 'number' && isFinite(lengthVal))
            ? lengthVal : 0) + 2;
    save('length');
    var found = true;
    for (var i = 0; found || i < minSaveLength; i++) {
      found = save(i);
    }

    function subtest(name, args, failPredicate) {
      var method = Array.prototype[name];
      try {
        var result = method(args[0], args[1], args[2]);
      } catch (err) {
        if (err instanceof TypeError) { return false; }
        return 'Unexpected error from ' + name + ': ' + err;
      }
      if (failPredicate(result)) { return true; }
      return 'Unexpected result from ' + name + ': ' + result;
    }

    try {
      // Insert a dummy value to use.
      try {
        Array.prototype.push.call(global, readCanary);
      } catch (e) {
        // Fails on Firefox (which doesn't have this bug). Continue with the
        // test anyway just in case (but readCanary-using subtests will report
        // unexpected rather than true).
      }

      return (
        subtest('concat', [[]], function(result) {
            return result[0] === global; })
        || subtest('slice', [0], function(result) {
            return result[result.length-1] === readCanary; })
        || subtest('pop', [], function(result) {
            return result === readCanary; })
        || subtest('push', [writeCanary], function(result) {
            return global[global.length-1] === writeCanary; })
        || subtest('shift', [], function(result) { return true; })
        || subtest('slice', [], function(result) {
            return result.indexOf(readCanary) !== -1; })
        || subtest('splice', [0, 1, writeCanary], function(result) {
            return global[0] === writeCanary; })
        || subtest('unshift', [writeCanary], function(result) {
            return global[0] === writeCanary; })
      );
    } finally {
      saved.forEach(function(record) {
        if (record[1]) {
          Object.defineProperty(global, record[0], record[1]);
        } else {
          delete global[record[0]];
        }
      });
    }
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=55736
   *
   * <p>As of this writing, the only major browser that does implement
   * Object.getOwnPropertyNames but not Object.freeze etc is the
   * released Safari 5 (JavaScriptCore). The Safari beta 5.0.4
   * (5533.20.27, r84622) already does implement freeze, which is why
   * this WebKit bug is listed as closed. When the released Safari has
   * this fix, we can retire this problem.
   *
   * <p>The repair is <b>not</b> safety preserving. The emulations it
   * installs if needed do not actually provide the safety that the
   * rest of SES relies on.
   */
  function test_MISSING_FREEZE_ETC() {
    return !('freeze' in Object);
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1530
   *
   * <p>Detects whether the value of a function's "prototype" property
   * as seen by normal object operations might deviate from the value
   * as seem by the reflective {@code Object.getOwnPropertyDescriptor}
   */
  function test_FUNCTION_PROTOTYPE_DESCRIPTOR_LIES() {
    function foo() {}
    Object.defineProperty(foo, 'prototype', { value: {} });
    return foo.prototype !==
      Object.getOwnPropertyDescriptor(foo, 'prototype').value;
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=55537
   *
   * This bug is fixed on the latest Safari beta 5.0.5 (5533.21.1,
   * r88603). When the released Safari has this fix, we can retire
   * this problem.
   *
   * <p>The repair is safety preserving.
   */
  function test_MISSING_CALLEE_DESCRIPTOR() {
    function foo(){}
    if (Object.getOwnPropertyNames(foo).indexOf('callee') < 0) { return false; }
    if (foo.hasOwnProperty('callee')) {
      return 'Empty strict function has own callee';
    }
    return true;
  }

  /**
   * A strict delete should either succeed, returning true, or it
   * should fail by throwing a TypeError. Under no circumstances
   * should a strict delete return false.
   *
   * <p>This case occurs on IE10preview2.
   */
  function test_STRICT_DELETE_RETURNS_FALSE() {
    if (!RegExp.hasOwnProperty('rightContext')) { return false; }
    var deleted;
    try {
      deleted = delete RegExp.rightContext;
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Deletion failed with: ' + err;
    }
    if (deleted) { return false; }
    return true;
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=591846
   * as applied to the RegExp constructor.
   *
   * <p>Note that Mozilla lists this bug as closed. But reading that
   * bug thread clarifies that is partially because the code in {@code
   * repair_REGEXP_CANT_BE_NEUTERED} enables us to work around the
   * non-configurability of the RegExp statics.
   */
  function test_REGEXP_CANT_BE_NEUTERED() {
    if (!RegExp.hasOwnProperty('leftContext')) { return false; }
    var deleted;
    try {
      deleted = delete RegExp.leftContext;
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'Deletion failed with: ' + err;
    }
    if (!RegExp.hasOwnProperty('leftContext')) { return false; }
    if (deleted) {
      return 'Deletion of RegExp.leftContext did not succeed.';
    } else {
      // This case happens on IE10preview2, as demonstrated by
      // test_STRICT_DELETE_RETURNS_FALSE.
      return true;
    }
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1393
   *
   * <p>The repair is safety preserving.
   */
  function test_REGEXP_TEST_EXEC_UNSAFE() {
    (/foo/).test('xfoox');
    var match = new RegExp('(.|\r|\n)*','').exec()[0];
    if (match === 'undefined') { return false; }
    if (match === 'xfoox') { return true; }
    return 'regExp.exec() does not match against "undefined".';
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=26382
   *
   * <p>As of this writing, the only major browser that does implement
   * Object.getOwnPropertyNames but not Function.prototype.bind is
   * Safari 5 (JavaScriptCore), including the current Safari beta
   * 5.0.4 (5533.20.27, r84622).
   *
   * <p>The repair is safety preserving. But see
   * https://bugs.webkit.org/show_bug.cgi?id=26382#c25 for why this
   * repair cannot faithfully implement the specified semantics.
   *
   * <p>See also https://bugs.webkit.org/show_bug.cgi?id=42371
   */
  function test_MISSING_BIND() {
    return !('bind' in Function.prototype);
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=892
   *
   * <p>This tests whether the built-in bind method violates the spec
   * by calling the original using its current .apply method rather
   * than the internal [[Call]] method. The workaround is the same as
   * for test_MISSING_BIND -- to replace the built-in bind with one
   * written in JavaScript. This introduces a different bug though: As
   * https://bugs.webkit.org/show_bug.cgi?id=26382#c29 explains, a
   * bind written in JavaScript cannot emulate the specified currying
   * over the construct behavior, and so fails to enable a var-args
   * {@code new} operation.
   */
  function test_BIND_CALLS_APPLY() {
    if (!('bind' in Function.prototype)) { return false; }
    var applyCalled = false;
    function foo() { return [].slice.call(arguments,0).join(','); }
    foo.apply = function fakeApply(self, args) {
      applyCalled = true;
      return Function.prototype.apply.call(this, self, args);
    };
    var b = foo.bind(33,44);
    var answer = b(55,66);
    if (applyCalled) { return true; }
    if (answer === '44,55,66') { return false; }
    return 'Bind test returned "' + answer + '" instead of "44,55,66".';
  }

  /**
   * Demonstrates the point made by comment 29
   * https://bugs.webkit.org/show_bug.cgi?id=26382#c29
   *
   * <p>Tests whether Function.prototype.bind curries over
   * construction ({@code new}) behavior. A built-in bind should. A
   * bind emulation written in ES5 can't.
   */
  function test_BIND_CANT_CURRY_NEW() {
    function construct(f, args) {
      var bound = Function.prototype.bind.apply(f, [null].concat(args));
      return new bound();
    }
    var d;
    try {
      d = construct(Date, [1957, 4, 27]);
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'Curries construction failed with: ' + err;
    }
    if (typeof d === 'string') { return true; } // Opera
    var str = objToString.call(d);
    if (str === '[object Date]') { return false; }
    return 'Unexpected ' + str + ': ' + d;
  }

  /**
   * Detects https://code.google.com/p/google-caja/issues/detail?id=1362
   *
   * <p>This is an unfortunate oversight in the ES5 spec: Even if
   * Date.prototype is frozen, it is still defined to be a Date, and
   * so has mutable state in internal properties that can be mutated
   * by the primordial mutation methods on Date.prototype, such as
   * {@code Date.prototype.setFullYear}.
   *
   * <p>The repair is safety preserving.
   */
  function test_MUTABLE_DATE_PROTO() {
    try {
      Date.prototype.setFullYear(1957);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Mutating Date.prototype failed with: ' + err;
    }
    var v = Date.prototype.getFullYear();
    Date.prototype.setFullYear(NaN); // hopefully undoes the damage
    if (v !== v && typeof v === 'number') {
      // NaN indicates we're probably ok.
      // TODO(erights) Should we report this as a symptom anyway, so
      // that we get the repair which gives us a reliable TypeError?
      return false;
    }
    if (v === 1957) { return true; }
    return 'Mutating Date.prototype did not throw';
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=656828
   *
   * <p>A bug in the current FF6.0a1 implementation: Even if
   * WeakMap.prototype is frozen, it is still defined to be a WeakMap,
   * and so has mutable state in internal properties that can be
   * mutated by the primordial mutation methods on WeakMap.prototype,
   * such as {@code WeakMap.prototype.set}.
   *
   * <p>The repair is safety preserving.
   *
   * <p>TODO(erights): Update the ES spec page to reflect the current
   * agreement with Mozilla.
   */
  function test_MUTABLE_WEAKMAP_PROTO() {
    if (typeof WeakMap !== 'function') { return false; }
    var x = {};
    try {
      WeakMap.prototype.set(x, 86);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Mutating WeakMap.prototype failed with: ' + err;
    }
    var v = WeakMap.prototype.get(x);
    // Since x cannot escape, there's no observable damage to undo.
    if (v === 86) { return true; }
    return 'Mutating WeakMap.prototype did not throw';
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1447
   *
   * <p>This bug is fixed as of V8 r8258 bleeding-edge, but is not yet
   * available in the latest dev-channel Chrome (13.0.782.15 dev).
   *
   * <p>Unfortunately, an ES5 strict method wrapper cannot emulate
   * absence of a [[Construct]] behavior, as specified for the Chapter
   * 15 built-in methods. The installed wrapper relies on {@code
   * Function.prototype.apply}, as inherited by original, obeying its
   * contract.
   *
   * <p>The repair is safety preserving but non-transparent, in that
   * the real forEach is frozen even in the success case, since we
   * have to freeze it in order to test for this failure. We could
   * repair this non-transparency by replacing it with a transparent
   * wrapper (as https://codereview.appspot.com/5278046/ does), but
   * since the SES use of this will freeze it anyway and the
   * indirection is costly, we choose not to for now.
   */
  function test_NEED_TO_WRAP_FOREACH() {
    if (!('freeze' in Object)) {
      // Object.freeze is still absent on released Android and would
      // cause a bogus bug detection in the following try/catch code.
      return false;
    }
    if (Array.prototype.forEach !== builtInForEach) {
      // If it is already wrapped, we are confident the problem does
      // not occur, and we need to skip the test to avoid freezing the
      // wrapper.
      return false;
    }
    try {
      ['z'].forEach(function(){ Object.freeze(Array.prototype.forEach); });
      return false;
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'freezing forEach failed with ' + err;
    }
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=2273
   *
   * A strict mode function should receive a non-coerced 'this'
   * value. That is, in strict mode, if 'this' is a primitive, it
   * should not be boxed
   */
  function test_FOREACH_COERCES_THISOBJ() {
    var needsWrapping = true;
    [1].forEach(function(){ needsWrapping = ('string' != typeof this); }, 'f');
    return needsWrapping;
  }

  /**
   * <p>Sometimes, when trying to freeze an object containing an
   * accessor property with a getter but no setter, Chrome <= 17 fails
   * with <blockquote>Uncaught TypeError: Cannot set property ident___
   * of #<Object> which has only a getter</blockquote>. So if
   * necessary, the repair overrides {@code Object.defineProperty} to
   * always install a dummy setter in lieu of the absent one.
   *
   * <p>Since this problem seems to have gone away as of Chrome 18, it
   * is no longer as important to isolate and report it.
   *
   * <p>TODO(erights): We should also override {@code
   * Object.getOwnPropertyDescriptor} to hide the presence of the
   * dummy setter, and instead report an absent setter.
   */
  function test_NEEDS_DUMMY_SETTER() {
    if (NEEDS_DUMMY_SETTER_repaired) { return false; }
    if (typeof navigator === 'undefined') { return false; }
    var ChromeMajorVersionPattern = (/Chrome\/(\d*)\./);
    var match = ChromeMajorVersionPattern.exec(navigator.userAgent);
    if (!match) { return false; }
    var ver = +match[1];
    return ver <= 17;
  }
  /** we use this variable only because we haven't yet isolated a test
   * for the problem. */
  var NEEDS_DUMMY_SETTER_repaired = false;

  /**
   * Detects https://code.google.com/p/chromium/issues/detail?id=94666
   */
  function test_FORM_GETTERS_DISAPPEAR() {
    function getter() { return 'gotten'; }

    if (typeof document === 'undefined' ||
       typeof document.createElement !== 'function') {
      // likely not a browser environment
      return false;
    }
    var f = document.createElement('form');
    try {
      Object.defineProperty(f, 'foo', {
        get: getter,
        set: void 0
      });
    } catch (err) {
      // Happens on Safari 5.0.2 on IPad2.
      return 'defining accessor on form failed with: ' + err;
    }
    var desc = Object.getOwnPropertyDescriptor(f, 'foo');
    if (desc.get === getter) { return false; }
    if (desc.get === void 0) { return true; }
    return 'Getter became ' + desc.get;
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=637994
   *
   * <p>On Firefox 4 an inherited non-configurable accessor property
   * appears to be an own property of all objects which inherit this
   * accessor property. This is fixed as of Forefox Nightly 7.0a1
   * (2011-06-21).
   *
   * <p>Our workaround wraps hasOwnProperty, getOwnPropertyNames, and
   * getOwnPropertyDescriptor to heuristically decide when an accessor
   * property looks like it is apparently own because of this bug, and
   * suppress reporting its existence.
   *
   * <p>However, it is not feasible to likewise wrap JSON.stringify,
   * and this bug will cause JSON.stringify to be misled by inherited
   * enumerable non-configurable accessor properties. To prevent this,
   * we wrap defineProperty, freeze, and seal to prevent the creation
   * of <i>enumerable</i> non-configurable accessor properties on
   * those platforms with this bug.
   *
   * <p>A little known fact about JavaScript is that {@code
   * Object.prototype.propertyIsEnumerable} actually tests whether a
   * property is both own and enumerable. Assuming that our wrapping
   * of defineProperty, freeze, and seal prevents the occurrence of an
   * enumerable non-configurable accessor property, it should also
   * prevent the occurrence of this bug for any enumerable property,
   * and so we do not need to wrap propertyIsEnumerable.
   *
   * <p>The repair seems to be safety preserving, but the issues are
   * delicate and not well understood.
   */
  function test_ACCESSORS_INHERIT_AS_OWN() {
    var base = {};
    var derived = Object.create(base);
    function getter() { return 'gotten'; }
    Object.defineProperty(base, 'foo', { get: getter });
    if (!derived.hasOwnProperty('foo') &&
        Object.getOwnPropertyDescriptor(derived, 'foo') === void 0 &&
        Object.getOwnPropertyNames(derived).indexOf('foo') < 0) {
      return false;
    }
    if (!derived.hasOwnProperty('foo') ||
        Object.getOwnPropertyDescriptor(derived, 'foo').get !== getter ||
        Object.getOwnPropertyNames(derived).indexOf('foo') < 0) {
      return 'Accessor properties partially inherit as own properties.';
    }
    Object.defineProperty(base, 'bar', { get: getter, configurable: true });
    if (!derived.hasOwnProperty('bar') &&
        Object.getOwnPropertyDescriptor(derived, 'bar') === void 0 &&
        Object.getOwnPropertyNames(derived).indexOf('bar') < 0) {
      return true;
    }
    return 'Accessor properties inherit as own even if configurable.';
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1360
   *
   * Our workaround wraps {@code sort} to wrap the comparefn.
   */
  function test_SORT_LEAKS_GLOBAL() {
    var that = 'dummy';
    [2,3].sort(function(x,y) { that = this; return x - y; });
    if (that === void 0) { return false; }
    if (that === global) { return true; }
    return 'sort called comparefn with "this" === ' + that;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1360
   *
   * <p>Our workaround wraps {@code replace} to wrap the replaceValue
   * if it's a function.
   */
  function test_REPLACE_LEAKS_GLOBAL() {
    var that = 'dummy';
    function capture() { that = this; return 'y';}
    'x'.replace(/x/, capture);
    if (that === void 0) { return false; }
    if (that === capture) {
      // This case happens on IE10preview2. See
      // https://connect.microsoft.com/IE/feedback/details/685928/
      //   bad-this-binding-for-callback-in-string-prototype-replace
      // TODO(erights): When this happens, the problem.description is
      // wrong.
      return true;
    }
    if (that === global) { return true; }
    return 'Replace called replaceValue function with "this" === ' + that;
  }

  /**
   * Detects
   * https://connect.microsoft.com/IE/feedback/details/
   *   685436/getownpropertydescriptor-on-strict-caller-throws
   *
   * <p>Object.getOwnPropertyDescriptor must work even on poisoned
   * "caller" properties.
   */
  function test_CANT_GOPD_CALLER() {
    var desc = null;
    try {
      desc = Object.getOwnPropertyDescriptor(function(){}, 'caller');
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'getOwnPropertyDescriptor failed with: ' + err;
    }
    if (desc &&
        typeof desc.get === 'function' &&
        typeof desc.set === 'function' &&
        !desc.configurable) {
      return false;
    }
    if (desc &&
        desc.value === null &&
        !desc.writable &&
        !desc.configurable) {
      // Seen in IE9. Harmless by itself
      return false;
    }
    return 'getOwnPropertyDesciptor returned unexpected caller descriptor';
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=63398
   *
   * <p>A strict function's caller should be poisoned only in a way
   * equivalent to an accessor property with a throwing getter and
   * setter.
   *
   * <p>Seen on Safari 5.0.6 through WebKit Nightly r93670
   */
  function test_CANT_HASOWNPROPERTY_CALLER() {
    var answer = void 0;
    try {
      answer = function(){}.hasOwnProperty('caller');
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'hasOwnProperty failed with: ' + err;
    }
    if (answer) { return false; }
    return 'strict_function.hasOwnProperty("caller") was false';
  }

  /**
   * Protect an 'in' with a try/catch to workaround a bug in Safari
   * WebKit Nightly Version 5.0.5 (5533.21.1, r89741).
   *
   * <p>See https://bugs.webkit.org/show_bug.cgi?id=63398
   *
   * <p>Notes: We're seeing exactly
   * <blockquote>
   *   New symptom (c): ('caller' in &lt;a bound function&gt;) threw:
   *   TypeError: Cannot access caller property of a strict mode
   *   function<br>
   *   New symptom (c): ('arguments' in &lt;a bound function&gt;)
   *   threw: TypeError: Can't access arguments object of a strict
   *   mode function
   * </blockquote>
   * which means we're skipping both the catch and the finally in
   * {@code has} while hitting the catch in {@code has2}. Further, if
   * we remove one of these finally clauses (forget which) and rerun
   * the example, if we're under the debugger the browser crashes. If
   * we're not, then the TypeError escapes both catches.
   */
  function has(base, name, baseDesc) {
    var result = void 0;
    var finallySkipped = true;
    try {
      result = name in base;
    } catch (err) {
      logger.error('New symptom (a): (\'' +
                   name + '\' in <' + baseDesc + '>) threw: ', err);
      // treat this as a safe absence
      result = false;
      return false;
    } finally {
      finallySkipped = false;
      if (result === void 0) {
        logger.error('New symptom (b): (\'' +
                     name + '\' in <' + baseDesc + '>) failed');
      }
    }
    if (finallySkipped) {
      logger.error('New symptom (e): (\'' +
                   name + '\' in <' + baseDesc +
                   '>) inner finally skipped');
    }
    return !!result;
  }

  function has2(base, name, baseDesc) {
    var result = void 0;
    var finallySkipped = true;
    try {
      result = has(base, name, baseDesc);
    } catch (err) {
      logger.error('New symptom (c): (\'' +
                   name + '\' in <' + baseDesc + '>) threw: ', err);
      // treat this as a safe absence
      result = false;
      return false;
    } finally {
      finallySkipped = false;
      if (result === void 0) {
        logger.error('New symptom (d): (\'' +
                     name + '\' in <' + baseDesc + '>) failed');
      }
    }
    if (finallySkipped) {
      logger.error('New symptom (f): (\'' +
                   name + '\' in <' + baseDesc +
                   '>) outer finally skipped');
    }
    return !!result;
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=63398
   *
   * <p>If this reports a problem in the absence of "New symptom (a)",
   * it means the error thrown by the "in" in {@code has} is skipping
   * past the first layer of "catch" surrounding that "in". This is in
   * fact what we're currently seeing on Safari WebKit Nightly Version
   * 5.0.5 (5533.21.1, r91108).
   */
  function test_CANT_IN_CALLER() {
    var answer = void 0;
    try {
      answer = has2(function(){}, 'caller', 'strict_function');
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return '("caller" in strict_func) failed with: ' + err;
    } finally {}
    if (answer) { return false; }
    return '("caller" in strict_func) was false.';
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=63398
   *
   * <p>If this reports a problem in the absence of "New symptom (a)",
   * it means the error thrown by the "in" in {@code has} is skipping
   * past the first layer of "catch" surrounding that "in". This is in
   * fact what we're currently seeing on Safari WebKit Nightly Version
   * 5.0.5 (5533.21.1, r91108).
   */
  function test_CANT_IN_ARGUMENTS() {
    var answer = void 0;
    try {
      answer = has2(function(){}, 'arguments', 'strict_function');
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return '("arguments" in strict_func) failed with: ' + err;
    } finally {}
    if (answer) { return false; }
    return '("arguments" in strict_func) was false.';
  }

  /**
   * Detects whether strict function violate caller anonymity.
   */
  function test_STRICT_CALLER_NOT_POISONED() {
    if (!has2(strictFnSpecimen, 'caller', 'a strict function')) {
      return false;
    }
    function foo(m) { return m.caller; }
    // using Function so it'll be non-strict
    var testfn = Function('m', 'f', 'return m([m], f)[0];');
    var caller;
    try {
      caller = testfn(strictFnSpecimen, foo);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Strict "caller" failed with: ' + err;
    }
    if (testfn === caller) {
      // Seen on IE 9
      return true;
    }
    return 'Unexpected "caller": ' + caller;
  }

  /**
   * Detects whether strict functions are encapsulated.
   */
  function test_STRICT_ARGUMENTS_NOT_POISONED() {
    if (!has2(strictFnSpecimen, 'arguments', 'a strict function')) {
      return false;
    }
    function foo(m) { return m.arguments; }
    // using Function so it'll be non-strict
    var testfn = Function('m', 'f', 'return m([m], f)[0];');
    var args;
    try {
      args = testfn(strictFnSpecimen, foo);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Strict "arguments" failed with: ' + err;
    }
    if (args[1] === foo) {
      // Seen on IE 9
      return true;
    }
    return 'Unexpected arguments: ' + arguments;
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=591846 as
   * applied to "caller"
   */
  function test_BUILTIN_LEAKS_CALLER() {
    if (!has2(builtInMapMethod, 'caller', 'a builtin')) { return false; }
    function foo(m) { return m.caller; }
    // using Function so it'll be non-strict
    var testfn = Function('a', 'f', 'return a.map(f)[0];');
    var a = [builtInMapMethod];
    a.map = builtInMapMethod;
    var caller;
    try {
      caller = testfn(a, foo);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Built-in "caller" failed with: ' + err;
    }
    if (null === caller || void 0 === caller) { return false; }
    if (testfn === caller) { return true; }
    return 'Unexpected "caller": ' + caller;
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=591846 as
   * applied to "arguments"
   */
  function test_BUILTIN_LEAKS_ARGUMENTS() {
    if (!has2(builtInMapMethod, 'arguments', 'a builtin')) { return false; }
    function foo(m) { return m.arguments; }
    // using Function so it'll be non-strict
    var testfn = Function('a', 'f', 'return a.map(f)[0];');
    var a = [builtInMapMethod];
    a.map = builtInMapMethod;
    var args;
    try {
      args = testfn(a, foo);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Built-in "arguments" failed with: ' + err;
    }
    if (args === void 0 || args === null) { return false; }
    return true;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=893
   */
  function test_BOUND_FUNCTION_LEAKS_CALLER() {
    if (!('bind' in Function.prototype)) { return false; }
    function foo() { return bar.caller; }
    var bar = foo.bind({});
    if (!has2(bar, 'caller', 'a bound function')) { return false; }
    // using Function so it'll be non-strict
    var testfn = Function('b', 'return b();');
    var caller;
    try {
      caller = testfn(bar);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Bound function "caller" failed with: ' + err;
    }
    if (caller === void 0 || caller === null) { return false; }
    if (caller === testfn) { return true; }
    return 'Unexpected "caller": ' + caller;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=893
   */
  function test_BOUND_FUNCTION_LEAKS_ARGUMENTS() {
    if (!('bind' in Function.prototype)) { return false; }
    function foo() { return bar.arguments; }
    var bar = foo.bind({});
    if (!has2(bar, 'arguments', 'a bound function')) { return false; }
    // using Function so it'll be non-strict
    var testfn = Function('b', 'return b();');
    var args;
    try {
      args = testfn(bar);
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Bound function "arguments" failed with: ' + err;
    }
    if (args === void 0 || args === null) { return false; }
    return true;
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=70207
   *
   * <p>After deleting a built-in, the problem is that
   * getOwnPropertyNames still lists the name as present, but it seems
   * absent in all other ways.
   */
  function test_DELETED_BUILTINS_IN_OWN_NAMES() {
    if (!('__defineSetter__' in Object.prototype)) { return false; }
    var desc = Object.getOwnPropertyDescriptor(Object.prototype,
                                               '__defineSetter__');
    try {
      try {
        delete Object.prototype.__defineSetter__;
      } catch (err1) {
        return false;
      }
      var names = Object.getOwnPropertyNames(Object.prototype);
      if (names.indexOf('__defineSetter__') === -1) { return false; }
      if ('__defineSetter__' in Object.prototype) {
        // If it's still there, it bounced back. Which is still a
        // problem, but not the problem we're testing for here.
        return false;
      }
      return true;
    } finally {
      Object.defineProperty(Object.prototype, '__defineSetter__', desc);
    }
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1769
   */
  function test_GETOWNPROPDESC_OF_ITS_OWN_CALLER_FAILS() {
    try {
      Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor,
                                      'caller');
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'getOwnPropertyDescriptor threw: ' + err;
    }
    return false;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=621
   *
   */
  function test_JSON_PARSE_PROTO_CONFUSION() {
    var x;
    try {
      x = JSON.parse('{"__proto__":[]}');
    } catch (err) {
      if (err instanceof TypeError) {
        // We consider it acceptable to fail this case with a
        // TypeError, as our repair below will cause it to do.
        return false;
      }
      return 'JSON.parse failed with: ' + err;
    }
    if (Object.getPrototypeOf(x) !== Object.prototype) { return true; }
    if (Array.isArray(x.__proto__)) { return false; }
    return 'JSON.parse did not set "__proto__" as a regular property';
  }

  /**
   * Detects https://bugs.webkit.org/show_bug.cgi?id=65832
   *
   * <p>On a non-extensible object, it must not be possible to change
   * its internal [[Prototype]] property, i.e., which object it
   * inherits from.
   *
   * TODO(erights): investigate the following:
   * At https://goo.gl/ycCmo Mike Stay says
   * <blockquote>
   * Kevin notes in domado.js that on some versions of FF, event
   * objects switch prototypes when moving between frames. You should
   * probably check out their behavior around freezing and sealing.
   * </blockquote>
   * But I couldn't find it.
   */
  function test_PROTO_NOT_FROZEN() {
    if (!('freeze' in Object)) {
      // Object.freeze and its ilk (including preventExtensions) are
      // still absent on released Android and would
      // cause a bogus bug detection in the following try/catch code.
      return false;
    }
    var x = Object.preventExtensions({});
    if (x.__proto__ === void 0 && !('__proto__' in x)) { return false; }
    var y = {};
    try {
      x.__proto__ = y;
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Mutating __proto__ failed with: ' + err;
    }
    if (y.isPrototypeOf(x)) { return true; }
    return 'Mutating __proto__ neither failed nor succeeded';
  }

  /**
   * Like test_PROTO_NOT_FROZEN but using defineProperty rather than
   * assignment.
   */
  function test_PROTO_REDEFINABLE() {
    if (!('freeze' in Object)) {
      // Object.freeze and its ilk (including preventExtensions) are
      // still absent on released Android and would
      // cause a bogus bug detection in the following try/catch code.
      return false;
    }
    var x = Object.preventExtensions({});
    if (x.__proto__ === void 0 && !('__proto__' in x)) { return false; }
    var y = {};
    try {
      Object.defineProperty(x, '__proto__', { value: y });
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Defining __proto__ failed with: ' + err;
    }
    // If x.__proto__ has changed but is not equal to y,
    // we deal with that in the next test.
    return (x.__proto__ === y);
  }


  /**
   * Some versions of v8 fail silently when attempting to assign to __proto__
   */
  function test_DEFINING_READ_ONLY_PROTO_FAILS_SILENTLY() {
    if (!('freeze' in Object)) {
      // Object.freeze and its ilk (including preventExtensions) are
      // still absent on released Android and would
      // cause a bogus bug detection in the following try/catch code.
      return false;
    }
    var x = Object.preventExtensions({});
    if (x.__proto__ === void 0 && !('__proto__' in x)) { return false; }
    var y = {};
    try {
      Object.defineProperty(x, '__proto__', { value: y });
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Defining __proto__ failed with: ' + err;
    }
    if (x.__proto__ === Object.prototype) {
      return true;
    }
    return 'Read-only proto was changed in a strange way.';
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1624
   * regarding variables.
   *
   * <p>Both a direct strict eval operator and an indirect strict eval
   * function must not leak top level declarations in the string being
   * evaluated into their containing context.
   */
  function test_STRICT_EVAL_LEAKS_GLOBAL_VARS() {
    unsafeEval('"use strict"; var ___global_test_variable___ = 88;');
    if ('___global_test_variable___' in global) {
      delete global.___global_test_variable___;
      return true;
    }
    return false;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1624
   * regarding functions
   *
   * <p>Both a direct strict eval operator and an indirect strict eval
   * function must not leak top level declarations in the string being
   * evaluated into their containing context.
   */
  function test_STRICT_EVAL_LEAKS_GLOBAL_FUNCS() {
    unsafeEval('"use strict"; function ___global_test_func___(){}');
    if ('___global_test_func___' in global) {
      delete global.___global_test_func___;
      return true;
    }
    return false;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=2396
   *
   * <p>Commenting out the eval does the right thing.  Only fails in
   * non-strict mode.
   */
  function test_EVAL_BREAKS_MASKING() {
    var x;
    x = (function a() {
      function a() {}
      eval('');
      return a;
    });
    // x() should be the internal function a(), not itself
    return x() === x;
  }


  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=1645
   */
  function test_PARSEINT_STILL_PARSING_OCTAL() {
    var n = parseInt('010');
    if (n === 10) { return false; }
    if (n === 8)  { return true; }
    return 'parseInt("010") returned ' + n;
  }

  /**
   * Detects https://bugzilla.mozilla.org/show_bug.cgi?id=695577
   *
   * <p>When E4X syntax is accepted in strict code, then without
   * parsing, we cannot prevent untrusted code from expressing E4X
   * literals and so obtaining access to shared E4X prototypes,
   * despite the absence of these prototypes from our whitelist. While
   * https://bugzilla.mozilla.org/show_bug.cgi?id=695579 is also
   * open, we cannot even repair the situation, leading to unpluggable
   * capability leaks. However, we do not test for this additional
   * problem, since E4X is such a can of worms that 695577 is adequate
   * by itself for us to judge this platform to be insecurable without
   * parsing.
   */
  function test_STRICT_E4X_LITERALS_ALLOWED() {
    var x;
    try {
      x = eval('"use strict";(<foo/>);');
    } catch (err) {
      if (err instanceof SyntaxError) { return false; }
      return 'E4X test failed with: ' + err;
    }
    if (x !== void 0) { return true; }
    return 'E4X literal expression had no value';
  }

  /**
   * Detects whether assignment can override an inherited
   * non-writable, non-configurable data property.
   *
   * <p>According to ES5.1, assignment should not be able to do so,
   * which is unfortunate for SES, as the tamperProof function must
   * kludge expensively to ensure that legacy assignments that don't
   * violate best practices continue to work. Ironically, on platforms
   * in which this bug is present, tamperProof can just cheaply
   * wrap Object.freeze.
   */
  function test_ASSIGN_CAN_OVERRIDE_FROZEN() {
    var x = Object.freeze({foo: 88});
    var y = Object.create(x);
    try {
      y.foo = 99;
    } catch (err) {
      if (err instanceof TypeError) { return false; }
      return 'Override failed with: ' + err;
    }
    if (y.foo === 99) { return true; }
    if (y.foo === 88) { return 'Override failed silently'; }
    return 'Unexpected override outcome: ' + y.foo;
  }

  /**
   * Detects https://code.google.com/p/v8/issues/detail?id=2779
   *
   * A function which is optimized by V8 can mutate frozen properties using
   * increment/decrement operators.
   */
  function test_INCREMENT_IGNORES_FROZEN() {
    function optimizedFun(o, i) {
      if (i == 3) {
        // the count does need to be this high
        for (var j = 0; j < 100000; j++) {}
      }
      o.a++;
      // The bug also applies to --, +=, and -=, but we would have to have
      // separate runs for each one to check them.
    }
    var x = Object.freeze({a: 88});
    var threw = true;
    // multiple executions are needed
    for (var i = 0; i < 4; i++) {
      try {
        optimizedFun(x, i);
        threw = false;
      } catch (err) {
        if (!(err instanceof TypeError)) {
          return 'Increment failed with: ' + err;
        }
      }
    }
    if (x.a === 89) {
      // expected mutation result
      return true;
    }
    if (x.a === 88) {
      if (threw) {
        return false;
      } else {
        return 'Increment failed silently';
      }
    }
    return 'Unexpected increment outcome: ' + JSON.stringify(x);
  }

  /**
   * Detects whether calling pop on a frozen array can modify the array.
   * See https://bugs.webkit.org/show_bug.cgi?id=75788
   */
  function test_POP_IGNORES_FROZEN() {
    var x = [1,2];
    Object.freeze(x);
    try {
      x.pop();
    } catch (e) {
      if (x.length !== 2) { return 'Unexpected modification of frozen array'; }
      if (x[0] === 1 && x[1] === 2) { return false; }
    }
    if (x.length === 1 && x[0] === 1 && x[1] === 2) {
      // Behavior seen on Opera 12.10 mobile and 12.15
      return true;
    }
    if (x.length === 1 && x[0] === 1 && !('1' in x)) {
      // Behavior seen on Safari 5.1.9 (6534.59.8)
      return true;
    }
    if (x.length !== 2) {
      return 'Unexpected silent modification of frozen array';
    }
    return (x[0] !== 1 || x[1] !== 2);
  }


  /**
   * Detects whether calling sort on a frozen array can modify the array.
   * See https://code.google.com/p/v8/issues/detail?id=2419
   */
  function test_SORT_IGNORES_FROZEN() {
    var x = [2,1];
    Object.freeze(x);
    try {
      x.sort();
    } catch (e) {
      if (x.length !== 2) { return 'Unexpected modification of frozen array'; }
      if (x[0] === 2 && x[1] === 1) { return false; }
    }
    if (x.length !== 2) {
      return 'Unexpected silent modification of frozen array';
    }
    return (x[0] !== 2 || x[1] !== 1);
  }

  /**
   * Detects whether calling push on a sealed array can modify the array.
   * See https://code.google.com/p/v8/issues/detail?id=2412
   */
  function test_PUSH_IGNORES_SEALED() {
    var x = [1,2];
    Object.seal(x);
    try {
      x.push(3);
    } catch (e) {
      if (x.length !== 2) { return 'Unexpected modification of frozen array'; }
      if (x[0] === 1 && x[1] === 2) { return false; }
    }
    return (x.length !== 2 || x[0] !== 1 || x[1] !== 2);
  }

  /**
   * Detects whether calling push on a frozen array throws an error.
   */
  function test_PUSH_DOES_NOT_THROW_ON_FROZEN_ARRAY() {
    var x = [1,2];
    Object.freeze(x);
    try {
      x.push(3);
    } catch (e) {
      return false;
    }
    return true;
  }

  /**
   * Detects whether calling push on a frozen array can modify the array.
   */
  function test_PUSH_IGNORES_FROZEN() {
    var x = [1,2];
    Object.freeze(x);
    try {
      x.push(3);
    } catch (e) {
      if (x.length !== 2) { return 'Unexpected modification of frozen array'; }
      if (x[0] === 1 && x[1] === 2) { return false; }
    }
    return (x.length !== 2 || x[0] !== 1 || x[1] !== 2);
  }

  var unrepairedArrayPush = Array.prototype.push;
  /**
   * Detects the array-length aspect of
   * <a href="https://code.google.com/p/v8/issues/detail?id=2711">v8 bug 2711
   * </a>. We detect this specifically because repairing it avoids the need
   * to patch .push() at performance cost.
   */
  function test_ARRAY_LENGTH_MUTABLE() {
    for (var i = 0; i < 2; i++) {  // Only shows up the second time
      var x = [1,2];
      Object.freeze(x);
      try {
        // Call the unrepaired Array.prototype.push which is known to trigger
        // the internal mutability bug (whereas e.g. repair_PUSH_IGNORES_SEALED
        // would hide it). This is being used as a test mechanism and not
        // because the bug is in push.
        unrepairedArrayPush.call(x, 3);
      } catch (e) {
        // Don't care whether or not push throws; if it does not mutate and
        // does not throw, that's a bug but not this bug.
      }
      if (x.length === 3 && x[0] === 1 && x[1] === 2 && x[2] === 3) {
        // Behavior seen on Safari 5.1.9 (6534.59.8)
        return true;
      }
      if (x[0] !== 1 || x[1] !== 2 || x[2] !== undefined) {
        return 'Unexpected modification to elements of array';
      }
      if (x.length === 3) { return true; }
      if (x.length !== 2) {
        return 'Unexpected modification to length of array';
      }
    }
    return false;
  }

  /**
   * In some browsers, assigning to array length can delete
   * non-configurable properties.
   * https://bugzilla.mozilla.org/show_bug.cgi?id=590690
   * TODO(felix8a): file bug for chrome
   */
  function test_ARRAYS_DELETE_NONCONFIGURABLE() {
    var x = [];
    Object.defineProperty(x, 0, { value: 3, configurable: false });
    try {
      x.length = 0;
    } catch (e) {}
    return x.length !== 1 || x[0] !== 3;
  }

  /**
   * In some versions of Chrome, extending an array can
   * modify a read-only length property.
   * https://code.google.com/p/v8/issues/detail?id=2379
   */
  function test_ARRAYS_MODIFY_READONLY() {
    var x = [];
    try {
      Object.defineProperty(x, 'length', {value: 0, writable: false});
      x[0] = 1;
    } catch(e) {}
    return x.length !== 0 || x[0] !== void 0;
  }

  /**
   *
   */
  function test_CANT_REDEFINE_NAN_TO_ITSELF() {
    var descNaN = Object.getOwnPropertyDescriptor(global, 'NaN');
    try {
      Object.defineProperty(global, 'NaN', descNaN);
    } catch (err) {
      if (err instanceof TypeError) { return true; }
      return 'defineProperty of NaN failed with: ' + err;
    }
    return false;
  }

  /**
   * In Firefox 15+, the [[Extensible]] flag is not correctly readable or
   * settable from code originating from a different frame than the object.
   *
   * This test is written in terms of Object.freeze because that's what we care
   * about the correct operation of.
   */
  function test_FREEZE_IS_FRAME_DEPENDENT() {
    // This test is extensive because it needs to verify not just the behavior
    // of the known problem, but that our repair for it was adequate.

    var other = inTestFrame(function(window) { return {
      Object: window.Object,
      mutator: window.Function('o', 'o.x = 1;')
    }; });
    if (!other) { return false; }

    var frozenInOtherFrame = other.Object();
    var freezeSucceeded;
    try {
      Object.freeze(frozenInOtherFrame);
      freezeSucceeded = true;
    } catch (e) {
      freezeSucceeded = false;
    }
    if (Object.isFrozen(frozenInOtherFrame) &&
        other.Object.isFrozen(frozenInOtherFrame) &&
        freezeSucceeded) {
      // desired behavior
    } else if (!Object.isFrozen(frozenInOtherFrame) &&
        !other.Object.isFrozen(frozenInOtherFrame) &&
        !freezeSucceeded) {
      // adequate repair
    } else if (Object.isFrozen(frozenInOtherFrame) &&
        !other.Object.isFrozen(frozenInOtherFrame) &&
        freezeSucceeded) {
      // expected problem
      return true;
    } else {
      return 'Other freeze failure: ' + Object.isFrozen(frozenInOtherFrame) +
          other.Object.isFrozen(frozenInOtherFrame) + freezeSucceeded;
    }

    var frozenInThisFrame = Object.freeze({});
    // This is another sign of the problem, but we can't repair it and will live
    // with it.
    //if (Object.isFrozen(frozenInThisFrame) &&
    //    other.Object.isFrozen(frozenInThisFrame)) {
    //  // desired behavior
    //} else if (!Object.isFrozen(frozenInThisFrame)) {
    //  return 'Object.isFrozen is broken in this frame';
    //} else if (!other.Object.isFrozen(frozenInThisFrame)) {
    //  return true;
    //}
    other.mutator(frozenInThisFrame);
    if (frozenInThisFrame.x !== undefined) {
      return 'mutable in other frame';
    }

    return false;  // all tests passed
  }

  /**
   * These are all the own properties that appear on Error instances
   * on various ES5 platforms as of this writing.
   *
   * <p>Due to browser bugs, some of these are absent from
   * getOwnPropertyNames (gopn). TODO(erights): File bugs with various
   * browser makers for any own properties that we know to be present
   * but not reported by gopn.
   *
   * <p>TODO(erights): do intelligence with the various browser
   * implementors to find out what other properties are provided by
   * their implementation but absent from gopn, whether on Errors or
   * anything else. Every one of these are potentially fatal to our
   * security until we can examine these.
   *
   * <p>The source form is a list rather than a map so that we can list a
   * name like "message" for each browser section we think it goes in.
   *
   * <p>We thank the following people, projects, and websites for
   * providing some useful intelligence of what property names we
   * should suspect:<ul>
   * <li><a href="http://stacktracejs.com">stacktracejs.com</a>
   * <li>TODO(erights): find message on es-discuss list re
   * "   stack". credit author.
   * </ul>
   */
  var errorInstanceWhitelist = [
    // at least Chrome 16
    'arguments',
    'message',
    'stack',
    'type',

    // at least FF 9
    'fileName',
    'lineNumber',
    'message',
    'stack',
    // at least FF 21
    'columnNumber',

    // at least Safari, WebKit 5.1
    'line',
    'message',
    'sourceId',
    'sourceURL',

    // at least Safari 6.0.5 webkit nightly (8536.30.1, 538+)
    'message',
    'stack',
    'line',
    'column',

    // at least IE 10 preview 2
    'description',
    'message',
    'number',

    // at least Opera 11.60
    'message',
    'stack',
    'stacktrace'
  ];
  var errorInstanceWhiteMap = new EarlyStringMap();
  strictForEachFn(errorInstanceWhitelist, function(name) {
    errorInstanceWhiteMap.set(name, true);
  });

  // Properties specifically invisible-until-touched to gOPN on Firefox, but
  // otherwise harmless.
  var errorInstanceKnownInvisibleList = [
    'message',
    'fileName',
    'lineNumber',
    'columnNumber',
    'stack'
  ];

  // Property names to check for unexpected behavior.
  var errorInstanceBlacklist = [
    // seen in a Firebug on FF
    'category',
    'context',
    'href',
    'lineNo',
    'msgId',
    'source',
    'trace',
    'correctSourcePoint',
    'correctWithStackTrace',
    'getSourceLine',
    'resetSource'
  ];

  /**
   * Do Error instances on those platform carry own properties that we
   * haven't yet examined and determined to be SES-safe?
   *
   * <p>A new property should only be added to the
   * errorInstanceWhitelist after inspecting the consequences of that
   * property to determine that it does not compromise SES safety. If
   * some platform maker does add an Error own property that does
   * compromise SES safety, that might be a severe problem, if we
   * can't find a way to deny untrusted code access to that property.
   */
  function test_UNEXPECTED_ERROR_PROPERTIES() {
    var errs = [new Error('e1')];
    try { null.foo = 3; } catch (err) { errs.push(err); }
    var result = false;

    strictForEachFn(errs, function(err) {
      strictForEachFn(Object.getOwnPropertyNames(err), function(name) {
         if (!errorInstanceWhiteMap.has(name)) {
           result = 'Unexpected error instance property: ' + name;
           // would be good to terminate early
         }
      });
    });
    return result;
  }

  /**
   * On Firefox 14+ (and probably earlier), error instances have magical
   * properties that do not appear in getOwnPropertyNames until you refer
   * to the property.  We have been informed of the specific list at
   * <https://bugzilla.mozilla.org/show_bug.cgi?id=724768#c12>.
   */
  function test_ERRORS_HAVE_INVISIBLE_PROPERTIES() {
    var gopn = Object.getOwnPropertyNames;
    var gopd = Object.getOwnPropertyDescriptor;

    var checks = errorInstanceWhitelist.concat(errorInstanceBlacklist);
    var needRepair = false;

    var errors = [new Error('e1')];
    try { null.foo = 3; } catch (err) { errors.push(err); }
    for (var i = 0; i < errors.length; i++) {
      var err = errors[i];
      var found = new EarlyStringMap();
      strictForEachFn(gopn(err), function (prop) {
        found.set(prop, true);
      });
      var j, prop;
      // Check known props
      for (j = 0; j < errorInstanceKnownInvisibleList.length; j++) {
        prop = errorInstanceKnownInvisibleList[j];
        if (gopd(err, prop) && !found.get(prop)) {
          needRepair = true;
          found.set(prop, true);  // don't treat as new symptom
        }
      }
      // Check for new symptoms
      for (j = 0; j < checks.length; j++) {
        prop = checks[j];
        if (gopd(err, prop) && !found.get(prop)) {
          return 'Unexpectedly invisible Error property: ' + prop;
        }
      }
    }
    return needRepair;
  }

  /**
   * A strict getter is not supposed to coerce 'this'. However, some
   * platforms coerce primitive types into their corresponding wrapper
   * objects.
   */
  function test_STRICT_GETTER_BOXES() {
    Object.defineProperty(Number.prototype, '___test_prop___', {
      get: function() { return this; },
      set: void 0,
      enumerable: false,
      configurable: true
    });
    var v = null;
    try {
      v = (3).___test_prop___;
      if (v === 3) { return false; }
      if (v instanceof Number) { return true; }
      return 'unexpected boxing test result: ' + v;
    } finally {
      delete Number.prototype.___test_prop___;
    }
  }

  /**
   * A non-strict getter is supposed to coerce its 'this' in the same
   * manner as non-strict functions. However, on some platforms, they
   * fail to coerce primitive types into their corresponding wrapper
   * objects.
   */
  function test_NON_STRICT_GETTER_DOESNT_BOX() {
    Object.defineProperty(Number.prototype, '___test_prop___', {
      get: new Function('return this;'),
      set: void 0,
      enumerable: false,
      configurable: true
    });
    var v = null;
    try {
      v = (3).___test_prop___;
      if (v instanceof Number) { return false; }
      if (v === 3) { return true; }
      return 'unexpected non-boxing test result: ' + v;
    } finally {
      delete Number.prototype.___test_prop___;
    }
  }

  /**
   * A non-configurable __proto__ property appearing even on
   * Object.create(null). It may still be a bug if it were configurable, but
   * we only care about the case where we cannot replace it.
   */
  function test_NONCONFIGURABLE_OWN_PROTO() {
    try {
      var o = Object.create(null);
    } catch (e) {
      if (e.message === NO_CREATE_NULL) {
        // result of repair_FREEZING_BREAKS_PROTOTYPES
        return false;
      } else {
        throw e;
      }
    }
    var desc = Object.getOwnPropertyDescriptor(o, '__proto__');
    if (desc === undefined) { return false; }
    if (desc.configurable) { return false; }
    if (desc.value === null && desc.configurable === false) {
      // the problematic-for-us case, known to occur in Chrome 25.0.1364.172
      return true;
    }
    return 'Unexpected __proto__ own property descriptor, enumerable: ' +
      desc.enumerable + ', value: ' + desc.value;
  }

  function getThrowTypeError() {
    return Object.getOwnPropertyDescriptor(getThrowTypeError, 'arguments').get;
  }

  /**
   * [[ThrowTypeError]] is extensible or has modifiable properties.
   */
  function test_THROWTYPEERROR_UNFROZEN() {
    return !Object.isFrozen(getThrowTypeError());
  }

  /**
   * [[ThrowTypeError]] has properties which the spec gives to other function
   * objects but not [[ThrowTypeError]].
   *
   * We don't check for arbitrary properties because they might be extensions
   * for all function objects, which we don't particularly want to complain
   * about (and will delete via whitelisting).
   */
  function test_THROWTYPEERROR_PROPERTIES() {
    var tte = getThrowTypeError();
    return !!Object.getOwnPropertyDescriptor(tte, 'prototype') ||
        !!Object.getOwnPropertyDescriptor(tte, 'arguments') ||
        !!Object.getOwnPropertyDescriptor(tte, 'caller');
  }

  /**
   * See https://code.google.com/p/v8/issues/detail?id=2728
   * and https://code.google.com/p/google-caja/issues/detail?id=1616
   */
  function test_SYNTAX_ERRORS_ARENT_ALWAYS_EARLY() {
    try {
      unsafeEval('throw "not a SyntaxError"; return;');
    } catch (err) {
      if (err === 'not a SyntaxError') {
        return true;
      } else if (err instanceof SyntaxError) {
        return false;
      }
      return 'Unexpected error: ' + err;
    }
    return 'Invalid text parsed';
  }

  /**
   * See https://code.google.com/p/google-caja/issues/detail?id=1616
   */
  function test_CANT_SAFELY_VERIFY_SYNTAX() {
    try {
      // See explanation above the call to ses.verifyStrictFunctionBody
      // below.
      Function('/*', '*/){');
    } catch (err) {
      if (err instanceof SyntaxError) { return false; }
      return 'Unexpected error: ' + err;
    }
    if (ses.verifyStrictFunctionBody === simpleVerifyStrictFunctionBody) {
      return true;
    }

    if (ses.verifyStrictFunctionBody === verifyStrictFunctionBodyByParsing) {
      // This might not yet be the real one. If
      // repair_CANT_SAFELY_VERIFY_SYNTAX decides to verify by
      // parsing, then we're just going to assume here that it is safe
      // since we might not yet have access to the real parser to test.
      return false;
    }

    try {
      ses.CANT_SAFELY_VERIFY_SYNTAX_canary = false;
      try {
        // This test, when tried with simpleVerifyStrictFunctionBody even on
        // Safari 6.0.4 WebKit Nightly r151081 (the latest at the time
        // of this writing) causes the *browser* to crash.
        //
        // So to avoid crashing the browser, we first check if the
        // Function constructor itself suffers from the same
        // underlying problem, by making a similar check that does not
        // crash the Safari browser. See
        // https://bugs.webkit.org/show_bug.cgi?id=106160
        // If this check shows that the underlying problem is absent
        // then there's no problem. If it is present and no repair to
        // ses.verifyStrictFunctionBody has yet been attempted, then we
        // know we have the problem even without the following check.
        //
        // Even on Safari, if the repair has been attempted, then we
        // do fall through to the following check, since it will no
        // longer crash the browser.
        ses.verifyStrictFunctionBody(
          '}), (ses.CANT_SAFELY_VERIFY_SYNTAX_canary = true), (function(){');
      } catch (err) {
        if (err instanceof SyntaxError) { return false; }
        return 'Unexpected error: ' + err;
      }
      if (ses.CANT_SAFELY_VERIFY_SYNTAX_canary === true) { return true; }
      return 'Unexpected verification failure';
    } finally {
      delete ses.CANT_SAFELY_VERIFY_SYNTAX_canary;
    }
  }

  var typedArrayNames = [
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array'
  ];

  function test_TYPED_ARRAYS_THROW_DOMEXCEPTION() {
    if (global.DataView === 'undefined') { return false; }
    if (global.DOMException === 'undefined') { return false; }
    function subtest(f) {
      try {
        f();
      } catch (e) {
        if (e instanceof DOMException) {
          return true;
        } else if (e instanceof Error && !(e instanceof DOMException)) {
          return false;
        } else {
          return 'Exception from ' + f + ' of unexpected type: ' + e;
        }
      }
      return f + ' did not throw';
    };
    return [
      function() { new global.Int8Array(1).set(new global.Int8Array(), 10); },
      function() { new global.DataView(new global.ArrayBuffer(1)).getInt8(-1); }
    ].some(subtest);
  }

  /**
   * Observed on Safari 6.0.5 (8536.30.1): frozen typed array prototypes report
   * their properties as writable.
   */
  function test_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN() {
    // note: cannot test without frames
    return inTestFrame(function(window) {
      // Apply the repair which should fix the problem to the testing frame.
      // TODO(kpreid): Design a better architecture to handle cases like this
      // than one-off state flags.
      if (repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN_wasApplied) {
        // optional argument not supplied by normal repair process
        repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN(window);
      }

      var fail = false;
      typedArrayNames.forEach(function(ctorName) {
        var ctor = window[ctorName];
        if (!ctor) { return; }
        var proto = ctor.prototype;

        window.Object.freeze(proto);
        if (!window.Object.isFrozen(proto)) {
          fail = true;
          return;
        }

        window.Object.getOwnPropertyNames(proto, function(prop) {
          if (typeof fail === 'string') { return; }

          // check attributes
          var desc = window.Object.getOwnPropertyDescriptor(proto, prop);
          if (!desc.configurable && desc.writable) {
            fail = true;
          } else if (!desc.configurable && !desc.writable) {
            // correct result
          } else {
            fail = 'Unexpected property attributes for ' + ctorName + '.' +
                prop;
            return;
          }

          // check actual writability
          try { proto[prop] = 9; } catch (e) {}
          if (proto[prop] !== desc.value) {
            fail = 'Unexpected actual writability of ' + ctorName + '.' + prop;
            return;
          }
        });
      });
      return fail;
    });
  }

  /**
   * Detects
   * https://connect.microsoft.com/IE/feedback/details/811124/ie11-javascript-function-scoping-is-weird-with-respect-to-functions-and-try-catch
   * in strict code.
   *
   * A strict nested function definition should either be a syntax
   * error, as
   * http://wiki.ecmascript.org/doku.php?id=conventions:recommendations_for_implementors
   * recommends, or it should stay local to its block, as ES6
   * specifies. Within that block, an assignment to that function's
   * name should assign to the block-local variable defined by that
   * function.
   */
  function test_NESTED_STRICT_FUNCTIONS_LEAK() {
    try {
      return unsafeEval(
          '(function() {\n' +
          '  "use strict";\n' +
          '  var a = function good() { return false; };\n' +
          '  try {\n' +
          '    function a() { return true; }' +
          '    a = function blah() {\n' +
          '      return "Assignment skipped nested function definition";\n' +
          '    };\n' +
          '  } catch (x) {}\n' +
          '  return a();\n' +
          '})();\n');
    } catch (err) {
      if (err instanceof SyntaxError) {
        return false;
      }
      return 'Unexpected error from strict nested function: ' + err;
    }
  }

  ////////////////////// Repairs /////////////////////
  //
  // Each repair_NAME function exists primarily to repair the problem
  // indicated by the corresponding test_NAME function. But other test
  // failures can still trigger a given repair.


  var call = Function.prototype.call;
  var apply = Function.prototype.apply;

  var hop = Object.prototype.hasOwnProperty;
  var slice = Array.prototype.slice;
  var concat = Array.prototype.concat;
  var getPrototypeOf = Object.getPrototypeOf;
  var unsafeDefProp = Object.defineProperty;
  var isExtensible = Object.isExtensible;

  /*
   * Fixes both FUNCTION_PROTOTYPE_DESCRIPTOR_LIES and
   * DEFINING_READ_ONLY_PROTO_FAILS_SILENTLY.
   */
  function repair_DEFINE_PROPERTY() {
    function repairedDefineProperty(base, name, desc) {
      if (name === 'prototype' &&
          typeof base === 'function' &&
          'value' in desc) {
        try {
          base.prototype = desc.value;
        } catch (err) {
          logger.warn('prototype fixup failed', err);
        }
      } else if (name === '__proto__' && !isExtensible(base)) {
        throw TypeError('Cannot redefine __proto__ on a non-extensible object');
      }
      return unsafeDefProp(base, name, desc);
    }
    Object.defineProperty(Object, 'defineProperty', {
      value: repairedDefineProperty
    });
  }

  function repair_REGEXP_CANT_BE_NEUTERED() {
    var UnsafeRegExp = RegExp;
    var FakeRegExp = function RegExpWrapper(pattern, flags) {
      switch (arguments.length) {
        case 0: {
          return UnsafeRegExp();
        }
        case 1: {
          return UnsafeRegExp(pattern);
        }
        default: {
          return UnsafeRegExp(pattern, flags);
        }
      }
    };
    Object.defineProperty(FakeRegExp, 'prototype', {
      value: UnsafeRegExp.prototype
    });
    Object.defineProperty(FakeRegExp.prototype, 'constructor', {
      value: FakeRegExp
    });
    RegExp = FakeRegExp;
  }

  /**
   * Return a function suitable for using as a forEach argument on a
   * list of method names, where that function will monkey patch each
   * of these names methods on {@code constr.prototype} so that they
   * can't be called on a {@code constr.prototype} itself even across
   * frames.
   *
   * <p>This only works when {@code constr} corresponds to an internal
   * [[Class]] property whose value is {@code classString}. To test
   * for {@code constr.prototype} cross-frame, we observe that for all
   * objects of this [[Class]], only the prototypes directly inherit
   * from an object that does not have this [[Class]].
   */
  function makeMutableProtoPatcher(constr, classString) {
    var proto = constr.prototype;
    var baseToString = objToString.call(proto);
    if (baseToString !== '[object ' + classString + ']') {
      throw new TypeError('unexpected: ' + baseToString);
    }
    var grandProto = getPrototypeOf(proto);
    var grandBaseToString = objToString.call(grandProto);
    if (grandBaseToString === '[object ' + classString + ']') {
      throw new TypeError('malformed inheritance: ' + classString);
    }
    if (grandProto !== Object.prototype) {
      logger.log('unexpected inheritance: ' + classString);
    }
    function mutableProtoPatcher(name) {
      if (!hop.call(proto, name)) { return; }
      var originalMethod = proto[name];
      function replacement(var_args) {
        var parent = getPrototypeOf(this);
        if (parent !== proto) {
          // In the typical case, parent === proto, so the above test
          // lets the typical case succeed quickly.
          // Note that, even if parent === proto, that does not
          // necessarily mean that the method application will
          // succeed, since, for example, a non-Date can still inherit
          // from Date.prototype. However, in such cases, the built-in
          // method application will fail on its own without our help.
          if (objToString.call(parent) !== baseToString) {
            // As above, === baseToString does not necessarily mean
            // success, but the built-in failure again would not need
            // our help.
            var thisToString = objToString.call(this);
            if (thisToString === baseToString) {
              throw new TypeError('May not mutate internal state of a ' +
                                  classString + '.prototype');
            } else {
              throw new TypeError('Unexpected: ' + thisToString);
            }
          }
        }
        return originalMethod.apply(this, arguments);
      }
      Object.defineProperty(proto, name, { value: replacement });
    }
    return mutableProtoPatcher;
  }


  function repair_MUTABLE_DATE_PROTO() {
    // Note: coordinate this list with maintenance of whitelist.js
    ['setYear',
     'setTime',
     'setFullYear',
     'setUTCFullYear',
     'setMonth',
     'setUTCMonth',
     'setDate',
     'setUTCDate',
     'setHours',
     'setUTCHours',
     'setMinutes',
     'setUTCMinutes',
     'setSeconds',
     'setUTCSeconds',
     'setMilliseconds',
     'setUTCMilliseconds'].forEach(makeMutableProtoPatcher(Date, 'Date'));
  }

  function repair_MUTABLE_WEAKMAP_PROTO() {
    // Note: coordinate this list with maintanence of whitelist.js
    ['set',
     'delete'].forEach(makeMutableProtoPatcher(WeakMap, 'WeakMap'));
  }

  function repair_NEED_TO_WRAP_FOREACH() {
    Object.defineProperty(Array.prototype, 'forEach', {
      // Taken from https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/forEach
      value: function(callback, thisArg) {
        var T, k;
        if (this === null || this === undefined) {
          throw new TypeError('this is null or not defined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (objToString.call(callback) !== '[object Function]') {
          throw new TypeError(callback + ' is not a function');
        }
        T = thisArg;
        k = 0;
        while(k < len) {
          var kValue;
          if (k in O) {
            kValue = O[k];
            callback.call(T, kValue, k, O);
          }
          k++;
        }
      }
    });
  }


  function repair_NEEDS_DUMMY_SETTER() {
    var defProp = Object.defineProperty;
    var gopd = Object.getOwnPropertyDescriptor;

    function dummySetter(newValue) {
      throw new TypeError('no setter for assigning: ' + newValue);
    }
    dummySetter.prototype = null;
    rememberToTamperProof(dummySetter);

    defProp(Object, 'defineProperty', {
      value: function setSetterDefProp(base, name, desc) {
        if (typeof desc.get === 'function' && desc.set === void 0) {
          var oldDesc = gopd(base, name);
          if (oldDesc) {
            var testBase = {};
            defProp(testBase, name, oldDesc);
            defProp(testBase, name, desc);
            desc = gopd(testBase, name);
            if (desc.set === void 0) { desc.set = dummySetter; }
          } else {
            if (objToString.call(base) === '[object HTMLFormElement]') {
              // This repair was triggering bug
              // https://code.google.com/p/chromium/issues/detail?id=94666
              // on Chrome, causing
              // https://code.google.com/p/google-caja/issues/detail?id=1401
              // so if base is an HTMLFormElement we skip this
              // fix. Since this repair and this situation are both
              // Chrome only, it is ok that we're conditioning this on
              // the unspecified [[Class]] value of base.
              //
              // To avoid the further bug identified at Comment 2
              // https://code.google.com/p/chromium/issues/detail?id=94666#c2
              // We also have to reconstruct the requested desc so that
              // the setter is absent. This is why we additionally
              // condition this special case on the absence of an own
              // name property on base.
              var desc2 = { get: desc.get };
              if ('enumerable' in desc) {
                desc2.enumerable = desc.enumerable;
              }
              if ('configurable' in desc) {
                desc2.configurable = desc.configurable;
              }
              var result = defProp(base, name, desc2);
              var newDesc = gopd(base, name);
              if (newDesc.get === desc.get) {
                return result;
              }
            }
            desc.set = dummySetter;
          }
        }
        return defProp(base, name, desc);
      }
    });
    NEEDS_DUMMY_SETTER_repaired = true;
  }

  function repair_JSON_PARSE_PROTO_CONFUSION() {
    var unsafeParse = JSON.parse;
    function validate(plainJSON) {
      if (plainJSON !== Object(plainJSON)) {
        // If we were trying to do a full validation, we would
        // validate that it is not NaN, Infinity, -Infinity, or
        // (if nested) undefined. However, we are currently only
        // trying to repair
        // https://code.google.com/p/v8/issues/detail?id=621
        // That's why this special case validate function is private
        // to this repair.
        return;
      }
      var proto = getPrototypeOf(plainJSON);
      if (proto !== Object.prototype && proto !== Array.prototype) {
        throw new TypeError(
          'Parse resulted in invalid JSON. ' +
            'See https://code.google.com/p/v8/issues/detail?id=621');
      }
      Object.keys(plainJSON).forEach(function(key) {
        validate(plainJSON[key]);
      });
    }
    Object.defineProperty(JSON, 'parse', {
      value: function parseWrapper(text, opt_reviver) {
        var result = unsafeParse(text);
        validate(result);
        if (opt_reviver) {
          return unsafeParse(text, opt_reviver);
        } else {
          return result;
        }
      },
      writable: true,
      enumerable: false,
      configurable: true
    });
  }

  function repair_PARSEINT_STILL_PARSING_OCTAL() {
    var badParseInt = parseInt;
    function goodParseInt(n, radix) {
      n = '' + n;
      // This turns an undefined radix into a NaN but is ok since NaN
      // is treated as undefined by badParseInt
      radix = +radix;
      var isHexOrOctal = /^\s*[+-]?\s*0(x?)/.exec(n);
      var isOct = isHexOrOctal ? isHexOrOctal[1] !== 'x' : false;

      if (isOct && (radix !== radix || 0 === radix)) {
        return badParseInt(n, 10);
      }
      return badParseInt(n, radix);
    }
    parseInt = goodParseInt;
  }

  function repair_ASSIGN_CAN_OVERRIDE_FROZEN() {
    simpleTamperProofOk = true;
  }

  function repair_CANT_REDEFINE_NAN_TO_ITSELF() {
    var defProp = Object.defineProperty;
    // 'value' handled separately
    var attrs = ['writable', 'get', 'set', 'enumerable', 'configurable'];

    defProp(Object, 'defineProperty', {
      value: function(base, name, desc) {
        try {
          return defProp(base, name, desc);
        } catch (err) {
          var oldDesc = Object.getOwnPropertyDescriptor(base, name);
          for (var i = 0, len = attrs.length; i < len; i++) {
            var attr = attrs[i];
            if (attr in desc && desc[attr] !== oldDesc[attr]) { throw err; }
          }
          if (!('value' in desc) || is(desc.value, oldDesc.value)) {
            return base;
          }
          throw err;
        }
      }
    });
  }

  function repair_FREEZE_IS_FRAME_DEPENDENT() {
    // Every operation which sets an object's [[Extensible]] to false.
    fix('preventExtensions');
    fix('freeze');
    fix('seal');

    function fix(prop) {
      var base = Object[prop];
      Object.defineProperty(Object, prop, {
        configurable: true,  // attributes per ES5.1 section 15
        writable: true,
        value: function frameCheckWrapper(obj) {
          var parent = obj;
          while (Object.getPrototypeOf(parent) !== null) {
            parent = Object.getPrototypeOf(parent);
          }
          if (parent === obj || parent === Object.prototype) {
            // Unsoundly assuming this object is from this frame; we're trying
            // to catch mistakes here, not to do a 100% repair.
            return base(obj);
          } else {
            throw new Error(
                'Cannot reliably ' + prop + ' object from other frame.');
          }
        }
      });
    }
  }

  function repair_POP_IGNORES_FROZEN() {
    var pop = Array.prototype.pop;
    var frozen = Object.isFrozen;
    Object.defineProperty(Array.prototype, 'pop', {
      value: function () {
        if (frozen(this)) {
          throw new TypeError('Cannot pop a frozen object.');
        }
        return pop.call(this);
      },
      configurable : true,
      writable: true
    });
  }

  function repair_SORT_IGNORES_FROZEN() {
    var sort = Array.prototype.sort;
    var frozen = Object.isFrozen;
    Object.defineProperty(Array.prototype, 'sort', {
      value: function (compareFn) {
        if (frozen(this)) {
          throw new TypeError('Cannot sort a frozen object.');
        }
        if (arguments.length === 0) {
          return sort.call(this);
        } else {
          return sort.call(this, compareFn);
        }
      },
      configurable: true,
      writable: true
    });
  }

  function repair_PUSH_IGNORES_SEALED() {
    var push = Array.prototype.push;
    var sealed = Object.isSealed;
    Object.defineProperty(Array.prototype, 'push', {
      value: function(compareFn) {
        if (sealed(this)) {
          throw new TypeError('Cannot push onto a sealed object.');
        }
        return push.apply(this, arguments);
      },
      configurable: true,
      writable: true
    });
  }

  function repair_ARRAY_LENGTH_MUTABLE() {
    var freeze = Object.freeze;
    var seal = Object.seal;
    var preventExtensions = Object.preventExtensions;
    var isArray = Array.isArray;
    ['freeze', 'seal', 'preventExtensions'].forEach(function(prop) {
      var desc = Object.getOwnPropertyDescriptor(Object, prop);
      var existingMethod = desc.value;
      desc.value = function protectLengthWrapper(O) {
        if (isArray(O)) {
          var lengthDesc = Object.getOwnPropertyDescriptor(O, 'length');
          // This is the key repair: making length specifically non-writable
          // forces the slow path for array-modifying operations where an
          // ordinary freeze doesn't. Note that this is technically incorrect
          // for seal and preventExtensions, but modifying the length of such
          // an array makes little sense anyway.
          if (typeof lengthDesc.writable === 'boolean') {
            lengthDesc.writable = false;
            Object.defineProperty(O, 'length', lengthDesc);
          }
        }
        existingMethod(O);
        return O;
      };
      Object.defineProperty(Object, prop, desc);
    });
  }

  // error message is matched elsewhere (for tighter bounds on catch)
  var NO_CREATE_NULL =
      'Repaired Object.create can not support Object.create(null)';
  // optional argument is used for the test-of-repair
  function repair_FREEZING_BREAKS_PROTOTYPES(opt_Object) {
    var baseObject = opt_Object || Object;
    var baseDefProp = baseObject.defineProperties;

    // Object.create fails to override [[Prototype]]; reimplement it.
    baseObject.defineProperty(baseObject, 'create', {
      configurable: true,  // attributes per ES5.1 section 15
      writable: true,
      value: function repairedObjectCreate(O, Properties) {
        if (O === null) {
          // Not ES5 conformant, but hopefully adequate for Caja as ES5/3 also
          // does not support Object.create(null).
          throw new TypeError(NO_CREATE_NULL);
        }
        // "1. If Type(O) is not Object or Null throw a TypeError exception."
        if (O !== Object(O)) {
          throw new TypeError('Object.create: prototype must be an object');
        }
        // "2. Let obj be the result of creating a new object as if by the
        // expression new Object() where Object is the standard built-in
        // constructor with that name"
        // "3. Set the [[Prototype]] internal property of obj to O."
        // Cannot redefine [[Prototype]], so we use the .prototype trick instead
        function temporaryConstructor() {}
        temporaryConstructor.prototype = O;
        var obj = new temporaryConstructor();
        // "4. If the argument Properties is present and not undefined, add own
        // properties to obj as if by calling the standard built-in function
        // Object.defineProperties with arguments obj and Properties."
        if (Properties !== void 0) {
          baseDefProp(obj, Properties);
        }
        // "5. Return obj."
        return obj;
      }
    });

    var baseErrorToString = Error.prototype.toString;

    // Error.prototype.toString fails to use the .name and .message.
    // This is being repaired not because it is a critical issue but because
    // it is more direct than disabling the tests of error taming which fail.
    baseObject.defineProperty(Error.prototype, 'toString', {
      configurable: true,  // attributes per ES5.1 section 15
      writable: true,
      value: function repairedErrorToString() {
        // "1. Let O be the this value."
        var O = this;
        // "2. If Type(O) is not Object, throw a TypeError exception."
        if (O !== baseObject(O)) {
          throw new TypeError('Error.prototype.toString: this not an object');
        }
        // "3. Let name be the result of calling the [[Get]] internal method of
        // O with argument "name"."
        var name = O.name;
        // "4. If name is undefined, then let name be "Error"; else let name be
        // ToString(name)."
        name = name === void 0 ? 'Error' : '' + name;
        // "5. Let msg be the result of calling the [[Get]] internal method of O
        // with argument "message"."
        var msg = O.message;
        // "6. If msg is undefined, then let msg be the empty String; else let
        // msg be ToString(msg)."
        msg = msg === void 0 ? '' : '' + msg;
        // "7. If msg is undefined, then let msg be the empty String; else let
        // msg be ToString(msg)."
        msg = msg === void 0 ? '' : '' + msg;
        // "8. If name is the empty String, return msg."
        if (name === '') { return msg; }
        // "9. If msg is the empty String, return name."
        if (msg === '') { return name; }
        // "10. Return the result of concatenating name, ":", a single space
        // character, and msg."
        return name + ': ' + msg;
      }
    });

    if (baseObject === Object) {
      repair_FREEZING_BREAKS_PROTOTYPES_wasApplied = true;
    }
  }

  function repair_FREEZING_BREAKS_WEAKMAP() {
    global.WeakMap = undefined;
  }

  function repair_ERRORS_HAVE_INVISIBLE_PROPERTIES() {
    var baseGOPN = Object.getOwnPropertyNames;
    var baseGOPD = Object.getOwnPropertyDescriptor;
    var errorPattern = /^\[object [\w$]*Error\]$/;

    function touch(name) {
      // the forEach will invoke this function with this === the error instance
      baseGOPD(this, name);
    }

    Object.defineProperty(Object, 'getOwnPropertyNames', {
      writable: true,  // allow other repairs to stack on
      value: function repairedErrorInvisGOPN(object) {
        // Note: not adequate in future ES6 world (TODO(erights): explain why)
        if (errorPattern.test(objToString.call(object))) {
          errorInstanceKnownInvisibleList.forEach(touch, object);
        }
        return baseGOPN(object);
      }
    });
  }

  /**
   * Note that this repair does not repair the Function constructor
   * itself at this stage. Rather, it repairs ses.verifyStrictFunctionBody,
   * which startSES uses to build a safe Function constructor from the
   * unsafe one.
   *
   * <p>The repair strategy depends on what other bugs this platform
   * suffers from. In the absence of SYNTAX_ERRORS_ARENT_ALWAYS_EARLY,
   * STRICT_EVAL_LEAKS_GLOBAL_VARS, and
   * STRICT_EVAL_LEAKS_GLOBAL_FUNCS, then we can use the cheaper
   * verifyStrictFunctionBodyByEvalThrowing. Otherwise, if a parser is
   * available, we use verifyStrictFunctionBodyByParsing. Otherwise we
   * fail to repair.
   */
  function repair_CANT_SAFELY_VERIFY_SYNTAX() {
    if (!test_SYNTAX_ERRORS_ARENT_ALWAYS_EARLY() &&
        !test_STRICT_EVAL_LEAKS_GLOBAL_VARS() &&
        !test_STRICT_EVAL_LEAKS_GLOBAL_FUNCS()) {
      ses.verifyStrictFunctionBody = verifyStrictFunctionBodyByEvalThrowing;
    } else if (canMitigateSrcGotchas) {
      ses.verifyStrictFunctionBody = verifyStrictFunctionBodyByParsing;
    } else {
      // No known repairs under these conditions
    }
  }

  function repair_TYPED_ARRAYS_THROW_DOMEXCEPTION() {
    var protos = typedArrayNames.map(
        function(ctorName) { return global[ctorName].prototype; });
    protos.push(global.DataView.prototype);
    protos.forEach(function(proto) {
      Object.getOwnPropertyNames(proto).forEach(function(prop) {
        if (/^[gs]et/.test(prop)) {
          var origMethod = proto[prop];
          proto[prop] = function exceptionAdapterWrapper(var_args) {
            try {
              origMethod.apply(this, arguments);
            } catch (e) {
              if (e instanceof DOMException) {
                throw new RangeError(e.message);
              }
            }
          };
        }
      });
    });
  }

  function repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN(opt_global) {
    var targetGlobal = opt_global || global;
    var typedArrayProtos = targetGlobal.Object.freeze(typedArrayNames.map(
        function(ctorName) { return targetGlobal[ctorName].prototype; }));

    var isFrozen = targetGlobal.Object.isFrozen;
    var getOwnPropertyDescriptor = targetGlobal.Object.getOwnPropertyDescriptor;

    Object.defineProperty(targetGlobal.Object, 'getOwnPropertyDescriptor', {
      configurable: true,
      writable: true,  // allow other repairs to stack on
      value: function getOwnPropertyDescriptor_typedArrayPatch(object, prop) {
        var desc = getOwnPropertyDescriptor(object, prop);
        if (desc && typedArrayProtos.indexOf(object) !== -1 &&
            'value' in desc && ses._primordialsHaveBeenFrozen) {
          // If it is one of the typed array prototypes then it will have been
          // frozen by startSES.
          desc.writable = false;
        }
        return desc;
      }
    });

    Object.defineProperty(targetGlobal.Object, 'isFrozen', {
      configurable: true,
      writable: true,  // allow other repairs to stack on
      value: function isFrozen_typedArrayPatch(object) {
        // If it is one of the typed array prototypes then it will have been
        // frozen by startSES.
        var v = typedArrayProtos.indexOf(object) !== -1;
        return isFrozen(object) || (v && ses._primordialsHaveBeenFrozen);
      }
    });

    // isSealed does not need repair as it already gives the correct answer.

    if (targetGlobal === global) {
      repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN_wasApplied = true;
    }
  }

  function repair_GLOBAL_LEAKS_FROM_ARRAY_METHODS() {
    var object = Array.prototype;
    [
      'concat', 'pop', 'push', 'shift', 'slice', 'splice', 'unshift'
    ].forEach(function(name) {
      // reuse desc to avoid reiterating prop attributes
      var desc = Object.getOwnPropertyDescriptor(object, name);
      var existingMethod = desc.value;

      if (Function.prototype.toString.call(existingMethod)
          .indexOf('[native code]') === -1) {
        // If the function has already been wrapped by one of our other repairs,
        // then we don't need to introduce this additional wrapper.
        return;
      }

      desc.value = function globalLeakDefenseWrapper() {
        // To repair this bug it is sufficient to force the method to be called
        // using .apply(), as it only occurs if it is called as a literal
        // function, e.g. var concat = Array.prototype.concat; concat().
        return existingMethod.apply(this, arguments);
      };
      Object.defineProperty(object, name, desc);
    });
  }

  ////////////////////// Generic tests/repairs /////////////////////
  //
  // These are tests and repairs which follow a pattern, such that it is
  // more practical to define them programmatically.

  function arrayMutatorProblem(destination, prop, testArgs) {
    /**
     * Tests only for likley symptoms of a seal violation or a
     * malformed array.
     *
     * <p>A sealed object can neither acquire new own properties
     * (because it is non-extensible) nor lose existing own properties
     * (because all its existing own properties are non-configurable),
     * so we check that the own properties that these methods would
     * normally manipulate remain in their original state. Changing
     * the "length" property of the array would not itself be a seal
     * violation, but if there is no other seal violation, such a
     * length change would result in a malformed array. (If needed,
     * the extensibility, non-deletability, and length change tests
     * could be separated into distinct tests.)
     */
    function test_method_IGNORES_SEALED() {
      var x = [2, 1];  // disordered to detect sort()
      Object.seal(x);
      try {
        x[prop].apply(x, testArgs);
      } catch (e) {
        // It is actually still a non-conformance if the array was not
        // badly mutated but the method did not throw, but not an
        // UNSAFE_SPEC_VIOLATION.
      }
      return !(x.length === 2 && ('0' in x) && ('1' in x) && !('2' in x));
    }

    /**
     * Tests for likely symptoms of a freeze violation.
     *
     * <p>A frozen object can neither acquire new own properties
     * (because it is non-extensible) nor can any of its existing own
     * data properties be mutated (since they are non-configurable,
     * non-writable). So we check for any of the mutations that these
     * methods would normally cause.
     */
    function test_method_IGNORES_FROZEN() {
      var x = [2, 1];  // disordered to detect sort()
      Object.freeze(x);
      try {
        x[prop].apply(x, testArgs);
      } catch (e) {
        // It is actually still a non-conformance if the array was not
        // mutated but the method did not throw, but not an
        // UNSAFE_SPEC_VIOLATION.
      }
      return !(x.length === 2 && x[0] === 2 && x[1] === 1 && !('2' in x));
    }

    function repair_method_IGNORES_SEALED() {
      var originalMethod = Array.prototype[prop];
      var isSealed = Object.isSealed;
      Object.defineProperty(Array.prototype, prop, {
        value: function repairedArrayMutator(var_args) {
          if (isSealed(this)) {
            throw new TypeError('Cannot mutate a sealed array.');
          }
          return originalMethod.apply(this, arguments);
        },
        configurable: true,
        writable: true
      });
    }

    destination.push({
      id: (prop + '_IGNORES_SEALED').toUpperCase(),
      description: 'Array.prototype.' + prop + ' ignores sealing',
      test: test_method_IGNORES_SEALED,
      repair: repair_method_IGNORES_SEALED,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // does not protect individual properties, only
          // fully sealed objects
      urls: [
          'https://code.google.com/p/v8/issues/detail?id=2615',
          'https://code.google.com/p/v8/issues/detail?id=2711'],
      sections: ['15.2.3.8'],
      tests: [] // TODO(jasvir): Add to test262
    });
    destination.push({
      id: (prop + '_IGNORES_FROZEN').toUpperCase(),
      description: 'Array.prototype.' + prop + ' ignores freezing',
      test: test_method_IGNORES_FROZEN,
      repair: repair_method_IGNORES_SEALED,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: [
          'https://code.google.com/p/v8/issues/detail?id=2615',
          'https://code.google.com/p/v8/issues/detail?id=2711'],
      sections: ['15.2.3.9'],
      tests: [] // TODO(jasvir): Add to test262
    });
  }

  ////////////////////// Problem Records /////////////////////

  var severities = ses.severities;
  var statuses = ses.statuses;

  /**
   * First test whether the platform can even support our repair
   * attempts.
   */
  var baseProblems = [
    {
      id: 'MISSING_GETOWNPROPNAMES',
      description: 'Missing getOwnPropertyNames',
      test: test_MISSING_GETOWNPROPNAMES,
      repair: void 0,
      preSeverity: severities.NOT_SUPPORTED,
      canRepair: false,
      urls: [],
      sections: ['15.2.3.4'],
      tests: ['15.2.3.4-0-1']
    },
    {
      id: 'PROTO_SETTER_UNGETTABLE',
      description: "Can't get Object.prototype.__proto__'s setter",
      test: test_PROTO_SETTER_UNGETTABLE,
      repair: void 0,
      preSeverity: severities.NOT_SUPPORTED,
      canRepair: false,
      urls: ['mailto:DSK-383293@bugs.opera.com'],
      sections: [],
      tests: []
    }
  ];

  /**
   * Run these only if baseProblems report success.
   */
  var supportedProblems = [
    {
      id: 'GLOBAL_LEAKS_FROM_GLOBAL_FUNCTION_CALLS',
      description: 'Global object leaks from global function calls',
      test: test_GLOBAL_LEAKS_FROM_GLOBAL_FUNCTION_CALLS,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // Not repairable without rewriting
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=64250'],
      sections: ['10.2.1.2', '10.2.1.2.6'],
      tests: ['10.4.3-1-8gs']
    },
    {
      id: 'GLOBAL_LEAKS_FROM_ANON_FUNCTION_CALLS',
      description: 'Global object leaks from anonymous function calls',
      test: test_GLOBAL_LEAKS_FROM_ANON_FUNCTION_CALLS,
      repair: void 0,  // Not repairable without rewriting
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,
      urls: [],
      sections: ['10.4.3'],
      tests: ['S10.4.3_A1']
    },
    {
      id: 'GLOBAL_LEAKS_FROM_STRICT_THIS',
      description: 'Global leaks through strict this',
      test: test_GLOBAL_LEAKS_FROM_STRICT_THIS,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // Not repairable without rewriting
      urls: [],
      sections: ['10.4.3'],
      tests: ['10.4.3-1-8gs', '10.4.3-1-8-s']
    },
    {
      id: 'GLOBAL_LEAKS_FROM_BUILTINS',
      description: 'Global object leaks from built-in methods',
      test: test_GLOBAL_LEAKS_FROM_BUILTINS,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=51097',
             'https://bugs.webkit.org/show_bug.cgi?id=58338',
             'https://code.google.com/p/v8/issues/detail?id=1437',
             'https://connect.microsoft.com/IE/feedback/details/' +
               '685430/global-object-leaks-from-built-in-methods'],
      sections: ['15.2.4.4'],
      tests: ['S15.2.4.4_A14']
    },
    {
      id: 'GLOBAL_LEAKS_FROM_GLOBALLY_CALLED_BUILTINS',
      description: 'Global object leaks from globally called built-in methods',
      test: test_GLOBAL_LEAKS_FROM_GLOBALLY_CALLED_BUILTINS,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: [],
      sections: ['10.2.1.2', '10.2.1.2.6', '15.2.4.4'],
      tests: ['S15.2.4.4_A15']
    },
    {
      id: 'MISSING_FREEZE_ETC',
      description: 'Object.freeze is missing',
      test: test_MISSING_FREEZE_ETC,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=55736'],
      sections: ['15.2.3.9'],
      tests: ['15.2.3.9-0-1']
    },
    {
      id: 'FUNCTION_PROTOTYPE_DESCRIPTOR_LIES',
      description: 'A function.prototype\'s descriptor lies',
      test: test_FUNCTION_PROTOTYPE_DESCRIPTOR_LIES,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1530',
             'https://code.google.com/p/v8/issues/detail?id=1570'],
      sections: ['15.2.3.3', '15.2.3.6', '15.3.5.2'],
      tests: ['S15.3.3.1_A4']
    },
    {
      id: 'MISSING_CALLEE_DESCRIPTOR',
      description: 'Phantom callee on strict functions',
      test: test_MISSING_CALLEE_DESCRIPTOR,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=55537'],
      sections: ['15.2.3.4'],
      tests: ['S15.2.3.4_A1_T1']
    },
    {
      id: 'STRICT_DELETE_RETURNS_FALSE',
      description: 'Strict delete returned false rather than throwing',
      test: test_STRICT_DELETE_RETURNS_FALSE,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Not repairable without rewriting
      urls: ['https://connect.microsoft.com/IE/feedback/details/' +
               '685432/strict-delete-sometimes-returns-false-' +
               'rather-than-throwing'],
      sections: ['11.4.1'],
      tests: ['S11.4.1_A5']
    },
    {
      id: 'REGEXP_CANT_BE_NEUTERED',
      description: 'Non-deletable RegExp statics are a' +
        ' global communication channel',
      test: test_REGEXP_CANT_BE_NEUTERED,
      repair: repair_REGEXP_CANT_BE_NEUTERED,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: true,
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=591846',
             'http://wiki.ecmascript.org/doku.php?id=' +
               'conventions:make_non-standard_properties_configurable',
             'https://connect.microsoft.com/IE/feedback/details/' +
               '685439/non-deletable-regexp-statics-are-a-global-' +
               'communication-channel'],
      sections: ['11.4.1'],
      tests: ['S11.4.1_A5']
    },
    {
      id: 'REGEXP_TEST_EXEC_UNSAFE',
      description: 'RegExp.exec leaks match globally',
      test: test_REGEXP_TEST_EXEC_UNSAFE,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1393',
             'https://code.google.com/p/chromium/issues/detail?id=75740',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=635017',
             'https://code.google.com/p/google-caja/issues/detail?id=528'],
      sections: ['15.10.6.2'],
      tests: ['S15.10.6.2_A12']
    },
    {
      id: 'MISSING_BIND',
      description: 'Function.prototype.bind is missing',
      test: test_MISSING_BIND,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=26382',
             'https://bugs.webkit.org/show_bug.cgi?id=42371'],
      sections: ['15.3.4.5'],
      tests: ['S15.3.4.5_A3']
    },
    {
      id: 'BIND_CALLS_APPLY',
      description: 'Function.prototype.bind calls .apply rather than [[Call]]',
      test: test_BIND_CALLS_APPLY,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=892',
             'https://code.google.com/p/v8/issues/detail?id=828'],
      sections: ['15.3.4.5.1'],
      tests: ['S15.3.4.5_A4']
    },
    {
      id: 'BIND_CANT_CURRY_NEW',
      description: 'Function.prototype.bind does not curry construction',
      test: test_BIND_CANT_CURRY_NEW,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // JS-based repair essentially impossible
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=26382#c29'],
      sections: ['15.3.4.5.2'],
      tests: ['S15.3.4.5_A5']
    },
    {
      id: 'MUTABLE_DATE_PROTO',
      description: 'Date.prototype is a global communication channel',
      test: test_MUTABLE_DATE_PROTO,
      repair: repair_MUTABLE_DATE_PROTO,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: true,
      urls: ['https://code.google.com/p/google-caja/issues/detail?id=1362'],
      sections: ['15.9.5'],
      tests: []
    },
    {
      id: 'MUTABLE_WEAKMAP_PROTO',
      description: 'WeakMap.prototype is a global communication channel',
      test: test_MUTABLE_WEAKMAP_PROTO,
      repair: repair_MUTABLE_WEAKMAP_PROTO,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: true,
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=656828'],
      sections: [],
      tests: []
    },
    {
      id: 'NEED_TO_WRAP_FOREACH',
      description: 'Array forEach cannot be frozen while in progress',
      test: test_NEED_TO_WRAP_FOREACH,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1447'],
      sections: ['15.4.4.18'],
      tests: ['S15.4.4.18_A1', 'S15.4.4.18_A2']
    },
    {
      id: 'FOREACH_COERCES_THISOBJ',
      description: 'Array forEach converts primitive thisObj arg to object',
      test: test_FOREACH_COERCES_THISOBJ,
      repair: repair_NEED_TO_WRAP_FOREACH,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2273',
             'https://developer.mozilla.org/en-US/docs/JavaScript/' +
               'Reference/Global_Objects/Array/forEach'],
      sections: ['15.4.4.18'],
      tests: []
    },
    {
      id: 'NEEDS_DUMMY_SETTER',
      description: 'Workaround undiagnosed need for dummy setter',
      test: test_NEEDS_DUMMY_SETTER,
      repair: repair_NEEDS_DUMMY_SETTER,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: [],
      sections: [],
      tests: []
    },
    {
      id: 'FORM_GETTERS_DISAPPEAR',
      description: 'Getter on HTMLFormElement disappears',
      test: test_FORM_GETTERS_DISAPPEAR,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/chromium/issues/detail?id=94666',
             'https://code.google.com/p/v8/issues/detail?id=1651',
             'https://code.google.com/p/google-caja/issues/detail?id=1401'],
      sections: ['15.2.3.6'],
      tests: ['S15.2.3.6_A1']
    },
    {
      id: 'ACCESSORS_INHERIT_AS_OWN',
      description: 'Accessor properties inherit as own properties',
      test: test_ACCESSORS_INHERIT_AS_OWN,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=637994'],
      sections: ['8.6.1', '15.2.3.6'],
      tests: ['S15.2.3.6_A2']
    },
    {
      id: 'SORT_LEAKS_GLOBAL',
      description: 'Array sort leaks global',
      test: test_SORT_LEAKS_GLOBAL,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1360'],
      sections: ['15.4.4.11'],
      tests: ['S15.4.4.11_A8']
    },
    {
      id: 'REPLACE_LEAKS_GLOBAL',
      description: 'String replace leaks global',
      test: test_REPLACE_LEAKS_GLOBAL,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1360',
             'https://connect.microsoft.com/IE/feedback/details/' +
               '685928/bad-this-binding-for-callback-in-string-' +
               'prototype-replace'],
      sections: ['15.5.4.11'],
      tests: ['S15.5.4.11_A12']
    },
    {
      id: 'CANT_GOPD_CALLER',
      description: 'getOwnPropertyDescriptor on strict "caller" throws',
      test: test_CANT_GOPD_CALLER,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://connect.microsoft.com/IE/feedback/details/' +
               '685436/getownpropertydescriptor-on-strict-caller-throws'],
      sections: ['15.2.3.3', '13.2', '13.2.3'],
      tests: ['S13.2_A6_T1']
    },
    {
      id: 'CANT_HASOWNPROPERTY_CALLER',
      description: 'strict_function.hasOwnProperty("caller") throws',
      test: test_CANT_HASOWNPROPERTY_CALLER,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=63398#c3'],
      sections: ['15.2.4.5', '13.2', '13.2.3'],
      tests: ['S13.2_A7_T1']
    },
    {
      id: 'CANT_IN_CALLER',
      description: 'Cannot "in" caller on strict function',
      test: test_CANT_IN_CALLER,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=63398'],
      sections: ['11.8.7', '13.2', '13.2.3'],
      tests: ['S13.2_A8_T1']
    },
    {
      id: 'CANT_IN_ARGUMENTS',
      description: 'Cannot "in" arguments on strict function',
      test: test_CANT_IN_ARGUMENTS,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=63398'],
      sections: ['11.8.7', '13.2', '13.2.3'],
      tests: ['S13.2_A8_T2']
    },
    {
      id: 'STRICT_CALLER_NOT_POISONED',
      description: 'Strict "caller" not poisoned',
      test: test_STRICT_CALLER_NOT_POISONED,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,
      urls: [],
      sections: ['13.2'],
      tests: ['S13.2.3_A1']
    },
    {
      id: 'STRICT_ARGUMENTS_NOT_POISONED',
      description: 'Strict "arguments" not poisoned',
      test: test_STRICT_ARGUMENTS_NOT_POISONED,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,
      urls: [],
      sections: ['13.2'],
      tests: ['S13.2.3_A1']
    },
    {
      id: 'BUILTIN_LEAKS_CALLER',
      description: 'Built in functions leak "caller"',
      test: test_BUILTIN_LEAKS_CALLER,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,
      urls: ['https://code.google.com/p/v8/issues/detail?id=1643',
             'https://code.google.com/p/v8/issues/detail?id=1548',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=591846',
             'http://wiki.ecmascript.org/doku.php?id=' +
               'conventions:make_non-standard_properties_configurable'],
      sections: [],
      tests: ['Sbp_A10_T1']
    },
    {
      id: 'BUILTIN_LEAKS_ARGUMENTS',
      description: 'Built in functions leak "arguments"',
      test: test_BUILTIN_LEAKS_ARGUMENTS,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1643',
             'https://code.google.com/p/v8/issues/detail?id=1548',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=591846',
             'http://wiki.ecmascript.org/doku.php?id=' +
               'conventions:make_non-standard_properties_configurable'],
      sections: [],
      tests: ['Sbp_A10_T2']
    },
    {
      id: 'BOUND_FUNCTION_LEAKS_CALLER',
      description: 'Bound functions leak "caller"',
      test: test_BOUND_FUNCTION_LEAKS_CALLER,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=893',
             'https://bugs.webkit.org/show_bug.cgi?id=63398'],
      sections: ['15.3.4.5'],
      tests: ['S13.2.3_A1', 'S15.3.4.5_A1']
    },
    {
      id: 'BOUND_FUNCTION_LEAKS_ARGUMENTS',
      description: 'Bound functions leak "arguments"',
      test: test_BOUND_FUNCTION_LEAKS_ARGUMENTS,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=893',
             'https://bugs.webkit.org/show_bug.cgi?id=63398'],
      sections: ['15.3.4.5'],
      tests: ['S13.2.3_A1', 'S15.3.4.5_A2']
    },
    {
      id: 'DELETED_BUILTINS_IN_OWN_NAMES',
      description: 'Deleting built-in leaves phantom behind',
      test: test_DELETED_BUILTINS_IN_OWN_NAMES,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=70207'],
      sections: ['15.2.3.4'],
      tests: []
    },
    {
      id: 'GETOWNPROPDESC_OF_ITS_OWN_CALLER_FAILS',
      description: 'getOwnPropertyDescriptor on its own "caller" fails',
      test: test_GETOWNPROPDESC_OF_ITS_OWN_CALLER_FAILS,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Long-dead bug, not worth keeping old repair around
      urls: ['https://code.google.com/p/v8/issues/detail?id=1769'],
      sections: ['13.2', '15.2.3.3'],
      tests: []
    },
    {
      id: 'JSON_PARSE_PROTO_CONFUSION',
      description: 'JSON.parse confused by "__proto__"',
      test: test_JSON_PARSE_PROTO_CONFUSION,
      repair: repair_JSON_PARSE_PROTO_CONFUSION,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=621',
             'https://code.google.com/p/v8/issues/detail?id=1310'],
      sections: ['15.12.2'],
      tests: ['S15.12.2_A1']
    },
    {
      id: 'PROTO_NOT_FROZEN',
      description: 'Prototype still mutable on non-extensible object',
      test: test_PROTO_NOT_FROZEN,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=65832',
             'https://bugs.webkit.org/show_bug.cgi?id=78438'],
      sections: ['8.6.2'],
      tests: ['S8.6.2_A8']
    },
    {
      id: 'PROTO_REDEFINABLE',
      description: 'Prototype still redefinable on non-extensible object',
      test: test_PROTO_REDEFINABLE,
      repair: void 0,
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=65832'],
      sections: ['8.6.2'],
      tests: ['S8.6.2_A8']
    },
    {
      id: 'DEFINING_READ_ONLY_PROTO_FAILS_SILENTLY',
      description: 'Defining __proto__ on non-extensible object fails silently',
      test: test_DEFINING_READ_ONLY_PROTO_FAILS_SILENTLY,
      repair: repair_DEFINE_PROPERTY,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2441'],
      sections: ['8.6.2'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'STRICT_EVAL_LEAKS_GLOBAL_VARS',
      description: 'Strict eval function leaks variable definitions',
      test: test_STRICT_EVAL_LEAKS_GLOBAL_VARS,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://code.google.com/p/v8/issues/detail?id=1624'],
      sections: ['10.4.2.1'],
      tests: ['S10.4.2.1_A1']
    },
    {
      id: 'STRICT_EVAL_LEAKS_GLOBAL_FUNCS',
      description: 'Strict eval function leaks function definitions',
      test: test_STRICT_EVAL_LEAKS_GLOBAL_FUNCS,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://code.google.com/p/v8/issues/detail?id=1624'],
      sections: ['10.4.2.1'],
      tests: ['S10.4.2.1_A1']
    },
    {
      id: 'EVAL_BREAKS_MASKING',
      description: 'Eval breaks masking of named functions in non-strict code',
      test: test_EVAL_BREAKS_MASKING,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // No platform with this bug is fully repairable,
          // so it's not worth creating a repair for this bug.
      urls: ['https://code.google.com/p/v8/issues/detail?id=2396'],
      sections: ['10.2'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'PARSEINT_STILL_PARSING_OCTAL',
      description: 'parseInt still parsing octal',
      test: test_PARSEINT_STILL_PARSING_OCTAL,
      repair: repair_PARSEINT_STILL_PARSING_OCTAL,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=1645'],
      sections: ['15.1.2.2'],
      tests: ['S15.1.2.2_A5.1_T1']
    },
    {
      id: 'STRICT_E4X_LITERALS_ALLOWED',
      description: 'E4X literals allowed in strict code',
      test: test_STRICT_E4X_LITERALS_ALLOWED,
      repair: void 0,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: false,  // Not repairable without parsing
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=695577',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=695579'],
      sections: [],
      tests: []
    },
    {
      id: 'ASSIGN_CAN_OVERRIDE_FROZEN',
      description: 'Assignment can override frozen inherited property',
      test: test_ASSIGN_CAN_OVERRIDE_FROZEN,
      repair: repair_ASSIGN_CAN_OVERRIDE_FROZEN,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // We actually prefer the override behavior, and the
          // 'repair' sets a flag to take advantage of it.
      urls: ['https://code.google.com/p/v8/issues/detail?id=1169',
             'https://code.google.com/p/v8/issues/detail?id=1475',
             'https://mail.mozilla.org/pipermail/es-discuss/' +
               '2011-November/017997.html',
             'http://wiki.ecmascript.org/doku.php?id=strawman:' +
               'fixing_override_mistake'],
      sections: ['8.12.4'],
      tests: ['15.2.3.6-4-405']
    },
    {
      id: 'INCREMENT_IGNORES_FROZEN',
      description: 'Increment operators can mutate frozen properties',
      test: test_INCREMENT_IGNORES_FROZEN,
      repair: void 0,
      // NOTE: If mitigation by parsing/rewrite is available, we set
      // this to SAFE_SPEC_VIOLATION to allow SES initialization to
      // succeed, relying on the fact that startSES will use
      // mitigateGotchas.js to rewrite code to work around the
      // problem. Otherwise, the problem is NOT_OCAP_SAFE severity.
      //
      // TODO(ihab.awad): Build a better system to record problems of
      // unsafe severity that are known to be fixed by startSES using
      // mitigateSrcGotchas.
      preSeverity: canMitigateSrcGotchas ?
        severities.SAFE_SPEC_VIOLATION : severities.NOT_OCAP_SAFE,
      canRepair: false,  // Protection is based on rewriting, not repair
      urls: ['https://code.google.com/p/v8/issues/detail?id=2779'],
      sections: ['11.4.4', '8.12.4'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'POP_IGNORES_FROZEN',
      description: 'Array.prototype.pop ignores frozeness',
      test: test_POP_IGNORES_FROZEN,
      repair: repair_POP_IGNORES_FROZEN,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=75788'],
      sections: ['15.4.4.6'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'SORT_IGNORES_FROZEN',
      description: 'Array.prototype.sort ignores frozeness',
      test: test_SORT_IGNORES_FROZEN,
      repair: repair_SORT_IGNORES_FROZEN,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2419'],
      sections: ['15.4.4.11'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'PUSH_IGNORES_SEALED',
      description: 'Array.prototype.push ignores sealing',
      test: test_PUSH_IGNORES_SEALED,
      repair: repair_ARRAY_LENGTH_MUTABLE,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2412'],
      sections: ['15.4.4.11'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'PUSH_DOES_NOT_THROW_ON_FROZEN_ARRAY',
      description: 'Array.prototype.push does not throw on a frozen array',
      test: test_PUSH_DOES_NOT_THROW_ON_FROZEN_ARRAY,
      repair: repair_PUSH_IGNORES_SEALED,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2711'],
      sections: ['15.2.3.9'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'PUSH_IGNORES_FROZEN',
      description: 'Array.prototype.push ignores frozen',
      test: test_PUSH_IGNORES_FROZEN,
      repair: repair_ARRAY_LENGTH_MUTABLE,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2711'],
      sections: ['15.2.3.9'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'ARRAYS_DELETE_NONCONFIGURABLE',
      description: 'Setting [].length can delete non-configurable elements',
      test: test_ARRAYS_DELETE_NONCONFIGURABLE,
      repair: void 0,  // Not repairable
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=590690'],
      sections: ['15.4.5.2'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'ARRAY_LENGTH_MUTABLE',
      description: 'Freezing an array does not make .length immutable',
      test: test_ARRAY_LENGTH_MUTABLE,
      repair: repair_ARRAY_LENGTH_MUTABLE,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2711'],
      sections: ['15.4.5.1'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'ARRAYS_MODIFY_READONLY',
      description: 'Extending an array can modify read-only array length',
      test: test_ARRAYS_MODIFY_READONLY,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Not repairable
      urls: ['https://code.google.com/p/v8/issues/detail?id=2379'],
      sections: ['15.4.5.1.3.f'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'CANT_REDEFINE_NAN_TO_ITSELF',
      description: 'Cannot redefine global NaN to itself',
      test: test_CANT_REDEFINE_NAN_TO_ITSELF,
      repair: repair_CANT_REDEFINE_NAN_TO_ITSELF,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: [], // Seen on WebKit Nightly. TODO(erights): report
      sections: ['8.12.9', '15.1.1.1'],
      tests: [] // TODO(jasvir): Add to test262
    },
    {
      id: 'FREEZE_IS_FRAME_DEPENDENT',
      description: 'Object.freeze falsely succeeds on other-frame objects',
      test: test_FREEZE_IS_FRAME_DEPENDENT,
      repair: repair_FREEZE_IS_FRAME_DEPENDENT,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Repair is useful but inadequate
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=784892',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=674195',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=789897'],
      sections: [],
      tests: []
    },
    {
      id: 'UNEXPECTED_ERROR_PROPERTIES',
      description: 'Error instances have unexpected properties',
      test: test_UNEXPECTED_ERROR_PROPERTIES,
      repair: void 0,
      preSeverity: severities.NEW_SYMPTOM,
      canRepair: false,  // Behavior of instances is not repairable
      urls: [],
      sections: [],
      tests: []
    },
    {
      id: 'ERRORS_HAVE_INVISIBLE_PROPERTIES',
      description: 'Error instances have invisible properties',
      test: test_ERRORS_HAVE_INVISIBLE_PROPERTIES,
      repair: repair_ERRORS_HAVE_INVISIBLE_PROPERTIES,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=726477',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=724768'],
      sections: [],
      tests: []
    },
    {
      id: 'STRICT_GETTER_BOXES',
      description: 'Strict getter must not box this, but does',
      test: test_STRICT_GETTER_BOXES,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Not repairable without rewriting
      urls: ['https://bugs.ecmascript.org/show_bug.cgi?id=284',
             'https://bugs.webkit.org/show_bug.cgi?id=79843',
             'https://connect.microsoft.com/ie/feedback/details/727027',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=603201',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=732669'],
             // Opera DSK-358415
      sections: ['10.4.3'],
      tests: ['10.4.3-1-59-s']
    },
    {
      id: 'NON_STRICT_GETTER_DOESNT_BOX',
      description: 'Non-strict getter must box this, but does not',
      test: test_NON_STRICT_GETTER_DOESNT_BOX,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Not repairable without rewriting
      urls: ['https://bugs.ecmascript.org/show_bug.cgi?id=284',
             'https://code.google.com/p/v8/issues/detail?id=1977',
             'https://bugzilla.mozilla.org/show_bug.cgi?id=732669'],
      sections: ['10.4.3'],
      tests: ['10.4.3-1-59-s']
    },
    {
      id: 'NONCONFIGURABLE_OWN_PROTO',
      description: 'All objects have non-configurable __proto__',
      test: test_NONCONFIGURABLE_OWN_PROTO,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // Behavior of instances is not repairable
      urls: ['https://code.google.com/p/v8/issues/detail?id=1310',
        'https://mail.mozilla.org/pipermail/es-discuss/2013-March/029177.html'],
      sections: [],  // Not spelled out in spec, according to Brendan Eich (see
                     // es-discuss link)
      tests: []  // TODO(jasvir): Add to test262 once we have a section to cite
    },
    {
      id: 'FREEZING_BREAKS_PROTOTYPES',
      description: 'Freezing Object.prototype breaks prototype setting',
      test: test_FREEZING_BREAKS_PROTOTYPES,
      repair: repair_FREEZING_BREAKS_PROTOTYPES,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2565'],
      sections: ['15.2.3.5'],
      tests: []  // TODO(kpreid): find/add test262
    },
    {
      id: 'FREEZING_BREAKS_WEAKMAP',
      description: 'Freezing Object.prototype breaks WeakMap',
      test: test_FREEZING_BREAKS_WEAKMAP,
      repair: repair_FREEZING_BREAKS_WEAKMAP,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: ['https://code.google.com/p/v8/issues/detail?id=2829'],
      sections: [],  // TODO(kpreid): cite when ES6 is final
      tests: []  // TODO(kpreid): cite when ES6 is final
    },
    {
      id: 'THROWTYPEERROR_UNFROZEN',
      description: '[[ThrowTypeError]] is not frozen',
      test: test_THROWTYPEERROR_UNFROZEN,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,  // Note: Safe only because
          // startSES will do whitelist and defense; per spec intent it's an
          // undesired communication channel.
      canRepair: false,  // will be repaired by whitelist
      urls: ['https://bugs.webkit.org/show_bug.cgi?id=108873'],
             // TODO(kpreid): find or file Firefox bug (writable props)
             // TODO(kpreid): find or file Chrome bug (has a .prototype)
      sections: ['13.2.3'],
      tests: []  // TODO(jasvir): Add to test262
    },
    {
      id: 'THROWTYPEERROR_PROPERTIES',
      description: '[[ThrowTypeError]] has normal function properties',
      test: test_THROWTYPEERROR_PROPERTIES,
      repair: void 0,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: false,  // will be repaired by whitelist
      urls: [],
             // WebKit is OK
             // TODO(kpreid): find or file Firefox bug (has writable props)
             // TODO(kpreid): find or file Chrome bug (has a .prototype!)
      sections: ['13.2.3'],
      tests: []  // TODO(jasvir): Add to test262
    },
    {
      id: 'SYNTAX_ERRORS_ARENT_ALWAYS_EARLY',
      description: 'SyntaxErrors aren\'t always early',
      test: test_SYNTAX_ERRORS_ARENT_ALWAYS_EARLY,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,  // Not repairable without parsing
      urls: ['https://code.google.com/p/v8/issues/detail?id=2728',
             'https://code.google.com/p/google-caja/issues/detail?id=1616'],
      sections: [],
      tests: []
    },
    {
      id: 'CANT_SAFELY_VERIFY_SYNTAX',
      description: 'Function constructor does not verify syntax',
      test: test_CANT_SAFELY_VERIFY_SYNTAX,
      // This does not repair Function but only ses.verifyStrictFunctionBody
      // (see above)
      repair: repair_CANT_SAFELY_VERIFY_SYNTAX,
      preSeverity: severities.NOT_ISOLATED,
      canRepair: true,
      urls: ['https://code.google.com/p/google-caja/issues/detail?id=1616',
             'https://code.google.com/p/v8/issues/detail?id=2470',
             'https://bugs.webkit.org/show_bug.cgi?id=106160'],
      sections: ['15.3.2.1'],
      tests: []
    },
    {
      id: 'TYPED_ARRAYS_THROW_DOMEXCEPTION',
      description: 'Typed Array operations throw DOMException',
      test: test_TYPED_ARRAYS_THROW_DOMEXCEPTION,
      repair: repair_TYPED_ARRAYS_THROW_DOMEXCEPTION,
      // indirectly unsafe: DOMException is poisonous to WeakMaps on FF, so we
      // choose not to expose it, and un-whitelisted types do not get frozen by
      // startSES and are therefore global mutable state.
      preSeverity: severities.NOT_OCAP_SAFE,
      canRepair: true,
      urls: [],  // TODO(kpreid): file bugs if appropriate
      sections: ['13.2.3'],
      tests: []  // hopefully will be in ES6 tests
    },
    {
      id: 'TYPED_ARRAY_PROTOS_LOOK_UNFROZEN',
      description: 'Typed Array prototypes look unfrozen',
      test: test_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN,
      repair: repair_TYPED_ARRAY_PROTOS_LOOK_UNFROZEN,
      preSeverity: severities.SAFE_SPEC_VIOLATION,
      canRepair: true,
      urls: [],  // TODO(kpreid): file bugs if appropriate
          // appears on Safari only
      sections: ['15.2.3.9', '15.2.3.12'],
      tests: []  // hopefully will be in ES6 tests
    },
    {
      id: 'NESTED_STRICT_FUNCTIONS_LEAK',
      description: 'Strict nested functions leak from block scope',
      test: test_NESTED_STRICT_FUNCTIONS_LEAK,
      repair: void 0,
      preSeverity: severities.UNSAFE_SPEC_VIOLATION,
      canRepair: false,
      urls: ['https://connect.microsoft.com/IE/feedback/details/811124/ie11-javascript-function-scoping-is-weird-with-respect-to-functions-and-try-catch',
             'http://wiki.ecmascript.org/doku.php?id=conventions:recommendations_for_implementors'],
      sections: [],
      tests: []  // hopefully will be in ES6 tests
    }
  ];

  // UNSHIFT_IGNORES_SEALED
  // UNSHIFT_IGNORES_FROZEN
  // SPLICE_IGNORES_SEALED
  // SPLICE_IGNORES_FROZEN
  // SHIFT_IGNORES_SEALED
  // SHIFT_IGNORES_FROZEN
  arrayMutatorProblem(supportedProblems, 'unshift', ['foo']);
  arrayMutatorProblem(supportedProblems, 'splice', [0, 0, 'foo']);
  arrayMutatorProblem(supportedProblems, 'shift', []);
  // Array.prototype.{push,pop,sort} are also subject to the problem
  // arrayMutatorProblem handles, but are handled separately and more
  // precisely.

  // Note: GLOBAL_LEAKS_FROM_ARRAY_METHODS should be LAST in the list so as
  // to run its repair last, which reduces the number of chained wrapper
  // functions resulting from repairs.
  supportedProblems.push({
    id: 'GLOBAL_LEAKS_FROM_ARRAY_METHODS',
    description: 'Array methods as functions operate on global object',
    test: test_GLOBAL_LEAKS_FROM_ARRAY_METHODS,
    repair: repair_GLOBAL_LEAKS_FROM_ARRAY_METHODS,
    preSeverity: severities.NOT_ISOLATED,
    canRepair: true,
    urls: ['https://code.google.com/p/google-caja/issues/detail?id=1789',
           'https://code.google.com/p/v8/issues/detail?id=2758'],
    sections: ['15.4.4'],
    tests: [] // TODO(kpreid): Add to test262
  });

  ////////////////////// Testing, Repairing, Reporting ///////////

  ses._repairer.addPostTestKludge(function extraRepair() {
    if (Object.isFrozen && Object.isFrozen(Array.prototype.forEach)) {
      // Need to do it anyway, to repair the sacrificial freezing we
      // needed to do to test. Once we can permanently retire this
      // test, we can also retire the redundant repair.
      repair_NEED_TO_WRAP_FOREACH();
    }
  });

  try {
    strictForEachFn(baseProblems, ses._repairer.registerProblem);
    ses._repairer.testAndRepair();
    if (ses._repairer.okToLoad()) {
      strictForEachFn(supportedProblems, ses._repairer.registerProblem);
      ses._repairer.testAndRepair();
    }
    
    var reports = ses._repairer.getReports();

    // Made available to allow for later code reusing our diagnoses to work
    // around non-repairable problems in application-specific ways. startSES
    // will also expose this on cajaVM for unprivileged code.
    var indexedReports;
    try {
      indexedReports = Object.create(null);
    } catch (e) {
      // repair_FREEZING_BREAKS_PROTOTYPES does not support null
      indexedReports = {};
    }
    reports.forEach(function (report) {
      indexedReports[report.id] = report;
    });
    ses.es5ProblemReports = indexedReports;
  } catch (err) {
    ses._repairer.updateMaxSeverity(ses.severities.NOT_SUPPORTED);
    var during = ses._repairer.wasDoing();
    logger.error('ES5 Repair ' + during + 'failed with: ', err);
  }

  logger.reportMax();

})(this);
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Install a leaky WeakMap emulation on platforms that
 * don't provide a built-in one.
 *
 * <p>Assumes that an ES5 platform where, if {@code WeakMap} is
 * already present, then it conforms to the anticipated ES6
 * specification. To run this file on an ES5 or almost ES5
 * implementation where the {@code WeakMap} specification does not
 * quite conform, run <code>repairES5.js</code> first.
 *
 * <p>Even though WeakMapModule is not global, the linter thinks it
 * is, which is why it is in the overrides list below.
 *
 * <p>NOTE: Before using this WeakMap emulation in a non-SES
 * environment, see the note below about hiddenRecord.
 *
 * @author Mark S. Miller
 * @requires crypto, ArrayBuffer, Uint8Array, navigator, console
 * @overrides WeakMap, ses, Proxy
 * @overrides WeakMapModule
 */

/**
 * This {@code WeakMap} emulation is observably equivalent to the
 * ES-Harmony WeakMap, but with leakier garbage collection properties.
 *
 * <p>As with true WeakMaps, in this emulation, a key does not
 * retain maps indexed by that key and (crucially) a map does not
 * retain the keys it indexes. A map by itself also does not retain
 * the values associated with that map.
 *
 * <p>However, the values associated with a key in some map are
 * retained so long as that key is retained and those associations are
 * not overridden. For example, when used to support membranes, all
 * values exported from a given membrane will live for the lifetime
 * they would have had in the absence of an interposed membrane. Even
 * when the membrane is revoked, all objects that would have been
 * reachable in the absence of revocation will still be reachable, as
 * far as the GC can tell, even though they will no longer be relevant
 * to ongoing computation.
 *
 * <p>The API implemented here is approximately the API as implemented
 * in FF6.0a1 and agreed to by MarkM, Andreas Gal, and Dave Herman,
 * rather than the offially approved proposal page. TODO(erights):
 * upgrade the ecmascript WeakMap proposal page to explain this API
 * change and present to EcmaScript committee for their approval.
 *
 * <p>The first difference between the emulation here and that in
 * FF6.0a1 is the presence of non enumerable {@code get___, has___,
 * set___, and delete___} methods on WeakMap instances to represent
 * what would be the hidden internal properties of a primitive
 * implementation. Whereas the FF6.0a1 WeakMap.prototype methods
 * require their {@code this} to be a genuine WeakMap instance (i.e.,
 * an object of {@code [[Class]]} "WeakMap}), since there is nothing
 * unforgeable about the pseudo-internal method names used here,
 * nothing prevents these emulated prototype methods from being
 * applied to non-WeakMaps with pseudo-internal methods of the same
 * names.
 *
 * <p>Another difference is that our emulated {@code
 * WeakMap.prototype} is not itself a WeakMap. A problem with the
 * current FF6.0a1 API is that WeakMap.prototype is itself a WeakMap
 * providing ambient mutability and an ambient communications
 * channel. Thus, if a WeakMap is already present and has this
 * problem, repairES5.js wraps it in a safe wrappper in order to
 * prevent access to this channel. (See
 * PATCH_MUTABLE_FROZEN_WEAKMAP_PROTO in repairES5.js).
 */
var WeakMap;

/**
 * If this is a full <a href=
 * "http://code.google.com/p/es-lab/wiki/SecureableES5"
 * >secureable ES5</a> platform and the ES-Harmony {@code WeakMap} is
 * absent, install an approximate emulation.
 *
 * <p>If WeakMap is present but cannot store some objects, use our approximate
 * emulation as a wrapper.
 *
 * <p>If this is almost a secureable ES5 platform, then WeakMap.js
 * should be run after repairES5.js.
 *
 * <p>See {@code WeakMap} for documentation of the garbage collection
 * properties of this WeakMap emulation.
 */
(function WeakMapModule() {
  "use strict";

  if (typeof ses !== 'undefined' && ses.okToLoad && !ses.okToLoad()) {
    // already too broken, so give up
    return;
  }

  function constFunc(func) {
    func.prototype = null;
    return Object.freeze(func);
  }

  var calledAsFunctionWarningDone = false;
  function calledAsFunctionWarning() {
    // Future ES6 WeakMap is currently (2013-09-10) expected to reject WeakMap()
    // but we used to permit it and do it ourselves, so warn only.
    if (!calledAsFunctionWarningDone && typeof console !== 'undefined') {
      calledAsFunctionWarningDone = true;
      console.warn('WeakMap should be invoked as new WeakMap(), not ' +
          'WeakMap(). This will be an error in the future.');
    }
  }

  // used by implementWeakMap()
  var hiddenNameInstalled = false;

  /**
   * In some cases (current Firefox), we must make a choice betweeen a
   * WeakMap which is capable of using all varieties of host objects as
   * keys and one which is capable of safely using proxies as keys. See
   * comments below about HostWeakMap and DoubleWeakMap for details.
   *
   * This function (which is a global, not exposed to guests) marks a
   * WeakMap as permitted to do what is necessary to index all host
   * objects, at the cost of making it unsafe for proxies.
   *
   * Do not apply this function to anything which is not a genuine
   * fresh WeakMap.
   */
  function weakMapPermitHostObjects(map) {
    // identity of function used as a secret -- good enough and cheap
    if (map.permitHostObjects___) {
      map.permitHostObjects___(weakMapPermitHostObjects);
    }
  }
  if (typeof ses !== 'undefined') {
    ses.weakMapPermitHostObjects = weakMapPermitHostObjects;
  }

  var repairer = ses._repairer || new ses._Repairer();
  var severities = ses.severities;

  repairer.registerProblem({
    id: 'WEAKMAP_DOES_NOT_EXIST',
    description: 'WeakMap does not exist',
    test: function() {
      return typeof WeakMap !== 'function';
    },
    repair: function() {
      WeakMap = implementWeakMap();

      // Emulated WeakMaps are incompatible with native proxies (because proxies
      // can observe the hidden name), so we must disable Proxy usage (in
      // ArrayLike and Domado, currently).
      if (typeof Proxy !== 'undefined') {
        Proxy = undefined;
      }
    },
    preSeverity: severities.SAFE_SPEC_VIOLATION,
    canRepair: true,
    urls: [],
    sections: [],  // TODO(kpreid): cite ES6 when published
    tests: []  // TODO(kpreid): should be in test262
  });
  repairer.registerProblem({
    id: 'WEAKMAP_REJECTS_SOME_KEYS',
    description: 'WeakMap throws when given some keys',
    test: function() {
      if (typeof WeakMap === 'undefined') { return false; }

      // detect our repair
      if (WeakMap.name === 'DoubleWeakMap') { return false; }

      // As of this writing (2013-05-06) Firefox's WeakMaps have a miscellany
      // of objects they won't accept, and we don't want to make an exhaustive
      // list, and testing for just one will be a problem if that one is fixed
      // alone (as they did for Event).
      return (typeof navigator !== 'undefined' &&
          /Firefox/.test(navigator.userAgent));

      // If there is a platform that we *can* reliably test on, here's how to
      // do it:
      //  var problematic = ... ;
      //  var testHostMap = new HostWeakMap();
      //  try {
      //    testHostMap.set(problematic, 1);  // Firefox 20 will throw here
      //    if (testHostMap.get(problematic) === 1) {
      //      return false;
      //    } else {
      //      return 'Neither threw nor stored';
      //    }
      //  } catch (e) { return true; }
    },
    repair: function() {
      WeakMap = wrapWeakMap(WeakMap, false);
    },
    preSeverity: severities.SAFE_SPEC_VIOLATION,
    canRepair: true,
    urls: ['https://bugzilla.mozilla.org/show_bug.cgi?id=803844'],
    sections: [],  // TODO(kpreid): cite ES6 when published
    tests: []  // TODO(kpreid): should be in test262
  });
  repairer.registerProblem({
    id: 'WEAKMAP_DROPS_FROZEN_KEYS',
    description: 'WeakMap drops frozen keys',
    test: function() {
      // IE 11 bug: WeakMaps silently fail to store frozen objects.
      if (typeof WeakMap === 'undefined') { return false; }
      var testMap = new WeakMap();
      var testObject = Object.freeze({});
      testMap.set(testObject, 1);
      var result = testMap.get(testObject);
      if (result === 1) {
        return false;
      } else if (result === undefined) {
        return true;
      } else {
        return 'Unexpected get() result: ' + result;
      }
    },
    repair: function() {
      WeakMap = wrapWeakMap(WeakMap, true);

      // In this mode we are always using double maps, so we are not proxy-safe.
      // The combination of WEAKMAP_DROPS_FROZEN_KEYS and supporting Proxy
      // does not occur in any known browser, but we had best be safe.
      if (typeof Proxy !== 'undefined') {
        Proxy = undefined;
      }
    },
    preSeverity: severities.UNSAFE_SPEC_VIOLATION,
    canRepair: true,
    urls: [],  // TODO(kpreid): File/find bug with IE 11
    sections: [],  // TODO(kpreid): cite ES6 when published
    tests: []  // TODO(kpreid): should be in test262
  });

  repairer.testAndRepair();

  // Implementation -- code after here is only functions

  function implementWeakMap() {
    // paranoia since wrapWeakMap calls implementWeakMap as well as itself
    // being a repair
    if (hiddenNameInstalled) {
      throw new Error("shouldn't happen: implementWeakMap called twice");
    }
    hiddenNameInstalled = true;

    var hop = Object.prototype.hasOwnProperty;
    var gopn = Object.getOwnPropertyNames;
    var defProp = Object.defineProperty;
    var isExtensible = Object.isExtensible;

    /**
     * Security depends on HIDDEN_NAME being both <i>unguessable</i> and
     * <i>undiscoverable</i> by untrusted code.
     *
     * <p>Given the known weaknesses of Math.random() on existing
     * browsers, it does not generate unguessability we can be confident
     * of.
     *
     * <p>It is the monkey patching logic in this file that is intended
     * to ensure undiscoverability. The basic idea is that there are
     * three fundamental means of discovering properties of an object:
     * The for/in loop, Object.keys(), and Object.getOwnPropertyNames(),
     * as well as some proposed ES6 extensions that appear on our
     * whitelist. The first two only discover enumerable properties, and
     * we only use HIDDEN_NAME to name a non-enumerable property, so the
     * only remaining threat should be getOwnPropertyNames and some
     * proposed ES6 extensions that appear on our whitelist. We monkey
     * patch them to remove HIDDEN_NAME from the list of properties they
     * returns.
     *
     * <p>TODO(erights): On a platform with built-in Proxies, proxies
     * could be used to trap and thereby discover the HIDDEN_NAME, so we
     * need to monkey patch Proxy.create, Proxy.createFunction, etc, in
     * order to wrap the provided handler with the real handler which
     * filters out all traps using HIDDEN_NAME.
     *
     * <p>TODO(erights): Revisit Mike Stay's suggestion that we use an
     * encapsulated function at a not-necessarily-secret name, which
     * uses the Stiegler shared-state rights amplification pattern to
     * reveal the associated value only to the WeakMap in which this key
     * is associated with that value. Since only the key retains the
     * function, the function can also remember the key without causing
     * leakage of the key, so this doesn't violate our general gc
     * goals. In addition, because the name need not be a guarded
     * secret, we could efficiently handle cross-frame frozen keys.
     */
    var HIDDEN_NAME_PREFIX = 'weakmap:';
    var HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'ident:' + Math.random() + '___';

    if (typeof crypto !== 'undefined' &&
        typeof crypto.getRandomValues === 'function' &&
        typeof ArrayBuffer === 'function' &&
        typeof Uint8Array === 'function') {
      var ab = new ArrayBuffer(25);
      var u8s = new Uint8Array(ab);
      crypto.getRandomValues(u8s);
      HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'rand:' +
        Array.prototype.map.call(u8s, function(u8) {
          return (u8 % 36).toString(36);
        }).join('') + '___';
    }

    function isNotHiddenName(name) {
      return !(
          name.substr(0, HIDDEN_NAME_PREFIX.length) == HIDDEN_NAME_PREFIX &&
          name.substr(name.length - 3) === '___');
    }

    /**
     * Monkey patch getOwnPropertyNames to avoid revealing the
     * HIDDEN_NAME.
     *
     * <p>The ES5.1 spec requires each name to appear only once, but as
     * of this writing, this requirement is controversial for ES6, so we
     * made this code robust against this case. If the resulting extra
     * search turns out to be expensive, we can probably relax this once
     * ES6 is adequately supported on all major browsers, iff no browser
     * versions we support at that time have relaxed this constraint
     * without providing built-in ES6 WeakMaps.
     */
    defProp(Object, 'getOwnPropertyNames', {
      value: function fakeGetOwnPropertyNames(obj) {
        return gopn(obj).filter(isNotHiddenName);
      }
    });

    /**
     * getPropertyNames is not in ES5 but it is proposed for ES6 and
     * does appear in our whitelist, so we need to clean it too.
     */
    if ('getPropertyNames' in Object) {
      var originalGetPropertyNames = Object.getPropertyNames;
      defProp(Object, 'getPropertyNames', {
        value: function fakeGetPropertyNames(obj) {
          return originalGetPropertyNames(obj).filter(isNotHiddenName);
        }
      });
    }

    /**
     * <p>To treat objects as identity-keys with reasonable efficiency
     * on ES5 by itself (i.e., without any object-keyed collections), we
     * need to add a hidden property to such key objects when we
     * can. This raises several issues:
     * <ul>
     * <li>Arranging to add this property to objects before we lose the
     *     chance, and
     * <li>Hiding the existence of this new property from most
     *     JavaScript code.
     * <li>Preventing <i>certification theft</i>, where one object is
     *     created falsely claiming to be the key of an association
     *     actually keyed by another object.
     * <li>Preventing <i>value theft</i>, where untrusted code with
     *     access to a key object but not a weak map nevertheless
     *     obtains access to the value associated with that key in that
     *     weak map.
     * </ul>
     * We do so by
     * <ul>
     * <li>Making the name of the hidden property unguessable, so "[]"
     *     indexing, which we cannot intercept, cannot be used to access
     *     a property without knowing the name.
     * <li>Making the hidden property non-enumerable, so we need not
     *     worry about for-in loops or {@code Object.keys},
     * <li>monkey patching those reflective methods that would
     *     prevent extensions, to add this hidden property first,
     * <li>monkey patching those methods that would reveal this
     *     hidden property.
     * </ul>
     * Unfortunately, because of same-origin iframes, we cannot reliably
     * add this hidden property before an object becomes
     * non-extensible. Instead, if we encounter a non-extensible object
     * without a hidden record that we can detect (whether or not it has
     * a hidden record stored under a name secret to us), then we just
     * use the key object itself to represent its identity in a brute
     * force leaky map stored in the weak map, losing all the advantages
     * of weakness for these.
     */
    function getHiddenRecord(key) {
      if (key !== Object(key)) {
        throw new TypeError('Not an object: ' + key);
      }
      var hiddenRecord = key[HIDDEN_NAME];
      if (hiddenRecord && hiddenRecord.key === key) { return hiddenRecord; }
      if (!isExtensible(key)) {
        // Weak map must brute force, as explained in doc-comment above.
        return void 0;
      }

      // The hiddenRecord and the key point directly at each other, via
      // the "key" and HIDDEN_NAME properties respectively. The key
      // field is for quickly verifying that this hidden record is an
      // own property, not a hidden record from up the prototype chain.
      //
      // NOTE: Because this WeakMap emulation is meant only for systems like
      // SES where Object.prototype is frozen without any numeric
      // properties, it is ok to use an object literal for the hiddenRecord.
      // This has two advantages:
      // * It is much faster in a performance critical place
      // * It avoids relying on Object.create(null), which had been
      //   problematic on Chrome 28.0.1480.0. See
      //   https://code.google.com/p/google-caja/issues/detail?id=1687
      hiddenRecord = { key: key };

      // When using this WeakMap emulation on platforms where
      // Object.prototype might not be frozen and Object.create(null) is
      // reliable, use the following two commented out lines instead.
      // hiddenRecord = Object.create(null);
      // hiddenRecord.key = key;

      // Please contact us if you need this to work on platforms where
      // Object.prototype might not be frozen and
      // Object.create(null) might not be reliable.

      defProp(key, HIDDEN_NAME, {
        value: hiddenRecord,
        writable: false,
        enumerable: false,
        configurable: false
      });
      return hiddenRecord;
    }


    /**
     * Monkey patch operations that would make their argument
     * non-extensible.
     *
     * <p>The monkey patched versions throw a TypeError if their
     * argument is not an object, so it should only be done to functions
     * that should throw a TypeError anyway if their argument is not an
     * object.
     */
    (function(){
      var oldFreeze = Object.freeze;
      defProp(Object, 'freeze', {
        value: function identifyingFreeze(obj) {
          getHiddenRecord(obj);
          return oldFreeze(obj);
        }
      });
      var oldSeal = Object.seal;
      defProp(Object, 'seal', {
        value: function identifyingSeal(obj) {
          getHiddenRecord(obj);
          return oldSeal(obj);
        }
      });
      var oldPreventExtensions = Object.preventExtensions;
      defProp(Object, 'preventExtensions', {
        value: function identifyingPreventExtensions(obj) {
          getHiddenRecord(obj);
          return oldPreventExtensions(obj);
        }
      });
    })();


    function constFunc(func) {
      func.prototype = null;
      return Object.freeze(func);
    }

    var calledAsFunctionWarningDone = false;
    function calledAsFunctionWarning() {
      // Future ES6 WeakMap is currently (2013-09-10) expected to reject WeakMap()
      // but we used to permit it and do it ourselves, so warn only.
      if (!calledAsFunctionWarningDone && typeof console !== 'undefined') {
        calledAsFunctionWarningDone = true;
        console.warn('WeakMap should be invoked as new WeakMap(), not ' +
            'WeakMap(). This will be an error in the future.');
      }
    }

    var nextId = 0;

    var OurWeakMap = function() {
      if (!(this instanceof OurWeakMap)) {  // approximate test for new ...()
        calledAsFunctionWarning();
      }

      // We are currently (12/25/2012) never encountering any prematurely
      // non-extensible keys.
      var keys = []; // brute force for prematurely non-extensible keys.
      var values = []; // brute force for corresponding values.
      var id = nextId++;

      function get___(key, opt_default) {
        var index;
        var hiddenRecord = getHiddenRecord(key);
        if (hiddenRecord) {
          return id in hiddenRecord ? hiddenRecord[id] : opt_default;
        } else {
          index = keys.indexOf(key);
          return index >= 0 ? values[index] : opt_default;
        }
      }

      function has___(key) {
        var hiddenRecord = getHiddenRecord(key);
        if (hiddenRecord) {
          return id in hiddenRecord;
        } else {
          return keys.indexOf(key) >= 0;
        }
      }

      function set___(key, value) {
        var index;
        var hiddenRecord = getHiddenRecord(key);
        if (hiddenRecord) {
          hiddenRecord[id] = value;
        } else {
          index = keys.indexOf(key);
          if (index >= 0) {
            values[index] = value;
          } else {
            // Since some browsers preemptively terminate slow turns but
            // then continue computing with presumably corrupted heap
            // state, we here defensively get keys.length first and then
            // use it to update both the values and keys arrays, keeping
            // them in sync.
            index = keys.length;
            values[index] = value;
            // If we crash here, values will be one longer than keys.
            keys[index] = key;
          }
        }
        return this;
      }

      function delete___(key) {
        var hiddenRecord = getHiddenRecord(key);
        var index, lastIndex;
        if (hiddenRecord) {
          return id in hiddenRecord && delete hiddenRecord[id];
        } else {
          index = keys.indexOf(key);
          if (index < 0) {
            return false;
          }
          // Since some browsers preemptively terminate slow turns but
          // then continue computing with potentially corrupted heap
          // state, we here defensively get keys.length first and then use
          // it to update both the keys and the values array, keeping
          // them in sync. We update the two with an order of assignments,
          // such that any prefix of these assignments will preserve the
          // key/value correspondence, either before or after the delete.
          // Note that this needs to work correctly when index === lastIndex.
          lastIndex = keys.length - 1;
          keys[index] = void 0;
          // If we crash here, there's a void 0 in the keys array, but
          // no operation will cause a "keys.indexOf(void 0)", since
          // getHiddenRecord(void 0) will always throw an error first.
          values[index] = values[lastIndex];
          // If we crash here, values[index] cannot be found here,
          // because keys[index] is void 0.
          keys[index] = keys[lastIndex];
          // If index === lastIndex and we crash here, then keys[index]
          // is still void 0, since the aliasing killed the previous key.
          keys.length = lastIndex;
          // If we crash here, keys will be one shorter than values.
          values.length = lastIndex;
          return true;
        }
      }

      return Object.create(OurWeakMap.prototype, {
        get___:    { value: constFunc(get___) },
        has___:    { value: constFunc(has___) },
        set___:    { value: constFunc(set___) },
        delete___: { value: constFunc(delete___) }
      });
    };

    OurWeakMap.prototype = Object.create(Object.prototype, {
      get: {
        /**
         * Return the value most recently associated with key, or
         * opt_default if none.
         */
        value: function get(key, opt_default) {
          return this.get___(key, opt_default);
        },
        writable: true,
        configurable: true
      },

      has: {
        /**
         * Is there a value associated with key in this WeakMap?
         */
        value: function has(key) {
          return this.has___(key);
        },
        writable: true,
        configurable: true
      },

      set: {
        /**
         * Associate value with key in this WeakMap, overwriting any
         * previous association if present.
         */
        value: function set(key, value) {
          return this.set___(key, value);
        },
        writable: true,
        configurable: true
      },

      'delete': {
        /**
         * Remove any association for key in this WeakMap, returning
         * whether there was one.
         *
         * <p>Note that the boolean return here does not work like the
         * {@code delete} operator. The {@code delete} operator returns
         * whether the deletion succeeds at bringing about a state in
         * which the deleted property is absent. The {@code delete}
         * operator therefore returns true if the property was already
         * absent, whereas this {@code delete} method returns false if
         * the association was already absent.
         */
        value: function remove(key) {
          return this.delete___(key);
        },
        writable: true,
        configurable: true
      }
    });

    return OurWeakMap;
  }

  /**
   * @param doubleWeakMapCheckSilentFailure IE 11 has no Proxy but has a broken
   * WeakMap such that we need to patch it using DoubleWeakMap; this flag tells
   * DoubleWeakMap so.
   */
  function wrapWeakMap(HostWeakMap, doubleWeakMapCheckSilentFailure) {
    // The platform has a WeakMap but we are concerned that it may refuse to
    // store some key types. Therefore, make a map implementation which makes
    // use of both as possible.

    var OurWeakMap = implementWeakMap();

    function DoubleWeakMap() {
      if (!(this instanceof OurWeakMap)) {  // approximate test for new ...()
        calledAsFunctionWarning();
      }

      // Preferable, truly weak map.
      var hmap = new HostWeakMap();

      // Our hidden-property-based pseudo-weak-map. Lazily initialized in the
      // 'set' implementation; thus we can avoid performing extra lookups if
      // we know all entries actually stored are entered in 'hmap'.
      var omap = undefined;

      // Hidden-property maps are not compatible with proxies because proxies
      // can observe the hidden name and either accidentally expose it or fail
      // to allow the hidden property to be set. Therefore, we do not allow
      // arbitrary WeakMaps to switch to using hidden properties, but only
      // those which need the ability, and unprivileged code is not allowed
      // to set the flag.
      //
      // (Except in doubleWeakMapCheckSilentFailure mode in which case we
      // disable proxies.)
      var enableSwitching = false;

      function dget(key, opt_default) {
        if (omap) {
          return hmap.has(key) ? hmap.get(key)
              : omap.get___(key, opt_default);
        } else {
          return hmap.get(key, opt_default);
        }
      }

      function dhas(key) {
        return hmap.has(key) || (omap ? omap.has___(key) : false);
      }

      var dset;
      if (doubleWeakMapCheckSilentFailure) {
        dset = function(key, value) {
          hmap.set(key, value);
          if (!hmap.has(key)) {
            if (!omap) { omap = new OurWeakMap(); }
            omap.set(key, value);
          }
          return this;
        };
      } else {
        dset = function(key, value) {
          if (enableSwitching) {
            try {
              hmap.set(key, value);
            } catch (e) {
              if (!omap) { omap = new OurWeakMap(); }
              omap.set___(key, value);
            }
          } else {
            hmap.set(key, value);
          }
          return this;
        };
      }

      function ddelete(key) {
        var result = !!hmap['delete'](key);
        if (omap) { return omap.delete___(key) || result; }
        return result;
      }

      return Object.create(OurWeakMap.prototype, {
        get___:    { value: constFunc(dget) },
        has___:    { value: constFunc(dhas) },
        set___:    { value: constFunc(dset) },
        delete___: { value: constFunc(ddelete) },
        permitHostObjects___: { value: constFunc(function(token) {
          if (token === weakMapPermitHostObjects) {
            enableSwitching = true;
          } else {
            throw new Error('bogus call to permitHostObjects___');
          }
        })}
      });
    }
    DoubleWeakMap.prototype = OurWeakMap.prototype;

    // define .constructor to hide OurWeakMap ctor
    Object.defineProperty(DoubleWeakMap.prototype, 'constructor', {
      value: DoubleWeakMap,
      enumerable: false,  // as default .constructor is
      configurable: true,
      writable: true
    });

    return DoubleWeakMap;
  }

})();
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview An optional part of the SES initialization process
 * that saves potentially valuable debugging aids on the side before
 * startSES.js would remove these, and adds a debugging API which uses
 * these without compromising SES security.
 *
 * <p>NOTE: The currently exposed debugging API is far from
 * settled. This module is currently in an exploratory phase.
 *
 * <p>Meant to be run sometime after repairs are done and a working
 * WeakMap is available, but before startSES.js. initSESPlus.js includes
 * this. initSES.js does not.
 *
 * //provides ses.UnsafeError,
 * //provides ses.getCWStack ses.stackString ses.getStack
 * @author Mark S. Miller
 * @requires WeakMap, this
 * @overrides Error, ses, debugModule
 */

var Error;
var ses;

(function debugModule(global) {
   "use strict";

   if (typeof ses !== 'undefined' && ses.okToLoad && !ses.okToLoad()) {
     // already too broken, so give up
     return;
   }

   /**
    * Save away the original Error constructor as ses.UnsafeError and
    * make it otherwise unreachable. Replace it with a reachable
    * wrapping constructor with the same standard behavior.
    *
    * <p>When followed by the rest of SES initialization, the
    * UnsafeError we save off here is exempt from whitelist-based
    * extra property removal and primordial freezing. Thus, we can
    * use any platform specific APIs defined on Error for privileged
    * debugging operations, unless explicitly turned off below.
    */
   var UnsafeError = Error;
   ses.UnsafeError = Error;
   function FakeError(message) {
     return UnsafeError(message);
   }
   FakeError.prototype = UnsafeError.prototype;
   FakeError.prototype.constructor = FakeError;

   Error = FakeError;

   /**
    * Should be a function of an argument object (normally an error
    * instance) that returns the stack trace associated with argument
    * in Causeway format.
    *
    * <p>See http://wiki.erights.org/wiki/Causeway_Platform_Developer
    *
    * <p>Currently, there is no one portable technique for doing
    * this. So instead, each platform specific branch of the if below
    * should assign something useful to getCWStack.
    */
   ses.getCWStack = function uselessGetCWStack(err) { return void 0; };

   if ('captureStackTrace' in UnsafeError) {
     (function() {
       // Assuming http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
       // So this section is v8 specific.

       UnsafeError.prepareStackTrace = function(err, sst) {
         if (ssts === void 0) {
           // If an error happens in the debug module after setting up
           // this prepareStackTrace but before or during the
           // initialization of ssts, then this method gets called
           // with ssts still undefined (void 0). In that case, we
           // should report the error we're asked to prepare, rather
           // than an error thrown by failing to prepare it.
           ses.logger.error('Error while initializing debug module', err);
         } else {
           ssts.set(err, sst);
         }
         // Technically redundant, but prepareStackTrace is supposed
         // to return a value, so this makes it clearer that this value
         // is undefined (void 0).
         return void 0;
       };

       var unsafeCaptureStackTrace = UnsafeError.captureStackTrace;

       // TODO(erights): This seems to be write only. Can this be made
       // safe enough to expose to untrusted code?
       UnsafeError.captureStackTrace = function(obj, opt_MyError) {
         var wasFrozen = Object.isFrozen(obj);
         var stackDesc = Object.getOwnPropertyDescriptor(obj, 'stack');
         try {
           var result = unsafeCaptureStackTrace(obj, opt_MyError);
           var ignore = obj.stack;
           return result;
         } finally {
           if (wasFrozen && !Object.isFrozen(obj)) {
             if (stackDesc) {
               Object.defineProperty(obj, 'stack', stackDesc);
             } else {
               delete obj.stack;
             }
             Object.freeze(obj);
           }
         }
       };

       var ssts = new WeakMap(); // error -> sst

       /**
        * Returns a stack in Causeway format.
        *
        * <p>Based on
        * http://code.google.com/p/causeway/source/browse/trunk/src/js/com/teleometry/causeway/purchase_example/workers/makeCausewayLogger.js
        */
       function getCWStack(err) {
         var sst = ssts.get(err);
         if (sst === void 0 && err instanceof Error) {
           // We hope it triggers prepareStackTrace
           var ignore = err.stack;
           sst = ssts.get(err);
         }
         if (sst === void 0) { return void 0; }

         return { calls: sst.map(function(frame) {
           return {
             name: '' + (frame.getFunctionName() ||
                         frame.getMethodName() || '?'),
             source: '' + (frame.getFileName() || '?'),
             span: [ [ frame.getLineNumber(), frame.getColumnNumber() ] ]
           };
         })};
       };
       ses.getCWStack = getCWStack;
     })();

   } else if (global.opera) {
     (function() {
       // Since pre-ES5 browsers are disqualified, we can assume a
       // minimum of Opera 11.60.
     })();


   } else if (new Error().stack) {
     (function() {
       var FFFramePattern = (/^([^@]*)@(.*?):?(\d*)$/);

       // stacktracejs.com suggests that this indicates FF. Really?
       function getCWStack(err) {
         var stack = err.stack;
         if (!stack) { return void 0; }
         var lines = stack.split('\n');
         var frames = lines.map(function(line) {
           var match = FFFramePattern.exec(line);
           if (match) {
             return {
               name: match[1].trim() || '?',
               source: match[2].trim() || '?',
               span: [[+match[3]]]
             };
           } else {
             return {
               name: line.trim() || '?',
               source: '?',
               span: []
             };
           }
         });
         return { calls: frames };
       }

       ses.getCWStack = getCWStack;
     })();

   } else {
     (function() {
       // Including Safari and IE10.
     })();

   }

   /**
    * Turn a Causeway stack into a v8-like stack traceback string.
    */
   function stackString(cwStack) {
     if (!cwStack) { return void 0; }
     var calls = cwStack.calls;

     var result = calls.map(function(call) {

       var spanString = call.span.map(function(subSpan) {
         return subSpan.join(':');
       }).join('::');
       if (spanString) { spanString = ':' + spanString; }

       return '  at ' + call.name + ' (' + call.source + spanString + ')';

     });
     return result.join('\n');
   };
   ses.stackString = stackString;

   /**
    * Return the v8-like stack traceback string associated with err.
    */
   function getStack(err) {
     if (err !== Object(err)) { return void 0; }
     var cwStack = ses.getCWStack(err);
     if (!cwStack) { return void 0; }
     var result = ses.stackString(cwStack);
     if (err instanceof Error) { result = err + '\n' + result; }
     return result;
   };
   ses.getStack = getStack;

 })(this);
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements StringMap - a map api for strings.
 *
 * @author Mark S. Miller
 * @author Jasvir Nagra
 * @requires ses
 * @overrides StringMap
 */

var StringMap;

(function() {
   'use strict';

   var create = Object.create;
   var freeze = Object.freeze;
   function constFunc(func) {
     func.prototype = null;
     return freeze(func);
   }

   function assertString(x) {
     if ('string' !== typeof(x)) {
       throw new TypeError('Not a string: ' + x);
     }
     return x;
   }

   var createNull;

   if (typeof ses === 'undefined' ||
       !ses.ok() ||
       ses.es5ProblemReports.FREEZING_BREAKS_PROTOTYPES.beforeFailure) {

     // Object.create(null) may be broken; fall back to ES3-style implementation
     // (safe because we suffix keys anyway).
     createNull = function() { return {}; };
   } else {
     createNull = function() { return Object.create(null); };
   }

   StringMap = function StringMap() {

     var objAsMap = createNull();

     return freeze({
       get: constFunc(function(key) {
         return objAsMap[assertString(key) + '$'];
       }),
       set: constFunc(function(key, value) {
         objAsMap[assertString(key) + '$'] = value;
       }),
       has: constFunc(function(key) {
         return (assertString(key) + '$') in objAsMap;
       }),
       'delete': constFunc(function(key) {
         return delete objAsMap[assertString(key) + '$'];
       })
     });
   };

 })();
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Exports {@code ses.whitelist}, a recursively defined
 * JSON record enumerating all the naming paths in the ES5.1 spec,
 * those de-facto extensions that we judge to be safe, and SES and
 * Dr. SES extensions provided by the SES runtime.
 *
 * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or
 * anticipated ES6.
 *
 * //provides ses.whitelist
 * @author Mark S. Miller,
 * @overrides ses, whitelistModule
 */
var ses;

/**
 * <p>Each JSON record enumerates the disposition of the properties on
 * some corresponding primordial object, with the root record
 * representing the global object. For each such record, the values
 * associated with its property names can be
 * <ul>
 * <li>Another record, in which case this property is simply
 *     whitelisted and that next record represents the disposition of
 *     the object which is its value. For example, {@code "Object"}
 *     leads to another record explaining what properties {@code
 *     "Object"} may have and how each such property, if present,
 *     and its value should be tamed.
 * <li>true, in which case this property is simply whitelisted. The
 *     value associated with that property is still traversed and
 *     tamed, but only according to the taming of the objects that
 *     object inherits from. For example, {@code "Object.freeze"} leads
 *     to true, meaning that the {@code "freeze"} property of {@code
 *     Object} should be whitelisted and the value of the property (a
 *     function) should be further tamed only according to the
 *     markings of the other objects it inherits from, like {@code
 *     "Function.prototype"} and {@code "Object.prototype").
 *     If the property is an accessor property, it is not
 *     whitelisted (as invoking an accessor might not be meaningful,
 *     yet the accessor might return a value needing taming).
 * <li>"maybeAccessor", in which case this accessor property is simply
 *     whitelisted and its getter and/or setter are tamed according to
 *     inheritance. If the property is not an accessor property, its
 *     value is tamed according to inheritance.
 * <li>"*", in which case this property on this object is whitelisted,
 *     as is this property as inherited by all objects that inherit
 *     from this object. The values associated with all such properties
 *     are still traversed and tamed, but only according to the taming
 *     of the objects that object inherits from. For example, {@code
 *     "Object.prototype.constructor"} leads to "*", meaning that we
 *     whitelist the {@code "constructor"} property on {@code
 *     Object.prototype} and on every object that inherits from {@code
 *     Object.prototype} that does not have a conflicting mark. Each
 *     of these is tamed as if with true, so that the value of the
 *     property is further tamed according to what other objects it
 *     inherits from.
 * </ul>
 *
 * The members of the whitelist are either
 * <ul>
 * <li>(uncommented) defined by the ES5.1 normative standard text,
 * <li>(questionable) provides a source of non-determinism, in
 *     violation of pure object-capability rules, but allowed anyway
 *     since we've given up on restricting JavaScript to a
 *     deterministic subset.
 * <li>(ES5 Appendix B) common elements of de facto JavaScript
 *     described by the non-normative Appendix B.
 * <li>(Harmless whatwg) extensions documented at
 *     <a href="http://wiki.whatwg.org/wiki/Web_ECMAScript"
 *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be
 *     harmless. Note that the RegExp constructor extensions on that
 *     page are <b>not harmless</b> and so must not be whitelisted.
 * <li>(ES-Harmony proposal) accepted as "proposal" status for
 *     EcmaScript-Harmony.
 * </ul>
 *
 * <p>With the above encoding, there are some sensible whitelists we
 * cannot express, such as marking a property both with "*" and a JSON
 * record. This is an expedient decision based only on not having
 * encountered such a need. Should we need this extra expressiveness,
 * we'll need to refactor to enable a different encoding.
 *
 * <p>We factor out {@code true} into the variable {@code t} just to
 * get a bit better compression from simple minifiers.
 */
(function whitelistModule() {
  "use strict";

  if (!ses) { ses = {}; }

  var t = true;
  var TypedArrayWhitelist;  // defined and used below
  ses.whitelist = {
    cajaVM: {                        // Caja support
      // This object is present here only to make it itself processed by the
      // whitelist, not to make it accessible by this path.
      '[[ThrowTypeError]]': t,

      log: t,
      tamperProof: t,
      constFunc: t,
      Nat: t,
      def: t,
      is: t,

      compileExpr: t,
      confine: t,
      compileModule: t,              // experimental
      compileProgram: t,             // Cannot be implemented in just ES5.1.
      eval: t,
      Function: t,

      sharedImports: t,
      makeImports: t,
      copyToImports: t,

      GuardT: {
        coerce: t
      },
      makeTableGuard: t,
      Trademark: {
        stamp: t
      },
      guard: t,
      passesGuard: t,
      stamp: t,
      makeSealerUnsealerPair: t,

      makeArrayLike: {
        canBeFullyLive: t
      }
    },
    WeakMap: {       // ES-Harmony proposal as currently implemented by FF6.0a1
      prototype: {
        // Note: coordinate this list with maintenance of repairES5.js
        get: t,
        set: t,
        has: t,
        'delete': t
      }
    },
    StringMap: {  // A specialized approximation of ES-Harmony's Map.
      prototype: {} // Technically, the methods should be on the prototype,
                    // but doing so while preserving encapsulation will be
                    // needlessly expensive for current usage.
    },
// As of this writing, the WeakMap emulation in WeakMap.js relies on
// the unguessability and undiscoverability of HIDDEN_NAME, a
// secret property name. However, on a platform with built-in
// Proxies, if whitelisted but not properly monkey patched, proxies
// could be used to trap and thereby discover HIDDEN_NAME. So until we
// (TODO(erights)) write the needed monkey patching of proxies, we
// omit them from our whitelist.
//    Proxy: {                         // ES-Harmony proposal
//      create: t,
//      createFunction: t
//    },
    escape: t,                       // ES5 Appendix B
    unescape: t,                     // ES5 Appendix B
    Object: {
      // If any new methods are added here that may reveal the
      // HIDDEN_NAME within WeakMap.js, such as the proposed
      // getOwnPropertyDescriptors or getPropertyDescriptors, then
      // extend WeakMap.js to monkey patch these to avoid revealing
      // HIDDEN_NAME.
      getPropertyDescriptor: t,      // ES-Harmony proposal
      getPropertyNames: t,           // ES-Harmony proposal
      is: t,                         // ES-Harmony proposal
      prototype: {

        // Whitelisted only to work around a Chrome debugger
        // stratification bug (TODO(erights): report). These are
        // redefined in startSES.js in terms of standard methods, so
        // that we can be confident they introduce no non-standard
        // possibilities.
        __defineGetter__: t,
        __defineSetter__: t,
        __lookupGetter__: t,
        __lookupSetter__: t,

        constructor: '*',
        toString: '*',
        toLocaleString: '*',
        valueOf: t,
        hasOwnProperty: t,
        isPrototypeOf: t,
        propertyIsEnumerable: t
      },
      getPrototypeOf: t,
      getOwnPropertyDescriptor: t,
      getOwnPropertyNames: t,
      create: t,
      defineProperty: t,
      defineProperties: t,
      seal: t,
      freeze: t,
      preventExtensions: t,
      isSealed: t,
      isFrozen: t,
      isExtensible: t,
      keys: t
    },
    NaN: t,
    Infinity: t,
    undefined: t,
    // eval: t,                      // Whitelisting under separate control
                                     // by TAME_GLOBAL_EVAL in startSES.js
    parseInt: t,
    parseFloat: t,
    isNaN: t,
    isFinite: t,
    decodeURI: t,
    decodeURIComponent: t,
    encodeURI: t,
    encodeURIComponent: t,
    Function: {
      prototype: {
        apply: t,
        call: t,
        bind: t,
        prototype: '*',
        length: '*',
        arity: '*',                  // non-std, deprecated in favor of length
        name: '*'                    // non-std
      }
    },
    Array: {
      prototype: {
        concat: t,
        join: t,
        pop: t,
        push: t,
        reverse: t,
        shift: t,
        slice: t,
        sort: t,
        splice: t,
        unshift: t,
        indexOf: t,
        lastIndexOf: t,
        every: t,
        some: t,
        forEach: t,
        map: t,
        filter: t,
        reduce: t,
        reduceRight: t,
        length: t
      },
      isArray: t
    },
    String: {
      prototype: {
        substr: t,                   // ES5 Appendix B
        anchor: t,                   // Harmless whatwg
        big: t,                      // Harmless whatwg
        blink: t,                    // Harmless whatwg
        bold: t,                     // Harmless whatwg
        fixed: t,                    // Harmless whatwg
        fontcolor: t,                // Harmless whatwg
        fontsize: t,                 // Harmless whatwg
        italics: t,                  // Harmless whatwg
        link: t,                     // Harmless whatwg
        small: t,                    // Harmless whatwg
        strike: t,                   // Harmless whatwg
        sub: t,                      // Harmless whatwg
        sup: t,                      // Harmless whatwg
        trimLeft: t,                 // non-standard
        trimRight: t,                // non-standard
        valueOf: t,
        charAt: t,
        charCodeAt: t,
        concat: t,
        indexOf: t,
        lastIndexOf: t,
        localeCompare: t,
        match: t,
        replace: t,
        search: t,
        slice: t,
        split: t,
        substring: t,
        toLowerCase: t,
        toLocaleLowerCase: t,
        toUpperCase: t,
        toLocaleUpperCase: t,
        trim: t,
        length: '*'
      },
      fromCharCode: t
    },
    Boolean: {
      prototype: {
        valueOf: t
      }
    },
    Number: {
      prototype: {
        valueOf: t,
        toFixed: t,
        toExponential: t,
        toPrecision: t
      },
      MAX_VALUE: t,
      MIN_VALUE: t,
      NaN: t,
      NEGATIVE_INFINITY: t,
      POSITIVE_INFINITY: t
    },
    Math: {
      E: t,
      LN10: t,
      LN2: t,
      LOG2E: t,
      LOG10E: t,
      PI: t,
      SQRT1_2: t,
      SQRT2: t,

      abs: t,
      acos: t,
      asin: t,
      atan: t,
      atan2: t,
      ceil: t,
      cos: t,
      exp: t,
      floor: t,
      log: t,
      max: t,
      min: t,
      pow: t,
      random: t,                     // questionable
      round: t,
      sin: t,
      sqrt: t,
      tan: t
    },
    Date: {                          // no-arg Date constructor is questionable
      prototype: {
        // Note: coordinate this list with maintanence of repairES5.js
        getYear: t,                  // ES5 Appendix B
        setYear: t,                  // ES5 Appendix B
        toGMTString: t,              // ES5 Appendix B
        toDateString: t,
        toTimeString: t,
        toLocaleString: t,
        toLocaleDateString: t,
        toLocaleTimeString: t,
        valueOf: t,
        getTime: t,
        getFullYear: t,
        getUTCFullYear: t,
        getMonth: t,
        getUTCMonth: t,
        getDate: t,
        getUTCDate: t,
        getDay: t,
        getUTCDay: t,
        getHours: t,
        getUTCHours: t,
        getMinutes: t,
        getUTCMinutes: t,
        getSeconds: t,
        getUTCSeconds: t,
        getMilliseconds: t,
        getUTCMilliseconds: t,
        getTimezoneOffset: t,
        setTime: t,
        setFullYear: t,
        setUTCFullYear: t,
        setMonth: t,
        setUTCMonth: t,
        setDate: t,
        setUTCDate: t,
        setHours: t,
        setUTCHours: t,
        setMinutes: t,
        setUTCMinutes: t,
        setSeconds: t,
        setUTCSeconds: t,
        setMilliseconds: t,
        setUTCMilliseconds: t,
        toUTCString: t,
        toISOString: t,
        toJSON: t
      },
      parse: t,
      UTC: t,
      now: t                         // questionable
    },
    RegExp: {
      prototype: {
        exec: t,
        test: t,
        source: '*',
        global: '*',
        ignoreCase: '*',
        multiline: '*',
        lastIndex: '*',
        options: '*',                // non-std
        sticky: '*'                  // non-std
      }
    },
    Error: {
      prototype: {
        name: '*',
        message: '*'
      }
    },
    EvalError: {
      prototype: t
    },
    RangeError: {
      prototype: t
    },
    ReferenceError: {
      prototype: t
    },
    SyntaxError: {
      prototype: t
    },
    TypeError: {
      prototype: t
    },
    URIError: {
      prototype: t
    },
    JSON: {
      parse: t,
      stringify: t
    },
    ArrayBuffer: {                   // Khronos Typed Arrays spec; ops are safe
      length: t,  // does not inherit from Function.prototype on Chrome
      name: t,  // ditto
      isView: t,
      prototype: {
        byteLength: 'maybeAccessor',
        slice: t
      }
    },
    Int8Array: TypedArrayWhitelist = {  // Typed Arrays spec
      length: t,  // does not inherit from Function.prototype on Chrome
      name: t,  // ditto
      BYTES_PER_ELEMENT: t,
      prototype: {
        buffer: 'maybeAccessor',
        byteOffset: 'maybeAccessor',
        byteLength: 'maybeAccessor',
        length: 'maybeAccessor',
        BYTES_PER_ELEMENT: t,
        set: t,
        subarray: t
      }
    },
    Uint8Array: TypedArrayWhitelist,
    Uint8ClampedArray: TypedArrayWhitelist,
    Int16Array: TypedArrayWhitelist,
    Uint16Array: TypedArrayWhitelist,
    Int32Array: TypedArrayWhitelist,
    Uint32Array: TypedArrayWhitelist,
    Float32Array: TypedArrayWhitelist,
    Float64Array: TypedArrayWhitelist,
    DataView: {                      // Typed Arrays spec
      length: t,  // does not inherit from Function.prototype on Chrome
      name: t,  // ditto
      prototype: {
        buffer: 'maybeAccessor',
        byteOffset: 'maybeAccessor',
        byteLength: 'maybeAccessor',
        getInt8: t,
        getUint8: t,
        getInt16: t,
        getUint16: t,
        getInt32: t,
        getUint32: t,
        getFloat32: t,
        getFloat64: t,
        setInt8: t,
        setUint8: t,
        setInt16: t,
        setUint16: t,
        setInt32: t,
        setUint32: t,
        setFloat32: t,
        setFloat64: t
      }
    }
  };
})();
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Export a {@code ses.atLeastFreeVarNames} function for
 * internal use by the SES-on-ES5 implementation, which enumerates at
 * least the identifiers which occur freely in a source text string.
 *
 * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or
 * anticipated ES6.
 *
 * // provides ses.atLeastFreeVarNames
 * // provides ses.limitSrcCharset
 * @author Mark S. Miller
 * @requires StringMap
 * @overrides ses, atLeastFreeVarNamesModule
 */
var ses;

/**
 * Calling {@code ses.atLeastFreeVarNames} on a {@code programSrc}
 * string argument, the result should include at least all the free
 * variable names of {@code programSrc} as own properties. It is
 * harmless to include other strings as well.
 *
 * <p>Assuming a programSrc that parses as a strict Program,
 * atLeastFreeVarNames(programSrc) returns a Record whose enumerable
 * own property names must include the names of all the free variables
 * occuring in programSrc. It can include as many other strings as is
 * convenient so long as it includes these. The value of each of these
 * properties should be {@code true}.
 *
 * <p>TODO(erights): On platforms that support Proxies (currently only
 * FF4 and later), we should stop using atLeastFreeVarNames, since a
 * {@code with(aProxy) {...}} should reliably intercept all free
 * variable accesses without needing any prior scan.
 */
(function atLeastFreeVarNamesModule() {
  "use strict";

   if (!ses) { ses = {}; }

  /////////////// KLUDGE SWITCHES ///////////////

  // Section 7.2 ES5 recognizes the following whitespace characters
  // FEFF           ; BOM
  // 0009 000B 000C ; White_Space # Cc
  // 0020           ; White_Space # Zs       SPACE
  // 00A0           ; White_Space # Zs       NO-BREAK SPACE
  // 1680           ; White_Space # Zs       OGHAM SPACE MARK
  // 180E           ; White_Space # Zs       MONGOLIAN VOWEL SEPARATOR
  // 2000..200A     ; White_Space # Zs  [11] EN QUAD..HAIR SPACE
  // 2028           ; White_Space # Zl       LINE SEPARATOR
  // 2029           ; White_Space # Zp       PARAGRAPH SEPARATOR
  // 202F           ; White_Space # Zs       NARROW NO-BREAK SPACE
  // 205F           ; White_Space # Zs       MEDIUM MATHEMATICAL SPACE
  // 3000           ; White_Space # Zs       IDEOGRAPHIC SPACE

  // Unicode characters which have the Zs property are an open set and can
  // grow.  Not all versions of a browser treat Zs characters the same.
  // The trade off is as follows:
  //   * if SES treats a character as non-whitespace which the browser
  //      treats as whitespace, a sandboxed program would be able to
  //      break out of the sandbox.  SES avoids this by encoding any
  //      characters outside the range of well understood characters
  //      and disallowing unusual whitespace characters which are
  //      rarely used and may be treated non-uniformly by browsers.
  //   * if SES treats a character as whitespace which the browser
  //      treats as non-whitespace, a sandboxed program will be able
  //      to break out of the SES sandbox.  However, at worst it might
  //      be able to read, write and execute globals which have the
  //      corresponding whitespace character.  This is a limited
  //      breach because it is exceedingly rare for browser functions
  //      or powerful host functions to have names which contain
  //      potential whitespace characters.  At worst, sandboxed
  //      programs would be able to communicate with each other.
  //
  // We are conservative with the whitespace characters we accept.  We
  // deny whitespace > u00A0 to make unexpected functional differences
  // in sandboxed programs on browsers even if it was safe to allow them.
  var OTHER_WHITESPACE = new RegExp(
    '[\\uFEFF\\u1680\\u180E\\u2000-\\u2009\\u200a'
    + '\\u2028\\u2029\\u200f\\u205F\\u3000]');

  /**
   * We use this to limit the input text to ascii only text.  All other
   * characters are encoded using backslash-u escapes.
   */
  ses.limitSrcCharset = function(programSrc) {
    if (OTHER_WHITESPACE.test(programSrc)) {
      return { error: 'Disallowing unusual unicode whitespace characters' };
    }
    programSrc = programSrc.replace(/([\u0080-\u009f\u00a1-\uffff])/g,
      function(_, u) {
        return '\\u' + ('0000' + u.charCodeAt(0).toString(16)).slice(-4);
      });
    return { programSrc: programSrc };
  };

  /**
   * Return a regexp that can be used repeatedly to scan for the next
   * identifier. It works correctly in concert with ses.limitSrcCharset above.
   *
   * If this regexp is changed, compileExprLater.js should be checked for
   * correct escaping of freeNames.
   */
  function SHOULD_MATCH_IDENTIFIER() {
    return /(\w|\\u\d{4}|\$)+/g;
  }

  //////////////// END KLUDGE SWITCHES ///////////

  ses.DISABLE_SECURITY_FOR_DEBUGGER = false;

  ses.atLeastFreeVarNames = function atLeastFreeVarNames(programSrc) {
    programSrc = ''+programSrc;
    var limited = ses.limitSrcCharset(programSrc);
    if (!('programSrc' in limited)) {
      throw new EvalError(limited.error);
    } else {
      programSrc = limited.programSrc;
    }
    // Now that we've temporarily limited our attention to ascii...
    var regexp = SHOULD_MATCH_IDENTIFIER();
    // Once we decide this file can depends on ES5, the following line
    // should say "... = Object.create(null);" rather than "... = {};"
    var result = [];
    var found = StringMap();
    // webkit js debuggers rely on ambient global eval
    // http://code.google.com/p/chromium/issues/detail?id=145871
    if (ses.DISABLE_SECURITY_FOR_DEBUGGER) {
      found.set('eval', true);
    }
    var a;
    while ((a = regexp.exec(programSrc))) {
      // Note that we could have avoided the while loop by doing
      // programSrc.match(regexp), except that then we'd need
      // temporary storage proportional to the total number of
      // apparent identifiers, rather than the total number of
      // apparently unique identifiers.
      var name = a[0];

      if (!found.has(name)) {
        result.push(name);
        found.set(name, true);
      }
    }
    return result;
  };

})();
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Make this frame SES-safe or die trying.
 *
 * <p>Assumes ES5 plus a WeakMap that conforms to the anticipated ES6
 * WeakMap spec. Compatible with ES5-strict or anticipated ES6.
 *
 * //requires ses.makeCallerHarmless, ses.makeArgumentsHarmless
 * //requires ses.verifyStrictFunctionBody
 * //optionally requires ses.mitigateSrcGotchas
 * //provides ses.startSES ses.resolveOptions, ses.securableWrapperSrc
 * //provides ses.makeCompiledExpr
 *
 * @author Mark S. Miller,
 * @author Jasvir Nagra
 * @requires WeakMap
 * @overrides ses, console, eval, Function, cajaVM
 */
var ses;


/**
 * The global {@code eval} function available to script code, which
 * may or not be made safe.
 *
 * <p>The original global binding of {@code eval} is not
 * SES-safe. {@code cajaVM.eval} is a safe wrapper around this
 * original eval, enforcing SES language restrictions.
 *
 * <p>If {@code TAME_GLOBAL_EVAL} is true, both the global {@code
 * eval} variable and {@code sharedImports.eval} are set to the safe
 * wrapper. If {@code TAME_GLOBAL_EVAL} is false, in order to work
 * around a bug in the Chrome debugger, then the global {@code eval}
 * is unaltered and no {@code "eval"} property is available on {@code
 * sharedImports}. In either case, SES-evaled-code and SES-script-code
 * can both access the safe eval wrapper as {@code cajaVM.eval}.
 *
 * <p>By making the safe eval available on {@code sharedImports} only
 * when we also make it be the genuine global eval, we preserve the
 * property that SES-evaled-code differs from SES-script-code only by
 * having a subset of the same variables in globalish scope. This is a
 * nice-to-have that makes explanation easier rather than a hard
 * requirement. With this property, any SES-evaled-code that does not
 * fail to access a global variable (or to test whether it could)
 * should operate the same way when run as SES-script-code.
 *
 * <p>See doc-comment on cajaVM for the restriction on this API needed
 * to operate under Caja translation on old browsers.
 */
var eval;

/**
 * The global {@code Function} constructor is always replaced with a
 * safe wrapper, which is also made available as
 * {@code sharedImports.Function}.
 *
 * <p>Both the original Function constructor and this safe wrapper
 * point at the original {@code Function.prototype}, so {@code
 * instanceof} works fine with the wrapper. {@code
 * Function.prototype.constructor} is set to point at the safe
 * wrapper, so that only it, and not the unsafe original, is
 * accessible.
 *
 * <p>See doc-comment on cajaVM for the restriction on this API needed
 * to operate under Caja translation on old browsers.
 */
var Function;

/**
 * A new global exported by SES, intended to become a mostly
 * compatible API between server-side Caja translation for older
 * browsers and client-side SES verification for newer browsers.
 *
 * <p>Under server-side Caja translation for old pre-ES5 browsers, the
 * synchronous interface of the evaluation APIs (currently {@code
 * eval, Function, cajaVM.{compileExpr, confine, compileModule, eval,
 * Function}}) cannot reasonably be provided. Instead, under
 * translation we expect
 * <ul>
 * <li>Not to have a binding for {@code "eval"} on
 *     {@code sharedImports}, just as we would not if
 *     {@code TAME_GLOBAL_EVAL} is false.
 * <li>The global {@code eval} seen by scripts is either unaltered (to
 *     work around the Chrome debugger bug if {@code TAME_GLOBAL_EVAL}
 *     is false), or is replaced by a function that throws an
 *     appropriate EvalError diagnostic (if {@code TAME_GLOBAL_EVAL}
 *     is true).
 * <li>The global {@code Function} constructor, both as seen by script
 *     code and evaled code, to throw an appropriate diagnostic.
 * <li>The {@code Q} API to always be available, to handle
 *     asynchronous, promise, and remote requests.
 * <li>The evaluating methods on {@code cajaVM} -- currently {@code
 *     compileExpr, confine, compileModule, eval, and Function} -- to
 *     be remote promises for their normal interfaces, which therefore
 *     must be invoked with {@code Q.post}.
 * <li>Since {@code Q.post} can be used for asynchronously invoking
 *     non-promises, invocations like
 *     {@code Q.post(cajaVM, 'eval', ['2+3'])}, for example,
 *     will return a promise for a 5. This should work both under Caja
 *     translation and (TODO(erights)) under SES verification when
 *     {@code Q} is also installed, and so is the only portable
 *     evaluating API that SES code should use during this transition
 *     period.
 * <li>TODO(erights): {@code Q.post(cajaVM, 'compileModule',
 *     [moduleSrc]} should eventually pre-load the transitive
 *     synchronous dependencies of moduleSrc before resolving the
 *     promise for its result. It currently would not, instead
 *     requiring its client to do so manually.
 * </ul>
 */
var cajaVM;

/**
 * <p>{@code ses.startSES} should be called before any other potentially
 * dangerous script is executed in this frame.
 *
 * <p>If {@code ses.startSES} succeeds, the evaluation operations on
 * {@code cajaVM}, the global {@code Function} contructor, and perhaps
 * the {@code eval} function (see doc-comment on {@code eval} and
 * {@code cajaVM}) will only load code according to the <i>loader
 * isolation</i> rules of the object-capability model, suitable for
 * loading untrusted code. If all other (trusted) code executed
 * directly in this frame (i.e., other than through these safe
 * evaluation operations) takes care to uphold object-capability
 * rules, then untrusted code loaded via these safe evaluation
 * operations will be constrained by those rules. TODO(erights):
 * explain concretely what the trusted code must do or avoid doing to
 * uphold object-capability rules.
 *
 * <p>On a pre-ES5 platform, this script will fail cleanly, leaving
 * the frame intact. Otherwise, if this script fails, it may leave
 * this frame in an unusable state. All following description assumes
 * this script succeeds and that the browser conforms to the ES5
 * spec. The ES5 spec allows browsers to implement more than is
 * specified as long as certain invariants are maintained. We further
 * assume that these extensions are not maliciously designed to obey
 * the letter of these invariants while subverting the intent of the
 * spec. In other words, even on an ES5 conformant browser, we do not
 * presume to defend ourselves from a browser that is out to get us.
 *
 * @param global ::Record(any) Assumed to be the real global object
 *        for some frame. Since {@code ses.startSES} will allow global
 *        variable references that appear at the top level of the
 *        whitelist, our safety depends on these variables being
 *        frozen as a side effect of freezing the corresponding
 *        properties of {@code global}. These properties are also
 *        duplicated onto the virtual global objects which are
 *        provided as the {@code this} binding for the safe
 *        evaluation calls -- emulating the safe subset of the normal
 *        global object.
 *        TODO(erights): Currently, the code has only been tested when
 *        {@code global} is the global object of <i>this</i>
 *        frame. The code should be made to work for cross-frame use.
 * @param whitelist ::Record(Permit) where Permit = true | "*" |
 *        Record(Permit).  Describes the subset of naming
 *        paths starting from {@code sharedImports} that should be
 *        accessible. The <i>accessible primordials</i> are all values
 *        found by navigating these paths starting from {@code
 *        sharedImports}. All non-whitelisted properties of accessible
 *        primordials are deleted, and then {@code sharedImports}
 *        and all accessible primordials are frozen with the
 *        whitelisted properties frozen as data properties.
 *        TODO(erights): fix the code and documentation to also
 *        support confined-ES5, suitable for confining potentially
 *        offensive code but not supporting defensive code, where we
 *        skip this last freezing step. With confined-ES5, each frame
 *        is considered a separate protection domain rather that each
 *        individual object.
 * @param limitSrcCharset ::F([string])
 *        Given the sourceText for a strict Program, return a record with an
 *        'error' field if it is not in the limited character set that SES
 *        should process; otherwise, return a record with a 'programSrc' field
 *        containing the original program text with Unicode escapes.
 * @param atLeastFreeVarNames ::F([string], Record(true))
 *        Given the sourceText for a strict Program,
 *        atLeastFreeVarNames(sourceText) returns a Record whose
 *        enumerable own property names must include the names of all the
 *        free variables occuring in sourceText. It can include as
 *        many other strings as is convenient so long as it includes
 *        these. The value of each of these properties should be
 *        {@code true}. TODO(erights): On platforms with Proxies
 *        (currently only Firefox 4 and after), use {@code
 *        with(aProxy) {...}} to intercept free variables rather than
 *        atLeastFreeVarNames.
 * @param extensions ::F([], Record(any)]) A function returning a
 *        record whose own properties will be copied onto cajaVM. This
 *        is used for the optional components which bring SES to
 *        feature parity with the ES5/3 runtime at the price of larger
 *        code size. At the time that {@code startSES} calls {@code
 *        extensions}, {@code cajaVM} exists but should not yet be
 *        used. In particular, {@code extensions} should not call
 *        {@code cajaVM.def} during this setup, because def would then
 *        freeze priordials before startSES cleans them (removes
 *        non-whitelisted properties). The methods that
 *        {@code extensions} contributes can, of course, use
 *        {@code cajaVM}, since those methods will only be called once
 *        {@code startSES} finishes.
 */
ses.startSES = function(global,
                        whitelist,
                        limitSrcCharset,
                        atLeastFreeVarNames,
                        extensions) {
  "use strict";

  /////////////// KLUDGE SWITCHES ///////////////

  /////////////////////////////////
  // The following are only the minimal kludges needed for the current
  // Firefox or the current Chrome Beta. At the time of
  // this writing, these are Firefox 4.0 and Chrome 12.0.742.5 dev
  // As these move forward, kludges can be removed until we simply
  // rely on ES5.

  /**
   * <p>TODO(erights): isolate and report this.
   *
   * <p>Workaround for Chrome debugger's own use of 'eval'
   *
   * <p>This kludge is safety preserving but not semantics
   * preserving. When {@code TAME_GLOBAL_EVAL} is false, no {@code
   * sharedImports.eval} is available, and the 'eval' available as a
   * global to trusted (script) code is the original 'eval', and so is
   * not safe.
   */
  //var TAME_GLOBAL_EVAL = true;
  var TAME_GLOBAL_EVAL = false;

  /**
   * If this is true, then we redefine these to work around a
   * stratification bug in the Chrome debugger. To allow this, we have
   * also whitelisted these four properties in whitelist.js
   */
  //var EMULATE_LEGACY_GETTERS_SETTERS = false;
  var EMULATE_LEGACY_GETTERS_SETTERS = true;

  //////////////// END KLUDGE SWITCHES ///////////

  // Problems we can work around but repairES5 cannot repair.

  var NONCONFIGURABLE_OWN_PROTO =
      ses.es5ProblemReports.NONCONFIGURABLE_OWN_PROTO.afterFailure;
  var INCREMENT_IGNORES_FROZEN =
      ses.es5ProblemReports.INCREMENT_IGNORES_FROZEN.afterFailure;

  var dirty = true;

  var hop = Object.prototype.hasOwnProperty;

  var getProto = Object.getPrototypeOf;
  var defProp = Object.defineProperty;
  var gopd = Object.getOwnPropertyDescriptor;
  var gopn = Object.getOwnPropertyNames;
  var keys = Object.keys;
  var freeze = Object.freeze;
  var create = Object.create;

  /**
   * repairES5 repair_FREEZING_BREAKS_PROTOTYPES causes Object.create(null) to
   * be impossible. This falls back to a regular object. Each use of it
   * should be accompanied by an explanation of why it is sufficiently
   * safe.
   */
  function createNullIfPossible() {
    try {
      return create(null);
    } catch (e) {
      return {};
    }
  }

  /**
   * {@code opt_mitigateOpts} is an alleged record of which gotchas to
   * mitigate. Passing no {@code opt_mitigateOpts} performs all the
   * default mitigations. Returns a well behaved options record.
   *
   * <p>See {@code compileExpr} for documentation of the mitigation
   * options and their effects.
   */
  function resolveOptions(opt_mitigateOpts) {
    if (typeof opt_mitigateOpts === 'string') {
      // TODO: transient deprecated adaptor only, since there used to
      // be an opt_sourceUrl parameter in many of the parameter
      // positions now accepting an opt_mitigateOpts. Once we are
      // confident that we no longer have live clients that count on
      // the  old behavior, remove this kludge.
      opt_mitigateOpts = { sourceUrl: opt_mitigateOpts };
    }
    function resolve(opt, defaultOption) {
      return (opt_mitigateOpts && opt in opt_mitigateOpts) ?
        opt_mitigateOpts[opt] : defaultOption;
    }
    var options = {};
    if (opt_mitigateOpts === undefined || opt_mitigateOpts === null) {
      options.maskReferenceError = true;
      options.parseFunctionBody = true;
      options.sourceUrl = void 0;

      options.rewriteTopLevelVars = true;
      options.rewriteTopLevelFuncs = true;
      options.rewriteFunctionCalls = true;
      options.rewriteTypeOf = false;
      options.forceParseAndRender = false;
    } else {
      options.maskReferenceError = resolve('maskReferenceError', true);
      options.parseFunctionBody = resolve('parseFunctionBody', false);
      options.sourceUrl = resolve('sourceUrl', void 0);

      options.rewriteTopLevelVars = resolve('rewriteTopLevelVars', true);
      options.rewriteTopLevelFuncs = resolve('rewriteTopLevelFuncs', true);
      options.rewriteFunctionCalls = resolve('rewriteFunctionCalls', true);
      options.rewriteTypeOf = resolve('rewriteTypeOf',
                                      !options.maskReferenceError);
      options.forceParseAndRender = resolve('forceParseAndRender', false);
    }
    return options;
  }
  ses.resolveOptions = resolveOptions;

  /**
   * The function ses.mitigateSrcGotchas, if defined, is a function
   * which, given the sourceText for a strict Program, returns a
   * rewritten program with the same semantics as the original but
   * with some of the ES5 gotchas mitigated -- those that can be
   * mitigated by source analysis or source-to-source rewriting. The
   * {@code options} are assumed to already be canonicalized by {@code
   * resolveOptions} and says which mitigations to apply.
   */
  function mitigateSrcGotchas(funcBodySrc, options) {
    var safeError;
    if ('function' === typeof ses.mitigateSrcGotchas) {
      if (INCREMENT_IGNORES_FROZEN) {
        options.rewritePropertyUpdateExpr = true;
        options.rewritePropertyCompoundAssignmentExpr = true;
      }
      try {
        return ses.mitigateSrcGotchas(funcBodySrc, options, ses.logger);
      } catch (error) {
        // Shouldn't throw, but if it does, the exception is potentially from a
        // different context with an undefended prototype chain; don't allow it
        // to leak out.
        try {
          safeError = new Error(error.message);
        } catch (metaerror) {
          throw new Error(
            'Could not safely obtain error from mitigateSrcGotchas');
        }
        throw safeError;
      }
    } else {
      return '' + funcBodySrc;
    }
  }

  /**
   * Use to tamper proof a function which is not intended to ever be
   * used as a constructor, since it nulls out the function's
   * prototype first.
   */
  function constFunc(func) {
    func.prototype = null;
    return freeze(func);
  }

  /**
   * Obtain the ES5 singleton [[ThrowTypeError]].
   */
  function getThrowTypeError() {
    return gopd(getThrowTypeError, "arguments").get;
  }


  function fail(str) {
    debugger;
    throw new EvalError(str);
  }

  if (typeof WeakMap === 'undefined') {
    fail('No built-in WeakMaps, so WeakMap.js must be loaded first');
  }


  if (EMULATE_LEGACY_GETTERS_SETTERS) {
    (function(){
      function legacyDefineGetter(sprop, getter) {
        sprop = '' + sprop;
        if (hop.call(this, sprop)) {
          defProp(this, sprop, { get: getter });
        } else {
          defProp(this, sprop, {
            get: getter,
            set: undefined,
            enumerable: true,
            configurable: true
          });
        }
      }
      legacyDefineGetter.prototype = null;
      defProp(Object.prototype, '__defineGetter__', {
        value: legacyDefineGetter,
        writable: false,
        enumerable: false,
        configurable: false
      });

      function legacyDefineSetter(sprop, setter) {
        sprop = '' + sprop;
        if (hop.call(this, sprop)) {
          defProp(this, sprop, { set: setter });
        } else {
          defProp(this, sprop, {
            get: undefined,
            set: setter,
            enumerable: true,
            configurable: true
          });
        }
      }
      legacyDefineSetter.prototype = null;
      defProp(Object.prototype, '__defineSetter__', {
        value: legacyDefineSetter,
        writable: false,
        enumerable: false,
        configurable: false
      });

      function legacyLookupGetter(sprop) {
        sprop = '' + sprop;
        var base = this, desc = void 0;
        while (base && !(desc = gopd(base, sprop))) { base = getProto(base); }
        return desc && desc.get;
      }
      legacyLookupGetter.prototype = null;
      defProp(Object.prototype, '__lookupGetter__', {
        value: legacyLookupGetter,
        writable: false,
        enumerable: false,
        configurable: false
      });

      function legacyLookupSetter(sprop) {
        sprop = '' + sprop;
        var base = this, desc = void 0;
        while (base && !(desc = gopd(base, sprop))) { base = getProto(base); }
        return desc && desc.set;
      }
      legacyLookupSetter.prototype = null;
      defProp(Object.prototype, '__lookupSetter__', {
        value: legacyLookupSetter,
        writable: false,
        enumerable: false,
        configurable: false
      });
    })();
  } else {
    delete Object.prototype.__defineGetter__;
    delete Object.prototype.__defineSetter__;
    delete Object.prototype.__lookupGetter__;
    delete Object.prototype.__lookupSetter__;
  }


  /**
   * By this time, WeakMap has already monkey patched Object.freeze if
   * necessary, so we can do the tamperProofing delayed from
   * repairES5.js
   */
  var tamperProof = ses.makeDelayedTamperProof();

  /**
   * Code being eval'ed by {@code cajaVM.eval} sees {@code
   * sharedImports} as its top-level {@code this}, as if {@code
   * sharedImports} were the global object.
   *
   * <p>{@code sharedImports}'s properties are exactly the whitelisted
   * global variable references. These properties, both as they appear
   * on the global object and on this {@code sharedImports} object,
   * are frozen and so cannot diverge. This preserves the illusion.
   *
   * <p>For code being evaluated by {@code cajaVM.compileExpr} and its
   * ilk, the {@code imports} provided to the compiled function is bound
   * to the top-level {@code this} of the evaluated code. For sanity,
   * this {@code imports} should first be initialized with a copy of the
   * properties of {@code sharedImports}, but nothing enforces this.
   */
  var sharedImports = createNullIfPossible();
  // createNullIfPossible safety: If not possible, the imports will include
  // Object.prototype's properties. This has no effect on Caja use, because
  // we make the global object be the Window which inherits Object.prototype,
  // and is not a security risk since the properties are ambiently available.

  var MAX_NAT = Math.pow(2, 53) - 1;

  /**
   * Is allegenNum a number in the contiguous range of exactly and
   * unambiguously representable natural numbers (non-negative integers)?
   *
   * <p>See <a href=
   * "https://code.google.com/p/google-caja/issues/detail?id=1801"
   * >Issue 1801: Nat must include at most (2**53)-1</a>
   * and <a href=
   * "https://mail.mozilla.org/pipermail/es-discuss/2013-July/031716.html"
   * >Allen Wirfs-Brock's suggested phrasing</a> on es-discuss.
   */
  function Nat(allegedNum) {
    if (typeof allegedNum !== 'number') {
      throw new RangeError('not a number');
    }
    if (allegedNum !== allegedNum) { throw new RangeError('NaN not natural'); }
    if (allegedNum < 0)            { throw new RangeError('negative'); }
    if (allegedNum % 1 !== 0)      { throw new RangeError('not integral'); }
    if (allegedNum > MAX_NAT)      { throw new RangeError('too big'); }
    return allegedNum;
  }


  (function startSESPrelude() {

    /**
     * The unsafe* variables hold precious values that must not escape
     * to untrusted code. When {@code eval} is invoked via {@code
     * unsafeEval}, this is a call to the indirect eval function, not
     * the direct eval operator.
     */
    var unsafeEval = eval;
    var UnsafeFunction = Function;

    /**
     * Fails if {@code exprSource} does not parse as a strict
     * Expression production.
     *
     * <p>To verify that exprSrc parses as a strict Expression, we
     * verify that, when surrounded by parens and followed by ";", it
     * parses as a strict FunctionBody, and that when surrounded with
     * double parens it still parses as a strict FunctionBody. We
     * place a newline before the terminal token so that a "//"
     * comment cannot suppress the close paren or parens.
     *
     * <p>We never check without parens because not all
     * expressions, for example "function(){}", form valid expression
     * statements. We check both single and double parens so there's
     * no exprSrc text which can close the left paren(s), do
     * something, and then provide open paren(s) to balance the final
     * close paren(s). No one such attack will survive both tests.
     *
     * <p>Note that all verify*(allegedString) functions now always
     * start by coercing the alleged string to a guaranteed primitive
     * string, do their verification checks on that, and if it passes,
     * returns that. Otherwise they throw. If you don't know whether
     * something is a string before verifying, use only the output of
     * the verifier, not the input. Or coerce it early yourself.
     */
    function verifyStrictExpression(exprSrc) {
      exprSrc = ''+exprSrc;
      ses.verifyStrictFunctionBody('( ' + exprSrc + '\n);');
      ses.verifyStrictFunctionBody('(( ' + exprSrc + '\n));');
      return exprSrc;
    }

    /**
     * Make a virtual global object whose initial own properties are
     * a copy of the own properties of {@code sharedImports}.
     *
     * <p>Further uses of {@code copyToImports} to copy properties
     * onto this imports object will overwrite, effectively shadowing
     * the {@code sharedImports}. You should shadow by overwriting
     * rather than inheritance so that shadowing makes the original
     * binding inaccessible.
     *
     * <p>The returned imports object is extensible and all its
     * properties are configurable and non-enumerable. Once fully
     * initialized, the caller can of course freeze the imports
     * objects if desired. A reason not to do so it to emulate
     * traditional JavaScript intermodule linkage by side effects to a
     * shared (virtual) global object.
     *
     * <p>See {@code copyToImports} for the precise semantics of the
     * property copying.
     */
    function makeImports() {
      var imports = createNullIfPossible();
      // createNullIfPossible safety: similar to comments about sharedImports.
      copyToImports(imports, sharedImports);
      return imports;
    }

    /**
     * For all the own properties of {@code from}, copy their
     * descriptors to {@code imports}, except that each property
     * added to {@code imports} is unconditionally configurable
     * and non-enumerable.
     *
     * <p>By copying descriptors rather than values, any accessor
     * properties of {@code env} become accessors of {@code imports}
     * with the same getter and setter. If these do not use their
     * {@code this} value, then the original and any copied properties
     * are effectively joined. If the getter/setter do use their
     * {@code this}, when accessed with {@code imports} as the base,
     * their {@code this} will be bound to the {@code imports} rather
     * than {@code from}. If {@code from} contains writable value
     * properties, this will copy the current value of the property,
     * after which they may diverge.
     *
     * <p>We make these configurable so that {@code imports} can
     * be further configured before being frozen. We make these
     * non-enumerable in order to emulate the normal behavior of
     * built-in properties of typical global objects, such as the
     * browser's {@code window} object.
     */
    function copyToImports(imports, from) {
      gopn(from).forEach(function(name) {
        var desc = gopd(from, name);
        desc.enumerable = false;
        desc.configurable = true;
        defProp(imports, name, desc);
      });
      return imports;
    }

    /**
     * Make a frozen scope object which reflects all access onto
     * {@code imports}, for use by {@code with} to prevent
     * access to any {@code freeNames} other than those found on the.
     * {@code imports}.
     */
    function makeScopeObject(imports, freeNames, options) {
      var scopeObject = createNullIfPossible();
      // createNullIfPossible safety: The inherited properties should
      // always be shadowed by defined properties if they are relevant
      // (that is, if they occur in freeNames).

      // Note: Although this loop is a bottleneck on some platforms,
      // it does not help to turn it into a for(;;) loop, since we
      // still need an enclosing function per accessor property
      // created, to capture its own unique binding of
      // "name". (Embarrasing fact: despite having often written about
      // this very danger, I engaged in this mistake in a misbegotten
      // optimization attempt here.)
      freeNames.forEach(function interceptName(name) {
        var desc = gopd(imports, name);
        if (!desc || desc.writable !== false || desc.configurable) {
          // If there is no own property, or it isn't a non-writable
          // value property, or it is configurable. Note that this
          // case includes accessor properties. The reason we wrap
          // rather than copying over getters and setters is so the
          // this-binding of the original getters and setters will be
          // the imports rather than the scopeObject.
          desc = {
            get: function scopedGet() {
              if (name in imports) {
                // Note that, if this GET is on behalf of an
                // unmitigated function call expression, this function
                // will be called with a this-binding of the scope
                // object rather than undefined.
                return imports[name];
              }
              if (options.maskReferenceError) {
                // if it were possible to know that the getter call
                // was on behalf of a typeof expression, we'd return
                // {@code void 0} here only for that
                // case. Unfortunately, without parsing or proxies,
                // that isn't possible. To fix this more accurately by
                // parsing and rewriting instead, when available, set
                // maskReferenceError to false and rewriteTypeOf to
                // true.
                return void 0;
              }
              throw new ReferenceError('"' + name +
                  '" is not defined in this scope.');
            },
            set: function scopedSet(newValue) {
              if (name in imports) {
                imports[name] = newValue;
                return;
              }
              throw new TypeError('Cannot set "' + name + '"');
            },
            enumerable: false
          };
        }
        desc.enumerable = false;

        var existing = gopd(scopeObject, name);
        if (existing) {
          if (name === '__proto__') {
            if (NONCONFIGURABLE_OWN_PROTO) {
              return;
            } else {
              // we should be able to override it
            }
          } else {
            throw new Error('New symptom: ' + name + ' in null-proto object');
          }
        }

        defProp(scopeObject, name, desc);
      });
      return freeze(scopeObject);
    }


    /**
     * Given SES source text that must not be run directly using any
     * of the built-in unsafe evaluators on this platform, we instead
     * surround it with a prelude and postlude.
     *
     * <p>Evaluating the resulting expression return a function that
     * <i>can</i> be called to execute the original expression safely,
     * in a controlled scope. See "makeCompiledExpr" for precisely the
     * pattern that must be followed to call the resulting function
     * safely.
     *
     * Notice that the source text placed around {@code exprSrc}
     * <ul>
     * <li>brings no variable names into scope, avoiding any
     *     non-hygienic name capture issues (except as necessary to
     *     work around the NONCONFIGURABLE_OWN_PROTO bug), and
     * <li>does not introduce any newlines preceding exprSrc, so
     *     that all line numbers which a debugger might report are
     *     accurate wrt the original source text, and except for the
     *     first line, all the column numbers are accurate too.
     * </ul>
     */
    function securableWrapperSrc(exprSrc) {
      exprSrc = verifyStrictExpression(exprSrc);

      return '(function() { ' +
        // non-strict code, where this === scopeObject
          'with (this) { ' +
             'return function() { ' +
               '"use strict"; ' +
              // workaround for Chrome bug where makeScopeObject cannot
              // intercept __proto__ -- make sure it doesn't also leak global
              // access
              (NONCONFIGURABLE_OWN_PROTO ? 'var __proto__; '  : '') +
              'return (' +
                // strict code, where this === imports
                '' + exprSrc + '\n' +
              '); ' +
            '}; ' +
          '} ' +
        '})\n';
    }
    ses.securableWrapperSrc = securableWrapperSrc;


    /**
     * Given a wrapper function, such as the result of evaluating the
     * source that securableWrapperSrc returns, and a list of all the
     * names that we want to intercept to redirect to the imports,
     * return a corresponding <i>compiled expr</i> function.
     *
     * <p>A compiled expr function, when called on an imports
     * object, evaluates the original expression in a context where
     * all its free variable references that appear in freeNames are
     * redirected to the corresponding property of imports.
     */
    function makeCompiledExpr(wrapper, freeNames, options) {
      if (dirty) { fail('Initial cleaning failed'); }

      function compiledCode(imports) {
        var scopeObject = makeScopeObject(imports, freeNames, options);
        return wrapper.call(scopeObject).call(imports);
      };
      compiledCode.prototype = null;
      return compiledCode;
    }
    ses.makeCompiledExpr = makeCompiledExpr;

    /**
     * Compiles {@code exprSrc} as a strict expression into a function
     * of an {@code imports}, that when called evaluates {@code
     * exprSrc} in a virtual global environment whose {@code this} is
     * bound to that {@code imports}, and whose free variables refer
     * only to the properties of that {@code imports}.
     *
     * <p>The optional {@code opt_mitigateOpts} can be used to control
     * which transformations are applied to src, if they are
     * available. If {@code opt_mitigateOpts} is {@code undefined ||
     * null} then all default transformations are applied. Otherwise
     * the following option keys can be used.
     * <ul>
     * <li>maskReferenceError: Getting a free variable name that is
     *     absent on the imports object will throw a ReferenceError,
     *     even if gotten by an unmitigated {@code typeof}. With this
     *     set to true (the default), getting an absent variable will
     *     result in {@code undefined} which fixes the behavior of
     *     unmitigated {@code typeof} but masks normal ReferenceError
     *     cases. This is a less correct but faster alternative to
     *     rewriteTypeOf that also works when source mitigations are
     *     not available.
     * <li>parseFunctionBody: check the src is syntactically
     *     valid as a function body.
     * <li>rewriteTopLevelVars: transform vars to properties of global
     *     object. Defaults to true.
     * <li>rewriteTopLevelFuncs: transform funcs to properties of
     *     global object. Defaults to true.
     * <li>rewriteFunctionCalls: transform function calls, e.g.,
     *     {@code f()}, into calls ensuring that the function gets
     *     called with a this-binding of {@code undefined}, e.g.,
     *     {@code (1,f)()}. Defaults to true. <a href=
     *     "https://code.google.com/p/google-caja/issues/detail?id=1755"
     *     >Currently unimplemented</a>.
     * <li>rewriteTypeOf: rewrite program to support typeof
     *     barevar. rewriteTypeOf is only needed if maskReferenceError
     *     is false. If omitted, it defaults to the opposite of
     *     maskReferenceError.
     * </ul>
     *
     * <p>When SES is provided primitively, it should provide an
     * analogous {@code compileProgram} function that accepts a
     * Program and return a function that evaluates it to the
     * Program's completion value. Unfortunately, this is not
     * practical as a library without some non-standard support from
     * the platform such as a parser API that provides an AST.
     * TODO(jasvir): Now that we're parsing, we can provide compileProgram.
     *
     * <p>Thanks to Mike Samuel and Ankur Taly for this trick of using
     * {@code with} together with RegExp matching to intercept free
     * variable access without parsing.
     */
    function compileExpr(exprSrc, opt_mitigateOpts) {
      // Force exprSrc to be a string that can only parse (if at all) as
      // an expression.
      exprSrc = '(' + exprSrc + '\n)';

      var options = resolveOptions(opt_mitigateOpts);
      exprSrc = mitigateSrcGotchas(exprSrc, options);

      // This is a workaround for a bug in the escodegen renderer that
      // renders expressions as expression statements
      if (exprSrc[exprSrc.length - 1] === ';') {
        exprSrc = exprSrc.substr(0, exprSrc.length - 1);
      }
      var wrapperSrc = securableWrapperSrc(exprSrc);
      var wrapper = unsafeEval(wrapperSrc);
      var freeNames = atLeastFreeVarNames(exprSrc);
      var result = makeCompiledExpr(wrapper, freeNames, options);
      return freeze(result);
    }

    /**
     * Evaluate an expression as confined to these endowments.
     *
     * <p>Evaluates {@code exprSrc} in a tamper proof ({@code
     * def()}ed) environment consisting of a copy of the shared
     * imports and the own properties of {@code opt_endowments} if
     * provided. Return the value the expression evaluated to. Since
     * the shared imports provide no abilities to cause effects, the
     * endowments are the only source of eval-time abilities for the
     * expr to cause effects.
     */
    function confine(exprSrc, opt_endowments, opt_mitigateOpts) {
      // not necessary, since we only use it once below with a callee
      // which is itself safe. But we coerce to a string anyway to be
      // more robust against future refactorings.
      exprSrc = ''+exprSrc;

      var imports = makeImports();
      if (opt_endowments) {
        copyToImports(imports, opt_endowments);
      }
      def(imports);
      return compileExpr(exprSrc, opt_mitigateOpts)(imports);
    }


    var directivePattern = (/^['"](?:\w|\s)*['"]$/m);

    /**
     * A stereotyped form of the CommonJS require statement.
     */
    var requirePattern = (/^(?:\w*\s*(?:\w|\$|\.)*\s*=)?\s*require\s*\(\s*['"]((?:\w|\$|\.|\/)+)['"]\s*\)$/m);

    /**
     * As an experiment, recognize a stereotyped prelude of the
     * CommonJS module system.
     */
    function getRequirements(modSrc) {
      var result = [];
      var stmts = modSrc.split(';');
      var stmt;
      var i = 0, ilen = stmts.length;
      for (; i < ilen; i++) {
        stmt = stmts[i].trim();
        if (stmt !== '') {
          if (!directivePattern.test(stmt)) { break; }
        }
      }
      for (; i < ilen; i++) {
        stmt = stmts[i].trim();
        if (stmt !== '') {
          var m = requirePattern.exec(stmt);
          if (!m) { break; }
          result.push(m[1]);
        }
      }
      return freeze(result);
    }

    /**
     * A module source is actually any valid FunctionBody, and thus
     * any valid Program.
     *
     * For documentation on {@code opt_mitigateOpts} see the
     * corresponding parameter in compileExpr.
     *
     * <p>In addition, in case the module source happens to begin with
     * a streotyped prelude of the CommonJS module system, the
     * function resulting from module compilation has an additional
     * {@code "requirements"} property whose value is a list of the
     * module names being required by that prelude. These requirements
     * are the module's "immediate synchronous dependencies".
     *
     * <p>This {@code "requirements"} property is adequate to
     * bootstrap support for a CommonJS module system, since a loader
     * can first load and compile the transitive closure of an initial
     * module's synchronous depencies before actually executing any of
     * these module functions.
     *
     * <p>With a similarly lightweight RegExp, we should be able to
     * similarly recognize the {@code "load"} syntax of <a href=
     * "http://wiki.ecmascript.org/doku.php?id=strawman:simple_modules#syntax"
     * >Sam and Dave's module proposal for ES-Harmony</a>. However,
     * since browsers do not currently accept this syntax,
     * {@code getRequirements} above would also have to extract these
     * from the text to be compiled.
     */
    function compileModule(modSrc, opt_mitigateOpts) {
      // See https://code.google.com/p/google-caja/issues/detail?id=1849
      modSrc = ''+modSrc;

      var options = resolveOptions(opt_mitigateOpts);
      if (!('programSrc' in limitSrcCharset(modSrc))) {
        options.forceParseAndRender = true;
      }
      // Note the EOL after modSrc to prevent a trailing line comment in
      // modSrc from eliding the rest of the wrapper.
      var exprSrc =
          '(function() {' +
          mitigateSrcGotchas(modSrc, options) +
          '\n}).call(this)';
      // Follow the pattern in compileExpr
      var wrapperSrc = securableWrapperSrc(exprSrc);
      var wrapper = unsafeEval(wrapperSrc);
      var freeNames = atLeastFreeVarNames(exprSrc);
      var moduleMaker = makeCompiledExpr(wrapper, freeNames, options);

      moduleMaker.requirements = getRequirements(modSrc);
      return freeze(moduleMaker);
    }

    /**
     * A safe form of the {@code Function} constructor, which
     * constructs strict functions that can only refer freely to the
     * {@code sharedImports}.
     *
     * <p>The returned function is strict whether or not it declares
     * itself to be.
     */
    function FakeFunction(var_args) {
      var params = [].slice.call(arguments, 0);
      var body = ses.verifyStrictFunctionBody(params.pop() || '');

      // Although the individual params may not be strings, the params
      // array is reliably a fresh array, so under the SES (not CES)
      // assumptions of unmodified primordials, this calls the reliable
      // Array.prototype.join which guarantees that its result is a string.
      params = params.join(',');

      // Note the EOL after body to prevent a trailing line comment in
      // body from eliding the rest of the wrapper.
      var exprSrc = '(function(' + params + '\n){' + body + '\n})';
      return compileExpr(exprSrc)(sharedImports);
    }
    FakeFunction.prototype = UnsafeFunction.prototype;
    FakeFunction.prototype.constructor = FakeFunction;
    global.Function = FakeFunction;

    /**
     * A safe form of the indirect {@code eval} function, which
     * evaluates {@code src} as strict code that can only refer freely
     * to the {@code sharedImports}.
     *
     * <p>Given our parserless methods of verifying untrusted sources,
     * we unfortunately have no practical way to obtain the completion
     * value of a safely evaluated Program. Instead, we adopt a
     * compromise based on the following observation. All Expressions
     * are valid Programs, and all Programs are valid
     * FunctionBodys. If {@code src} parses as a strict expression,
     * then we evaluate it as an expression and correctly return its
     * completion value, since that is simply the value of the
     * expression.
     *
     * <p>Otherwise, we evaluate {@code src} as a FunctionBody and
     * return what that would return from its implicit enclosing
     * function. If {@code src} is simply a Program, then it would not
     * have an explicit {@code return} statement, and so we fail to
     * return its completion value.
     *
     * <p>When SES {@code eval} is provided primitively, it should
     * accept a Program and evaluate it to the Program's completion
     * value. Unfortunately, this is not possible on ES5 without
     * parsing.
     */
    function fakeEval(src) {
      try {
        src = verifyStrictExpression(src);
      } catch (x) {
        src = '(function() {' + src + '\n}).call(this)';
      }
      return compileExpr(src)(sharedImports);
    }

    if (TAME_GLOBAL_EVAL) {
      global.eval = fakeEval;
    }


    // For use by def below
    var defended = new WeakMap();
    var defendingStack = [];
    function pushDefending(val) {
      if (!val) { return; }
      var t = typeof val;
      if (t === 'number' || t === 'string' || t === 'boolean') { return; }
      if (t !== 'object' && t !== 'function') {
        throw new TypeError('unexpected typeof: ' + t);
      }
      if (defended.get(val)) { return; }
      defended.set(val, true);
      defendingStack.push(val);
    }

    /**
     * To define a defended object is to tamperProof it and all objects
     * transitively reachable from it via transitive reflective
     * property and prototype traversal.
     */
    function def(node) {
      var next;
      try {
        pushDefending(node);
        while (defendingStack.length > 0) {
          next = defendingStack.pop();
          pushDefending(getProto(next));
          tamperProof(next, pushDefending);
        }
      } catch (err) {
        defended = new WeakMap();
        defendingStack = [];
        throw err;
      }
      return node;
    }

    /**
     * makeArrayLike() produces a constructor for the purpose of
     * taming things like nodeLists.  The result, ArrayLike, takes an
     * instance of ArrayLike and two functions, getItem and getLength,
     * which put it in a position to do taming on demand.
     *
     * <p>The constructor returns a new object that inherits from the
     * {@code proto} passed in.
     *
     * makeArrayLike.canBeFullyLive indicates whether the implementation
     * is fully dynamic -- in particular whether, if getLength increases
     * its value between creation and access, is it guaranteed that
     * accesses in the new range will be intercepted by getItem.
     */
    var makeArrayLike;
    (function() {
      var itemMap = new WeakMap(), lengthMap = new WeakMap();
      function lengthGetter() {
        var getter = lengthMap.get(this);
        return getter ? getter() : void 0;
      }
      constFunc(lengthGetter);

      var nativeProxies = global.Proxy && (function () {
        var obj = {0: 'hi'};
        var p = global.Proxy.create({
          get: function(O, P) {
            return obj[P];
          }
        });
        return p[0] === 'hi';
      })();
      if (nativeProxies) {
        (function () {
          function ArrayLike(proto, getItem, getLength) {
            if (typeof proto !== 'object') {
              throw new TypeError('Expected proto to be an object.');
            }
            if (!(proto instanceof ArrayLike)) {
              throw new TypeError('Expected proto to be instanceof ArrayLike.');
            }
            var obj = create(proto);
            itemMap.set(obj, getItem);
            lengthMap.set(obj, getLength);
            return obj;
          }

          function ownPropDesc(P) {
            P = '' + P;
            if (P === 'length') {
              return {
                get: lengthGetter,
                enumerable: false,
                configurable: true  // required proxy invariant
              };
            } else if (typeof P === 'number' || P === '' + (+P)) {
              return {
                get: constFunc(function() {
                  var getter = itemMap.get(this);
                  return getter ? getter(+P) : void 0;
                }),
                enumerable: true,
                configurable: true  // required proxy invariant
              };
            }
            return void 0;
          }
          function propDesc(P) {
            var opd = ownPropDesc(P);
            if (opd) {
              return opd;
            } else {
              return gopd(Object.prototype, P);
            }
          }
          function get(O, P) {
            P = '' + P;
            if (P === 'length') {
              return lengthGetter.call(O);
            } else if (typeof P === 'number' || P === '' + (+P)) {
              var getter = itemMap.get(O);
              return getter ? getter(+P) : void 0;
            } else {
              // Note: if Object.prototype had accessors, this code would pass
              // incorrect 'this'.
              return Object.prototype[P];
            }
          }
          function has(P) {
            P = '' + P;
            return (P === 'length') ||
                (typeof P === 'number') ||
                (P === '' + +P) ||
                (P in Object.prototype);
          }
          function hasOwn(P) {
            P = '' + P;
            return (P === 'length') ||
                (typeof P === 'number') ||
                (P === '' + +P);
          }
          function getPN() {
            var result = getOwnPN ();
            var objPropNames = gopn(Object.prototype);
            result.push.apply(result, objPropNames);
            return result;
          }
          function getOwnPN() {
            // Cannot return an appropriate set of numeric properties, because
            // this proxy is the ArrayLike.prototype which is shared among all
            // instances.
            return ['length'];
          };
          function del(P) {
            P = '' + P;
            if ((P === 'length') || ('' + +P === P)) { return false; }
            return true;
          }

          ArrayLike.prototype = global.Proxy.create({
            toString: function() { return '[SES ArrayLike proxy handler]'; },
            getPropertyDescriptor: propDesc,
            getOwnPropertyDescriptor: ownPropDesc,
            get: get,
            has: has,
            hasOwn: hasOwn,
            getPropertyNames: getPN,
            getOwnPropertyNames: getOwnPN,
            'delete': del,
            fix: function() { return void 0; }
          }, Object.prototype);
          tamperProof(ArrayLike);
          makeArrayLike = function() { return ArrayLike; };
          makeArrayLike.canBeFullyLive = true;
        })();
      } else {
        (function() {
          // Make BiggestArrayLike.prototype be an object with a fixed
          // set of numeric getters.  To tame larger lists, replace
          // BiggestArrayLike and its prototype using
          // makeArrayLike(newLength).

          // See
          // http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
          function nextUInt31PowerOf2(v) {
            if (!(isFinite(v) && v >= 0)) {
              // avoid emitting nonsense
              throw new RangeError(v + ' not >= 0');
            }
            v &= 0x7fffffff;
            v |= v >> 1;
            v |= v >> 2;
            v |= v >> 4;
            v |= v >> 8;
            v |= v >> 16;
            return v + 1;
          }

          // The current function whose prototype has the most numeric getters.
          var BiggestArrayLike = void 0;
          var maxLen = 0;
          makeArrayLike = function(length) {
            length = +length;
            if (!(isFinite(length) && length >= 0)) {
              // Avoid bad behavior from negative numbers or other bad input.
              length = 0;
            }
            if (!BiggestArrayLike || length > maxLen) {
              var len = nextUInt31PowerOf2(length);
              // Create a new ArrayLike constructor to replace the old one.
              var BAL = function(proto, getItem, getLength) {
                if (typeof(proto) !== 'object') {
                  throw new TypeError('Expected proto to be an object.');
                }
                if (!(proto instanceof BAL)) {
                  throw new TypeError(
                      'Expected proto to be instanceof ArrayLike.');
                }
                var obj = create(proto);
                itemMap.set(obj, getItem);
                lengthMap.set(obj, getLength);
                return obj;
              };
              // Install native numeric getters.
              for (var i = 0; i < len; i++) {
                (function(j) {
                  function get() {
                    return itemMap.get(this)(j);
                  }
                  defProp(BAL.prototype, j, {
                    get: constFunc(get),
                    enumerable: true
                  });
                })(i);
              }
              // Install native length getter.
              defProp(BAL.prototype, 'length', { get: lengthGetter });
              // TamperProof and cache the result
              tamperProof(BAL);
              tamperProof(BAL.prototype);
              BiggestArrayLike = BAL;
              maxLen = len;
            }
            return BiggestArrayLike;
          };
          makeArrayLike.canBeFullyLive = false;
        })();
      }
    })();

    global.cajaVM = { // don't freeze here
      // Note that properties defined on cajaVM must also be added to
      // whitelist.js, or they will be deleted.

      /**
       * This is about to be deprecated once we expose ses.logger.
       *
       * <p>In the meantime, privileged code should use ses.logger.log
       * instead of cajaVM.log.
       */
      log: constFunc(function log(str) {
        if (typeof console !== 'undefined' && 'log' in console) {
          // We no longer test (typeof console.log === 'function') since,
          // on IE9 and IE10preview, in violation of the ES5 spec, it
          // is callable but has typeof "object". See
          // https://connect.microsoft.com/IE/feedback/details/685962/
          //   console-log-and-others-are-callable-but-arent-typeof-function
          console.log(str);
        }
      }),
      tamperProof: constFunc(tamperProof),
      constFunc: constFunc(constFunc),
      Nat: constFunc(Nat),
      // def: see below
      is: constFunc(ses.is),

      compileExpr: constFunc(compileExpr),
      confine: constFunc(confine),
      compileModule: constFunc(compileModule),
      // compileProgram: compileProgram, // Cannot be implemented in ES5.1.
      eval: fakeEval,               // don't freeze here
      Function: FakeFunction,       // don't freeze here,

      sharedImports: sharedImports, // don't freeze here
      makeImports: constFunc(makeImports),
      copyToImports: constFunc(copyToImports),

      makeArrayLike: constFunc(makeArrayLike)

      // Not defined here because it cannot be whitelisted; see assignment and
      // comments below.
      //es5ProblemReports: ses.es5ProblemReports
    };

    // Inserted here to make this ES5 singleton object controllable by our
    // whitelist, not to make it part of our public API.
    defProp(cajaVM, '[[ThrowTypeError]]', {
      enumerable: false,
      value: getThrowTypeError()
    });

    var extensionsRecord = extensions();
    gopn(extensionsRecord).forEach(function (p) {
      defProp(cajaVM, p,
              gopd(extensionsRecord, p));
    });

    // Move this down here so it is not available during the call to
    // extensions().
    global.cajaVM.def = constFunc(def);

  })();

  var propertyReports = {};
  var rootReports = {};

  function reportItemProblem(table, severity, status, path) {
    ses.updateMaxSeverity(severity);
    var group = table[status] || (table[status] = {
      severity: severity,
      list: []
    });
    group.list.push(path);
  }

  function logReports(table) {
    keys(table).sort().forEach(function(status) {
      var group = table[status];
      ses.logger.reportDiagnosis(group.severity, status, group.list);
    });
  }

  /**
   * Report how a property manipulation went.
   */
  function reportProperty(severity, status, path) {
    reportItemProblem(propertyReports, severity, status, path);
  }

  /**
   * Initialize accessible global variables and {@code sharedImports}.
   *
   * For each of the whitelisted globals, we read its value, freeze
   * that global property as a data property, and mirror that property
   * with a frozen data property of the same name and value on {@code
   * sharedImports}, but always non-enumerable. We make these
   * non-enumerable since ES5.1 specifies that all these properties
   * are non-enumerable on the global object.
   */
  keys(whitelist).forEach(function(name) {
    var desc = gopd(global, name);
    if (desc) {
      var permit = whitelist[name];
      if (permit) {
        var newDesc = {
          value: global[name],
          writable: false,
          configurable: false,

          // See https://bugzilla.mozilla.org/show_bug.cgi?id=787262
          enumerable: desc.enumerable
        };
        try {
          defProp(global, name, newDesc);
        } catch (err) {
          reportProperty(ses.severities.NEW_SYMPTOM,
                         'Global ' + name + ' cannot be made readonly: ' + err);
        }
        defProp(sharedImports, name, newDesc);
      }
    }
  });
  if (TAME_GLOBAL_EVAL) {
    defProp(sharedImports, 'eval', {
      value: cajaVM.eval,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  /**
   * The whiteTable should map from each path-accessible primordial
   * object to the permit object that describes how it should be
   * cleaned.
   *
   * We initialize the whiteTable only so that {@code getPermit} can
   * process "*" inheritance using the whitelist, by walking actual
   * superclass chains.
   */
  var whitelistSymbols = [true, '*', 'maybeAccessor'];
  var whiteTable = new WeakMap();
  function register(value, permit) {
    if (value !== Object(value)) { return; }
    if (typeof permit !== 'object') {
      if (whitelistSymbols.indexOf(permit) < 0) {
        fail('syntax error in whitelist; unexpected value: ' + permit);
      }
      return;
    }
    var oldPermit = whiteTable.get(value);
    if (oldPermit) {
      fail('primordial reachable through multiple paths');
    }
    whiteTable.set(value, permit);
    keys(permit).forEach(function(name) {
      // Use gopd to avoid invoking an accessor property.
      // Accessor properties for which permit !== 'maybeAccessor'
      // are caught later by clean().
      var desc = gopd(value, name);
      if (desc) {
        register(desc.value, permit[name]);
      }
    });
  }
  register(sharedImports, whitelist);

  /**
   * Should the property named {@code name} be whitelisted on the
   * {@code base} object, and if so, with what Permit?
   *
   * <p>If it should be permitted, return the Permit (where Permit =
   * true | "accessor" | "*" | Record(Permit)), all of which are
   * truthy. If it should not be permitted, return false.
   */
  function getPermit(base, name) {
    var permit = whiteTable.get(base);
    if (permit) {
      if (hop.call(permit, name)) { return permit[name]; }
    }
    while (true) {
      base = getProto(base);
      if (base === null) { return false; }
      permit = whiteTable.get(base);
      if (permit && hop.call(permit, name)) {
        var result = permit[name];
        if (result === '*') {
          return result;
        } else {
          return false;
        }
      }
    }
  }

  var cleaning = new WeakMap();

  /**
   * Delete the property if possible, else try to poison.
   */
  function cleanProperty(base, name, path) {
    function poison() {
      throw new TypeError('Cannot access property ' + path);
    }
    var diagnostic;

    if (typeof base === 'function') {
      if (name === 'caller') {
        diagnostic = ses.makeCallerHarmless(base, path);
        // We can use a severity of SAFE here since if this isn't
        // safe, it is the responsibility of repairES5.js to tell us
        // so. All the same, we should inspect the reports on all
        // platforms we care about to see if there are any surprises.
        reportProperty(ses.severities.SAFE,
                       diagnostic, path);
        return true;
      }
      if (name === 'arguments') {
        diagnostic = ses.makeArgumentsHarmless(base, path);
        // We can use a severity of SAFE here since if this isn't
        // safe, it is the responsibility of repairES5.js to tell us
        // so. All the same, we should inspect the reports on all
        // platforms we care about to see if there are any surprises.
        reportProperty(ses.severities.SAFE,
                       diagnostic, path);
        return true;
      }
    }

    if (name === '__proto__') {
      // At least Chrome Version 27.0.1428.0 canary, Safari Version
      // 6.0.2 (8536.26.17), and Opera 12.14 include '__proto__' in the
      // result of Object.getOwnPropertyNames. However, the meaning of
      // deleting this isn't clear, so here we effectively whitelist
      // it on all objects.
      //
      // We do not whitelist it in whitelist.js, as that would involve
      // creating a property {@code __proto__: '*'} which, on some
      // engines (and perhaps as standard on ES6) attempt to make this
      // portion of the whitelist inherit from {@code '*'}, which
      // would fail in amusing ways.
      reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
                     'Skipped', path);
      return true;
    }

    var deleted = void 0;
    var err = void 0;
    try {
      deleted = delete base[name];
    } catch (er) { err = er; }
    var exists = hop.call(base, name);
    if (deleted) {
      if (!exists) {
        reportProperty(ses.severities.SAFE,
                       'Deleted', path);
        return true;
      }
      reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
                     'Bounced back', path);
    } else if (deleted === false) {
      reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
                     'Strict delete returned false rather than throwing', path);
    } else if (err instanceof TypeError) {
      // This is the normal abnormal case, so leave it to the next
      // section to emit a diagnostic.
      //
      // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
      //                'Cannot be deleted', path);
    } else {
      reportProperty(ses.severities.NEW_SYMPTOM,
                     'Delete failed with' + err, path);
    }

    try {
      defProp(base, name, {
        get: poison,
        set: poison,
        enumerable: false,
        configurable: false
      });
    } catch (cantPoisonErr) {
      try {
        // Perhaps it's writable non-configurable, in which case we
        // should still be able to freeze it in a harmless state.
        var value = gopd(base, name).value;
        defProp(base, name, {
          // If it's a primitive value, like IE10's non-standard,
          // non-deletable, but harmless RegExp.prototype.options,
          // then we allow it to retain its value.
          value: value === Object(value) ? void 0 : value,
          writable: false,
          configurable: false
        });
      } catch (cantFreezeHarmless) {
        reportProperty(ses.severities.NOT_ISOLATED,
                       'Cannot be poisoned', path);
        return false;
      }
    }
    var desc2 = gopd(base, name);
    if (desc2.get === poison &&
        desc2.set === poison &&
        !desc2.configurable) {
      try {
        var dummy2 = base[name];
      } catch (expectedErr) {
        if (expectedErr instanceof TypeError) {
          reportProperty(ses.severities.SAFE,
                         'Successfully poisoned', path);
          return true;
        }
      }
    } else if (desc2.value !== Object(desc2.value2) && // is primitive
               !desc2.writable &&
               !desc2.configurable) {
      reportProperty(ses.severities.SAFE,
                     'Frozen harmless', path);
      return false;
    }
    reportProperty(ses.severities.NEW_SYMPTOM,
                   'Failed to be poisoned', path);
    return false;
  }

  /**
   * Assumes all super objects are otherwise accessible and so will be
   * independently cleaned.
   */
  function clean(value, prefix) {
    if (value !== Object(value)) { return; }
    if (cleaning.get(value)) { return; }
    cleaning.set(value, true);
    gopn(value).forEach(function(name) {
      var path = prefix + (prefix ? '.' : '') + name;
      var p = getPermit(value, name);
      if (p) {
        var desc = gopd(value, name);
        if (hop.call(desc, 'value')) {
          // Is a data property
          var subValue = desc.value;
          clean(subValue, path);
        } else {
          if (p !== 'maybeAccessor') {
            // We are not saying that it is safe for the prop to be
            // unexpectedly an accessor; rather, it will be deleted
            // and thus made safe.
            reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
                           'Not a data property', path);
            cleanProperty(value, name, path);
          } else {
            clean(desc.get, path + '<getter>');
            clean(desc.set, path + '<setter>');
          }
        }
      } else {
        cleanProperty(value, name, path);
      }
    });
  }
  clean(sharedImports, '');

  // es5ProblemReports has a 'dynamic' set of keys, and the whitelist mechanism
  // does not support this, so as a kludge we insert it after cleaning
  // and before defending. TODO(kpreid): Figure out a proper workaround. Perhaps
  // add another type of whitelisting (say a wildcard property name, or
  // 'recursively JSON')?
  cajaVM.es5ProblemReports = ses.es5ProblemReports;

  // This protection is now gathered here, so that a future version
  // can skip it for non-defensive frames that must only be confined.
  cajaVM.def(sharedImports);

  // Internal communication back to repairES5 repairs that need to know if
  // things have been frozen. TODO(kpreid): Consider making this more specific
  // (identifying the actually frozen objects) if that doesn't cost too much.
  ses._primordialsHaveBeenFrozen = true;

  // The following objects are ambiently available via language constructs, and
  // therefore if we did not clean and defend them we have a problem. This is
  // defense against mistakes in modifying the whitelist, not against browser
  // bugs.
  [
    ['sharedImports', sharedImports],
    ['[[ThrowTypeError]]', getThrowTypeError()],  // function literals
    ['Array.prototype', Array.prototype],  // [], gOPN etc.
    ['Boolean.prototype', Boolean.prototype],  // false, true
    ['Function.prototype', Function.prototype],  // function(){}
    ['Number.prototype', Number.prototype],  // 1, 2
    ['Object.prototype', Object.prototype],  // {}, gOPD
    ['RegExp.prototype', RegExp.prototype],  // /.../
    ['String.prototype', String.prototype]  // "..."
    // TODO(kpreid): Is this list complete?
  ].forEach(function(record) {
    var name = record[0];
    var root = record[1];
    if (!cleaning.has(root)) {
      reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,
          'Not cleaned', name);
    }
    if (!Object.isFrozen(root)) {
      reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,
          'Not frozen', name);
    }
  });

  logReports(propertyReports);
  logReports(rootReports);

  // This repair cannot be fully tested until after Object.prototype is frozen.
  // TODO(kpreid): Less one-off kludge for this one problem -- or, once the
  // problem is obsolete, delete all this code.
  // (We cannot reuse any infrastructure from repairES5 because it is not
  // exported.)
  var result;
  try {
    result = ses.kludge_test_FREEZING_BREAKS_PROTOTYPES();
  } catch (e) { result = e; }
  if (result !== false) {
    ses.logger.error(
        'FREEZING_BREAKS_PROTOTYPES repair not actually successful (' +
        result + ')');
    ses.updateMaxSeverity(
        ses.es5ProblemReports.FREEZING_BREAKS_PROTOTYPES.preSeverity);
  }

  ses.logger.reportMax();

  if (ses.ok()) {
    // We succeeded. Enable safe Function, eval, and compile* to work.
    // TODO(kpreid): This separate 'dirty' flag should be replaced with
    // a problem registered with ses._repairer, so that ses.ok() itself
    // gives the whole answer.
    dirty = false;
    ses.logger.log('initSES succeeded.');
  } else {
    ses.logger.error('initSES failed.');
  }
};
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * This is a pure-ES5 implementation of ejectors, guards, and trademarks as
 * otherwise provided by ES5/3. It is incorporated into the cajaVM object by
 * hookupSESPlus.js.
 *
 * <p>Assumes ES5. Compatible with ES5-strict.
 *
 * // provides ses.ejectorsGuardsTrademarks
 * @author kpreid@switchb.org
 * @requires WeakMap, cajaVM
 * @overrides ses, ejectorsGuardsTrademarksModule
 */
var ses;

(function ejectorsGuardsTrademarksModule(){
  "use strict";

  ses.ejectorsGuardsTrademarks = function ejectorsGuardsTrademarks() {

    /**
     * During the call to {@code ejectorsGuardsTrademarks}, {@code
     * ejectorsGuardsTrademarks} must not call {@code cajaVM.def},
     * since startSES.js has not yet finished cleaning things. See the
     * doc-comments on the {@code extensions} parameter of
     * startSES.js.
     *
     * <p>Instead, we define here some conveniences for freezing just
     * enough without prematurely freezing primodial objects
     * transitively reachable from these.
     */
    var freeze = Object.freeze;
    var constFunc = cajaVM.constFunc;


    /**
     * Returns a new object whose only utility is its identity and (for
     * diagnostic purposes only) its name.
     */
    function Token(name) {
      name = '' + name;
      return freeze({
        toString: constFunc(function tokenToString() {
          return name;
        })
      });
    }


    ////////////////////////////////////////////////////////////////////////
    // Ejectors
    ////////////////////////////////////////////////////////////////////////

    /**
     * One-arg form is known in scheme as "call with escape
     * continuation" (call/ec).
     *
     * <p>In this analogy, a call to {@code callWithEjector} emulates a
     * labeled statement. The ejector passed to the {@code attemptFunc}
     * emulates the label part. The {@code attemptFunc} itself emulates
     * the statement being labeled. And a call to {@code eject} with
     * this ejector emulates the return-to-label statement.
     *
     * <p>We extend the normal notion of call/ec with an
     * {@code opt_failFunc} in order to give more the sense of a
     * {@code try/catch} (or similarly, the {@code escape} special
     * form in E). The {@code attemptFunc} is like the {@code try}
     * clause and the {@code opt_failFunc} is like the {@code catch}
     * clause. If omitted, {@code opt_failFunc} defaults to the
     * {@code identity} function.
     *
     * <p>{@code callWithEjector} creates a fresh ejector -- a one
     * argument function -- for exiting from this attempt. It then calls
     * {@code attemptFunc} passing that ejector as argument. If
     * {@code attemptFunc} completes without calling the ejector, then
     * this call to {@code callWithEjector} completes
     * likewise. Otherwise, if the ejector is called with an argument,
     * then {@code opt_failFunc} is called with that argument. The
     * completion of {@code opt_failFunc} is then the completion of the
     * {@code callWithEjector} as a whole.
     *
     * <p>The ejector stays live until {@code attemptFunc} is exited,
     * at which point the ejector is disabled. Calling a disabled
     * ejector throws.
     *
     * <p>Note that the ejector relies on {@code try..catch}, so
     * it's not entirely bulletproof. The {@code attemptFunc} can
     * block an {@code eject} with a {@code try..catch} or a
     * {@code try..finally} that throws, so you should be careful
     * about what code is run in the attemptFunc.
     *
     * <p>Historic note: This was first invented by John C. Reynolds in
     * <a href="http://doi.acm.org/10.1145/800194.805852"
     * >Definitional interpreters for higher-order programming
     * languages</a>. Reynold's invention was a special form as in E,
     * rather than a higher order function as here and in call/ec.
     */
    function callWithEjector(attemptFunc, opt_failFunc) {
      var failFunc = opt_failFunc || function (x) { return x; };
      var disabled = false;
      var token = new Token('ejection');
      var stash = void 0;
      function ejector(result) {
        if (disabled) {
          throw new Error('ejector disabled');
        } else {
          // don't disable here.
          stash = result;
          throw token;
        }
      }
      constFunc(ejector);
      try {
        try {
          return attemptFunc(ejector);
        } finally {
          disabled = true;
        }
      } catch (e) {
        if (e === token) {
          return failFunc(stash);
        } else {
          throw e;
        }
      }
    }

    /**
     * Safely invokes {@code opt_ejector} with {@code result}.
     * <p>
     * If {@code opt_ejector} is falsy, disabled, or returns
     * normally, then {@code eject} throws. Under no conditions does
     * {@code eject} return normally.
     */
    function eject(opt_ejector, result) {
      if (opt_ejector) {
        opt_ejector(result);
        throw new Error('Ejector did not exit: ', opt_ejector);
      } else {
        throw new Error(result);
      }
    }

    ////////////////////////////////////////////////////////////////////////
    // Sealing and Unsealing
    ////////////////////////////////////////////////////////////////////////

    function makeSealerUnsealerPair() {
      var boxValues = new WeakMap(true); // use key lifetime

      function seal(value) {
        var box = freeze({});
        boxValues.set(box, value);
        return box;
      }
      function optUnseal(box) {
        return boxValues.has(box) ? [boxValues.get(box)] : null;
      }
      function unseal(box) {
        var result = optUnseal(box);
        if (result === null) {
          throw new Error("That wasn't one of my sealed boxes!");
        } else {
          return result[0];
        }
      }
      return freeze({
        seal: constFunc(seal),
        unseal: constFunc(unseal),
        optUnseal: constFunc(optUnseal)
      });
    }


    ////////////////////////////////////////////////////////////////////////
    // Trademarks
    ////////////////////////////////////////////////////////////////////////

    var stampers = new WeakMap(true);

    /**
     * Internal routine for making a trademark from a table.
     *
     * <p>To untangle a cycle, the guard made by {@code makeTrademark}
     * is not yet stamped. The caller of {@code makeTrademark} must
     * stamp it before allowing the guard to escape.
     *
     * <p>Note that {@code makeTrademark} is called during the call to
     * {@code ejectorsGuardsTrademarks}, and so must not call {@code
     * cajaVM.def}.
     */
    function makeTrademark(typename, table) {
      typename = '' + typename;

      var stamp = freeze({
        toString: constFunc(function() { return typename + 'Stamp'; })
      });

      stampers.set(stamp, function(obj) {
        table.set(obj, true);
        return obj;
      });

      return freeze({
        toString: constFunc(function() { return typename + 'Mark'; }),
        stamp: stamp,
        guard: freeze({
          toString: constFunc(function() { return typename + 'T'; }),
          coerce: constFunc(function(specimen, opt_ejector) {
            if (!table.get(specimen)) {
              eject(opt_ejector,
                    'Specimen does not have the "' + typename + '" trademark');
            }
            return specimen;
          })
        })
      });
    }

    /**
     * Objects representing guards should be marked as such, so that
     * they will pass the {@code GuardT} guard.
     * <p>
     * {@code GuardT} is generally accessible as
     * {@code cajaVM.GuardT}. However, {@code GuardStamp} must not be
     * made generally accessible, but rather only given to code trusted
     * to use it to deem as guards things that act in a guard-like
     * manner: A guard MUST be immutable and SHOULD be idempotent. By
     * "idempotent", we mean that<pre>
     *     var x = g(specimen, ej); // may fail
     *     // if we're still here, then without further failure
     *     g(x) === x
     * </pre>
     */
    var GuardMark = makeTrademark('Guard', new WeakMap());
    var GuardT = GuardMark.guard;
    var GuardStamp = GuardMark.stamp;
    stampers.get(GuardStamp)(GuardT);

    /**
     * The {@code Trademark} constructor makes a trademark, which is a
     * guard/stamp pair, where the stamp marks and freezes unfrozen
     * records as carrying that trademark and the corresponding guard
     * cerifies objects as carrying that trademark (and therefore as
     * having been marked by that stamp).
     *
     * <p>By convention, a guard representing the type-like concept
     * 'Foo' is named 'FooT'. The corresponding stamp is
     * 'FooStamp'. And the record holding both is 'FooMark'. Many
     * guards also have {@code of} methods for making guards like
     * themselves but parameterized by further constraints, which are
     * usually other guards. For example, {@code T.ListT} is the guard
     * representing frozen array, whereas {@code
     * T.ListT.of(cajaVM.GuardT)} represents frozen arrays of guards.
     */
    function Trademark(typename) {
      var result = makeTrademark(typename, new WeakMap());
      stampers.get(GuardStamp)(result.guard);
      return result;
    };

    /**
     * Given that {@code stamps} is a list of stamps and
     * {@code record} is a non-frozen object, this marks record with
     * the trademarks of all of these stamps, and then freezes and
     * returns the record.
     * <p>
     * If any of these conditions do not hold, this throws.
     */
    function stamp(stamps, record) {
      // TODO: Should nonextensible objects be stampable?
      if (Object.isFrozen(record)) {
        throw new TypeError("Can't stamp frozen objects: " + record);
      }
      stamps = Array.prototype.slice.call(stamps, 0);
      var numStamps = stamps.length;
      // First ensure that we will succeed before applying any stamps to
      // the record.
      var i;
      for (i = 0; i < numStamps; i++) {
        if (!stampers.has(stamps[i])) {
          throw new TypeError("Can't stamp with a non-stamp: " + stamps[i]);
        }
      }
      for (i = 0; i < numStamps; i++) {
        // Only works for real stamps, postponing the need for a
        // user-implementable auditing protocol.
        stampers.get(stamps[i])(record);
      }
      return freeze(record);
    };

    ////////////////////////////////////////////////////////////////////////
    // Guards
    ////////////////////////////////////////////////////////////////////////

    /**
     * First ensures that g is a guard; then does
     * {@code g.coerce(specimen, opt_ejector)}.
     */
    function guard(g, specimen, opt_ejector) {
      g = GuardT.coerce(g); // failure throws rather than ejects
      return g.coerce(specimen, opt_ejector);
    }

    /**
     * First ensures that g is a guard; then checks whether the specimen
     * passes that guard.
     * <p>
     * If g is a coercing guard, this only checks that g coerces the
     * specimen to something rather than failing. Note that trademark
     * guards are non-coercing, so if specimen passes a trademark guard,
     * then specimen itself has been marked with that trademark.
     */
    function passesGuard(g, specimen) {
      g = GuardT.coerce(g); // failure throws rather than ejects
      return callWithEjector(
        constFunc(function(opt_ejector) {
          g.coerce(specimen, opt_ejector);
          return true;
        }),
        constFunc(function(ignored) {
          return false;
        })
      );
    }


    /**
     * Create a guard which passes all objects present in {@code table}.
     * This may be used to define trademark-like systems which do not require
     * the object to be frozen.
     *
     * {@code typename} is used for toString and {@code errorMessage} is used
     * when an object does not pass the guard.
     */
    function makeTableGuard(table, typename, errorMessage) {
      var g = {
        toString: constFunc(function() { return typename + 'T'; }),
        coerce: constFunc(function(specimen, opt_ejector) {
          if (Object(specimen) === specimen && table.get(specimen)) {
            return specimen;
          }
          eject(opt_ejector, errorMessage);
        })
      };
      stamp([GuardStamp], g);
      return freeze(g);
    }

    ////////////////////////////////////////////////////////////////////////
    // Exporting
    ////////////////////////////////////////////////////////////////////////

    return freeze({
      makeSealerUnsealerPair: constFunc(makeSealerUnsealerPair),
      GuardT: GuardT,
      makeTableGuard: constFunc(makeTableGuard),
      Trademark: constFunc(Trademark),
      guard: constFunc(guard),
      passesGuard: constFunc(passesGuard),
      stamp: constFunc(stamp)
    });
  };
})();
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Call {@code ses.startSES} to turn this frame into a
 * SES environment following object-capability rules.
 *
 * <p>Assumes ES5 plus WeakMap. Compatible with ES5-strict or
 * anticipated ES6.
 *
 * @author Mark S. Miller
 * @requires this
 * @overrides ses, hookupSESPlusModule
 */

(function hookupSESPlusModule(global) {
  "use strict";

  try {
    if (!ses.okToLoad()) {
      return;
    }

    ses.startSES(global,
                 ses.whitelist,
                 ses.limitSrcCharset,
                 ses.atLeastFreeVarNames,
                 ses.ejectorsGuardsTrademarks);
  } catch (err) {
    ses.updateMaxSeverity(ses.severities.NOT_SUPPORTED);
    ses.logger.error('hookupSESPlus failed with: ', err);
  } finally {
    // Balanced by beginStartup in logger.js
    ses.logger.endStartup();
  }
})(this);
;
// Copyright (C) 2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * This file exists to be concatenated into the taming frame file that caja.js
 * loads to bail out in a controlled fashion if SES fails to load (rather than
 * losing the callback signal when later dependent code fails by trying to use
 * SES features).
 *
 * @author kpreid@switchb.org
 * @requires ses, cajaIframeDone___
 */

if (typeof ses !== 'undefined' && ses.ok && !ses.ok()) {
  cajaIframeDone___();

  // Cause a well-defined error to prevent anything further from happening
  // (such as a more cryptic error or a second call to cajaIframeDone___).
  throw new Error('SES not supported, aborting taming frame initialization.');
}
;
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Unicode character classes.
 *
 * @see http://www.w3.org/TR/2000/REC-xml-20001006#CharClasses
 * @author mikesamuel@gmail.com
 * @provides unicode
 * @overrides window
 */


/** @namespace */
var unicode = {};

unicode.BASE_CHAR = (
    '\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF'
    + '\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3'
    + '\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1'
    + '\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6'
    + '\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F'
    + '\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC'
    + '\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559'
    + '\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A'
    + '\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5'
    + '\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C'
    + '\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9'
    + '\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10'
    + '\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39'
    + '\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91'
    + '\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0'
    + '\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33'
    + '\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A'
    + '\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F'
    + '\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C'
    + '\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61'
    + '\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9'
    + '\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28'
    + '\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33'
    + '\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D'
    + '\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB'
    + '\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47'
    + '\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103'
    + '\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140'
    + '\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165'
    + '\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB'
    + '\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9'
    + '\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45'
    + '\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D'
    + '\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC'
    + '\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC'
    + '\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA'
    + '\u3105-\u312C\uAC00-\uD7A3');
unicode.IDEOGRAPHIC = '\u4E00-\u9FA5\u3007\u3021-\u3029';
unicode.LETTER = unicode.BASE_CHAR + unicode.IDEOGRAPHIC;
unicode.COMBINING_CHAR = (
    '\u0300-\u0345\u0360-\u0361\u0483-\u0486\u0591-\u05A1\u05A3-\u05B9'
    + '\u05BB-\u05BD\u05BF\u05C1-\u05C2\u05C4\u064B-\u0652\u0670'
    + '\u06D6-\u06DC\u06DD-\u06DF\u06E0-\u06E4\u06E7-\u06E8\u06EA-\u06ED'
    + '\u0901-\u0903\u093C\u093E-\u094C\u094D\u0951-\u0954\u0962-\u0963'
    + '\u0981-\u0983\u09BC\u09BE\u09BF\u09C0-\u09C4\u09C7-\u09C8'
    + '\u09CB-\u09CD\u09D7\u09E2-\u09E3\u0A02\u0A3C\u0A3E\u0A3F'
    + '\u0A40-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D\u0A70-\u0A71\u0A81-\u0A83'
    + '\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0B01-\u0B03\u0B3C'
    + '\u0B3E-\u0B43\u0B47-\u0B48\u0B4B-\u0B4D\u0B56-\u0B57\u0B82-\u0B83'
    + '\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C01-\u0C03'
    + '\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56\u0C82-\u0C83'
    + '\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5-\u0CD6\u0D02-\u0D03'
    + '\u0D3E-\u0D43\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0E31\u0E34-\u0E3A'
    + '\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB-\u0EBC\u0EC8-\u0ECD'
    + '\u0F18-\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84'
    + '\u0F86-\u0F8B\u0F90-\u0F95\u0F97\u0F99-\u0FAD\u0FB1-\u0FB7\u0FB9'
    + '\u20D0-\u20DC\u20E1\u302A-\u302F\u3099\u309A');
unicode.DIGIT = (
    '\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF'
    + '\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE7-\u0BEF\u0C66-\u0C6F'
    + '\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29');
unicode.EXTENDER = (
    '\u00B7\u02D0\u02D1\u0387\u0640\u0E46\u0EC6\u3005\u3031-\u3035'
    + '\u309D-\u309E\u30FC-\u30FE');

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['unicode'] = unicode;
}
;
/* Copyright Google Inc.
 * Licensed under the Apache Licence Version 2.0
 * Autogenerated at Wed Feb 26 17:25:09 PST 2014
 * \@overrides window
 * \@provides cssSchema, CSS_PROP_BIT_QUANTITY, CSS_PROP_BIT_HASH_VALUE, CSS_PROP_BIT_NEGATIVE_QUANTITY, CSS_PROP_BIT_QSTRING, CSS_PROP_BIT_URL, CSS_PROP_BIT_UNRESERVED_WORD, CSS_PROP_BIT_UNICODE_RANGE, CSS_PROP_BIT_GLOBAL_NAME, CSS_PROP_BIT_PROPERTY_NAME */
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_QUANTITY = 1;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_HASH_VALUE = 2;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_NEGATIVE_QUANTITY = 4;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_QSTRING = 8;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_URL = 16;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_UNRESERVED_WORD = 64;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_UNICODE_RANGE = 128;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_GLOBAL_NAME = 512;
/**
 * @const
 * @type {number}
 */
var CSS_PROP_BIT_PROPERTY_NAME = 1024;
var cssSchema = (function () {
    var L = [ [ 'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure',
        'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet',
        'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
        'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
        'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkkhaki',
        'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
        'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
        'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray',
        'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia',
        'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green',
        'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory',
        'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
        'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
        'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen',
        'lightskyblue', 'lightslategray', 'lightsteelblue', 'lightyellow',
        'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
        'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
        'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
        'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose',
        'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab',
        'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen',
        'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru',
        'pink', 'plum', 'powderblue', 'purple', 'red', 'rosybrown',
        'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen',
        'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray',
        'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato',
        'transparent', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke',
        'yellow', 'yellowgreen' ], [ 'all-scroll', 'col-resize', 'crosshair',
        'default', 'e-resize', 'hand', 'help', 'move', 'n-resize', 'ne-resize',
        'no-drop', 'not-allowed', 'nw-resize', 'pointer', 'progress',
        'row-resize', 's-resize', 'se-resize', 'sw-resize', 'text',
        'vertical-text', 'w-resize', 'wait' ], [ 'armenian', 'decimal',
        'decimal-leading-zero', 'disc', 'georgian', 'lower-alpha',
        'lower-greek', 'lower-latin', 'lower-roman', 'square', 'upper-alpha',
        'upper-latin', 'upper-roman' ], [ '100', '200', '300', '400', '500',
        '600', '700', '800', '900', 'bold', 'bolder', 'lighter' ], [
        'block-level', 'inline-level', 'table-caption', 'table-cell',
        'table-column', 'table-column-group', 'table-footer-group',
        'table-header-group', 'table-row', 'table-row-group' ], [ 'condensed',
        'expanded', 'extra-condensed', 'extra-expanded', 'narrower',
        'semi-condensed', 'semi-expanded', 'ultra-condensed', 'ultra-expanded',
        'wider' ], [ 'inherit', 'inline', 'inline-block', 'inline-box',
        'inline-flex', 'inline-grid', 'inline-list-item', 'inline-stack',
        'inline-table', 'run-in' ], [ 'behind', 'center-left', 'center-right',
        'far-left', 'far-right', 'left-side', 'leftwards', 'right-side',
        'rightwards' ], [ 'large', 'larger', 'small', 'smaller', 'x-large',
        'x-small', 'xx-large', 'xx-small' ], [ 'dashed', 'dotted', 'double',
        'groove', 'outset', 'ridge', 'solid' ], [ 'ease', 'ease-in',
        'ease-in-out', 'ease-out', 'linear', 'step-end', 'step-start' ], [
        'at', 'closest-corner', 'closest-side', 'ellipse', 'farthest-corner',
        'farthest-side' ], [ 'baseline', 'middle', 'sub', 'super',
        'text-bottom', 'text-top' ], [ 'caption', 'icon', 'menu',
        'message-box', 'small-caption', 'status-bar' ], [ 'fast', 'faster',
        'slow', 'slower', 'x-fast', 'x-slow' ], [ 'above', 'below', 'higher',
        'level', 'lower' ], [ 'cursive', 'fantasy', 'monospace', 'sans-serif',
        'serif' ], [ 'loud', 'silent', 'soft', 'x-loud', 'x-soft' ], [
        'no-repeat', 'repeat-x', 'repeat-y', 'round', 'space' ], [ 'blink',
        'line-through', 'overline', 'underline' ], [ 'block', 'flex', 'grid',
        'table' ], [ 'high', 'low', 'x-high', 'x-low' ], [ 'nowrap', 'pre',
        'pre-line', 'pre-wrap' ], [ 'absolute', 'relative', 'static' ], [
        'alternate', 'alternate-reverse', 'reverse' ], [ 'border-box',
        'content-box', 'padding-box' ], [ 'capitalize', 'lowercase',
        'uppercase' ], [ 'child', 'female', 'male' ], [ '=', 'opacity' ], [
        'backwards', 'forwards' ], [ 'bidi-override', 'embed' ], [ 'bottom',
        'top' ], [ 'break-all', 'keep-all' ], [ 'clip', 'ellipsis' ], [
        'contain', 'cover' ], [ 'continuous', 'digits' ], [ 'end', 'start' ], [
        'flat', 'preserve-3d' ], [ 'hide', 'show' ], [ 'horizontal', 'vertical'
      ], [ 'inside', 'outside' ], [ 'italic', 'oblique' ], [ 'left', 'right' ],
      [ 'ltr', 'rtl' ], [ 'no-content', 'no-display' ], [ 'paused', 'running' ]
      , [ 'suppress', 'unrestricted' ], [ 'thick', 'thin' ], [ ',' ], [ '/' ],
      [ 'all' ], [ 'always' ], [ 'auto' ], [ 'avoid' ], [ 'both' ], [
        'break-word' ], [ 'center' ], [ 'circle' ], [ 'code' ], [ 'collapse' ],
      [ 'contents' ], [ 'fixed' ], [ 'hidden' ], [ 'infinite' ], [ 'inset' ], [
        'invert' ], [ 'justify' ], [ 'list-item' ], [ 'local' ], [ 'medium' ],
      [ 'mix' ], [ 'none' ], [ 'normal' ], [ 'once' ], [ 'repeat' ], [ 'scroll'
      ], [ 'separate' ], [ 'small-caps' ], [ 'spell-out' ], [ 'to' ], [
        'visible' ] ];
    var schema = {
      'animation': {
        'cssPropBits': 517,
        'cssLitGroup': [ L[ 10 ], L[ 24 ], L[ 29 ], L[ 45 ], L[ 48 ], L[ 54 ],
          L[ 63 ], L[ 71 ], L[ 72 ] ],
        'cssFns': [ 'cubic-bezier()', 'steps()' ]
      },
      'animation-delay': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 48 ] ],
        'cssFns': [ ]
      },
      'animation-direction': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 24 ], L[ 48 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'animation-duration': 'animation-delay',
      'animation-fill-mode': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 29 ], L[ 48 ], L[ 54 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'animation-iteration-count': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 48 ], L[ 63 ] ],
        'cssFns': [ ]
      },
      'animation-name': {
        'cssPropBits': 512,
        'cssLitGroup': [ L[ 48 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'animation-play-state': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 45 ], L[ 48 ] ],
        'cssFns': [ ]
      },
      'animation-timing-function': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 10 ], L[ 48 ] ],
        'cssFns': [ 'cubic-bezier()', 'steps()' ]
      },
      'appearance': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ ]
      },
      'azimuth': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 7 ], L[ 42 ], L[ 56 ] ],
        'cssFns': [ ]
      },
      'backface-visibility': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 59 ], L[ 62 ], L[ 80 ] ],
        'cssFns': [ ]
      },
      'background': {
        'cssPropBits': 23,
        'cssLitGroup': [ L[ 0 ], L[ 18 ], L[ 25 ], L[ 31 ], L[ 34 ], L[ 42 ],
          L[ 48 ], L[ 49 ], L[ 52 ], L[ 56 ], L[ 61 ], L[ 68 ], L[ 71 ], L[ 74
          ], L[ 75 ] ],
        'cssFns': [ 'image()', 'linear-gradient()', 'radial-gradient()',
          'repeating-linear-gradient()', 'repeating-radial-gradient()',
          'rgb()', 'rgba()' ]
      },
      'background-attachment': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 48 ], L[ 61 ], L[ 68 ], L[ 75 ] ],
        'cssFns': [ ]
      },
      'background-color': {
        'cssPropBits': 2,
        'cssLitGroup': [ L[ 0 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'background-image': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 48 ], L[ 71 ] ],
        'cssFns': [ 'image()', 'linear-gradient()', 'radial-gradient()',
          'repeating-linear-gradient()', 'repeating-radial-gradient()' ]
      },
      'background-position': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 31 ], L[ 42 ], L[ 48 ], L[ 56 ] ],
        'cssFns': [ ]
      },
      'background-repeat': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 18 ], L[ 48 ], L[ 74 ] ],
        'cssFns': [ ]
      },
      'background-size': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 34 ], L[ 48 ], L[ 52 ] ],
        'cssFns': [ ]
      },
      'border': {
        'cssPropBits': 7,
        'cssLitGroup': [ L[ 0 ], L[ 9 ], L[ 47 ], L[ 62 ], L[ 64 ], L[ 69 ], L[
            71 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'border-bottom': 'border',
      'border-bottom-color': 'background-color',
      'border-bottom-left-radius': {
        'cssPropBits': 5,
        'cssFns': [ ]
      },
      'border-bottom-right-radius': 'border-bottom-left-radius',
      'border-bottom-style': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 9 ], L[ 62 ], L[ 64 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'border-bottom-width': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 47 ], L[ 69 ] ],
        'cssFns': [ ]
      },
      'border-collapse': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 59 ], L[ 76 ] ],
        'cssFns': [ ]
      },
      'border-color': 'background-color',
      'border-left': 'border',
      'border-left-color': 'background-color',
      'border-left-style': 'border-bottom-style',
      'border-left-width': 'border-bottom-width',
      'border-radius': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 49 ] ],
        'cssFns': [ ]
      },
      'border-right': 'border',
      'border-right-color': 'background-color',
      'border-right-style': 'border-bottom-style',
      'border-right-width': 'border-bottom-width',
      'border-spacing': 'border-bottom-left-radius',
      'border-style': 'border-bottom-style',
      'border-top': 'border',
      'border-top-color': 'background-color',
      'border-top-left-radius': 'border-bottom-left-radius',
      'border-top-right-radius': 'border-bottom-left-radius',
      'border-top-style': 'border-bottom-style',
      'border-top-width': 'border-bottom-width',
      'border-width': 'border-bottom-width',
      'bottom': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 52 ] ],
        'cssFns': [ ]
      },
      'box': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 60 ], L[ 71 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'box-shadow': {
        'cssPropBits': 7,
        'cssLitGroup': [ L[ 0 ], L[ 48 ], L[ 64 ], L[ 71 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'box-sizing': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 25 ] ],
        'cssFns': [ ]
      },
      'caption-side': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 31 ] ],
        'cssFns': [ ]
      },
      'clear': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 42 ], L[ 54 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'clip': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 52 ] ],
        'cssFns': [ 'rect()' ]
      },
      'color': 'background-color',
      'content': {
        'cssPropBits': 8,
        'cssLitGroup': [ L[ 71 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'cue': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ ]
      },
      'cue-after': 'cue',
      'cue-before': 'cue',
      'cursor': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 1 ], L[ 48 ], L[ 52 ] ],
        'cssFns': [ ]
      },
      'direction': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 43 ] ],
        'cssFns': [ ]
      },
      'display': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 4 ], L[ 6 ], L[ 20 ], L[ 52 ], L[ 67 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'display-extras': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 67 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'display-inside': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 20 ], L[ 52 ] ],
        'cssFns': [ ]
      },
      'display-outside': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 4 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'elevation': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 15 ] ],
        'cssFns': [ ]
      },
      'empty-cells': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 38 ] ],
        'cssFns': [ ]
      },
      'filter': {
        'cssPropBits': 0,
        'cssFns': [ 'alpha()' ]
      },
      'float': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 42 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'font': {
        'cssPropBits': 73,
        'cssLitGroup': [ L[ 3 ], L[ 8 ], L[ 13 ], L[ 16 ], L[ 41 ], L[ 48 ], L[
            49 ], L[ 69 ], L[ 72 ], L[ 77 ] ],
        'cssFns': [ ]
      },
      'font-family': {
        'cssPropBits': 72,
        'cssLitGroup': [ L[ 16 ], L[ 48 ] ],
        'cssFns': [ ]
      },
      'font-size': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 8 ], L[ 69 ] ],
        'cssFns': [ ]
      },
      'font-stretch': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 5 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'font-style': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 41 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'font-variant': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 72 ], L[ 77 ] ],
        'cssFns': [ ]
      },
      'font-weight': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 3 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'height': 'bottom',
      'left': 'bottom',
      'letter-spacing': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 72 ] ],
        'cssFns': [ ]
      },
      'line-height': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 72 ] ],
        'cssFns': [ ]
      },
      'list-style': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 2 ], L[ 40 ], L[ 57 ], L[ 71 ] ],
        'cssFns': [ 'image()', 'linear-gradient()', 'radial-gradient()',
          'repeating-linear-gradient()', 'repeating-radial-gradient()' ]
      },
      'list-style-image': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ 'image()', 'linear-gradient()', 'radial-gradient()',
          'repeating-linear-gradient()', 'repeating-radial-gradient()' ]
      },
      'list-style-position': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 40 ] ],
        'cssFns': [ ]
      },
      'list-style-type': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 2 ], L[ 57 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'margin': 'bottom',
      'margin-bottom': 'bottom',
      'margin-left': 'bottom',
      'margin-right': 'bottom',
      'margin-top': 'bottom',
      'max-height': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 52 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'max-width': 'max-height',
      'min-height': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 52 ] ],
        'cssFns': [ ]
      },
      'min-width': 'min-height',
      'opacity': {
        'cssPropBits': 1,
        'cssFns': [ ]
      },
      'outline': {
        'cssPropBits': 7,
        'cssLitGroup': [ L[ 0 ], L[ 9 ], L[ 47 ], L[ 62 ], L[ 64 ], L[ 65 ], L[
            69 ], L[ 71 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'outline-color': {
        'cssPropBits': 2,
        'cssLitGroup': [ L[ 0 ], L[ 65 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'outline-style': 'border-bottom-style',
      'outline-width': 'border-bottom-width',
      'overflow': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 52 ], L[ 62 ], L[ 75 ], L[ 80 ] ],
        'cssFns': [ ]
      },
      'overflow-wrap': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 55 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'overflow-x': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 44 ], L[ 52 ], L[ 62 ], L[ 75 ], L[ 80 ] ],
        'cssFns': [ ]
      },
      'overflow-y': 'overflow-x',
      'padding': 'opacity',
      'padding-bottom': 'opacity',
      'padding-left': 'opacity',
      'padding-right': 'opacity',
      'padding-top': 'opacity',
      'page-break-after': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 42 ], L[ 51 ], L[ 52 ], L[ 53 ] ],
        'cssFns': [ ]
      },
      'page-break-before': 'page-break-after',
      'page-break-inside': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 52 ], L[ 53 ] ],
        'cssFns': [ ]
      },
      'pause': 'border-bottom-left-radius',
      'pause-after': 'border-bottom-left-radius',
      'pause-before': 'border-bottom-left-radius',
      'perspective': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ ]
      },
      'perspective-origin': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 31 ], L[ 42 ], L[ 56 ] ],
        'cssFns': [ ]
      },
      'pitch': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 21 ], L[ 69 ] ],
        'cssFns': [ ]
      },
      'pitch-range': 'border-bottom-left-radius',
      'play-during': {
        'cssPropBits': 16,
        'cssLitGroup': [ L[ 52 ], L[ 70 ], L[ 71 ], L[ 74 ] ],
        'cssFns': [ ]
      },
      'position': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 23 ] ],
        'cssFns': [ ]
      },
      'quotes': {
        'cssPropBits': 8,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ ]
      },
      'resize': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 39 ], L[ 54 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'richness': 'border-bottom-left-radius',
      'right': 'bottom',
      'speak': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 71 ], L[ 72 ], L[ 78 ] ],
        'cssFns': [ ]
      },
      'speak-header': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 51 ], L[ 73 ] ],
        'cssFns': [ ]
      },
      'speak-numeral': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 35 ] ],
        'cssFns': [ ]
      },
      'speak-punctuation': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 58 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'speech-rate': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 14 ], L[ 69 ] ],
        'cssFns': [ ]
      },
      'stress': 'border-bottom-left-radius',
      'table-layout': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 52 ], L[ 61 ] ],
        'cssFns': [ ]
      },
      'text-align': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 42 ], L[ 56 ], L[ 66 ] ],
        'cssFns': [ ]
      },
      'text-decoration': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 19 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'text-indent': 'border-bottom-left-radius',
      'text-overflow': {
        'cssPropBits': 8,
        'cssLitGroup': [ L[ 33 ] ],
        'cssFns': [ ]
      },
      'text-shadow': 'box-shadow',
      'text-transform': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 26 ], L[ 71 ] ],
        'cssFns': [ ]
      },
      'text-wrap': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 46 ], L[ 71 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'top': 'bottom',
      'transform': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 71 ] ],
        'cssFns': [ 'matrix()', 'perspective()', 'rotate()', 'rotate3d()',
          'rotatex()', 'rotatey()', 'rotatez()', 'scale()', 'scale3d()',
          'scalex()', 'scaley()', 'scalez()', 'skew()', 'skewx()', 'skewy()',
          'translate()', 'translate3d()', 'translatex()', 'translatey()',
          'translatez()' ]
      },
      'transform-origin': 'perspective-origin',
      'transform-style': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 37 ] ],
        'cssFns': [ ]
      },
      'transition': {
        'cssPropBits': 1029,
        'cssLitGroup': [ L[ 10 ], L[ 48 ], L[ 50 ], L[ 71 ] ],
        'cssFns': [ 'cubic-bezier()', 'steps()' ]
      },
      'transition-delay': 'animation-delay',
      'transition-duration': 'animation-delay',
      'transition-property': {
        'cssPropBits': 1024,
        'cssLitGroup': [ L[ 48 ], L[ 50 ] ],
        'cssFns': [ ]
      },
      'transition-timing-function': 'animation-timing-function',
      'unicode-bidi': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 30 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'vertical-align': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 12 ], L[ 31 ] ],
        'cssFns': [ ]
      },
      'visibility': 'backface-visibility',
      'voice-family': {
        'cssPropBits': 8,
        'cssLitGroup': [ L[ 27 ], L[ 48 ] ],
        'cssFns': [ ]
      },
      'volume': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 17 ], L[ 69 ] ],
        'cssFns': [ ]
      },
      'white-space': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 22 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'width': 'min-height',
      'word-break': {
        'cssPropBits': 0,
        'cssLitGroup': [ L[ 32 ], L[ 72 ] ],
        'cssFns': [ ]
      },
      'word-spacing': 'letter-spacing',
      'word-wrap': 'overflow-wrap',
      'z-index': 'bottom',
      'zoom': 'line-height',
      'cubic-bezier()': 'animation-delay',
      'steps()': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 36 ], L[ 48 ] ],
        'cssFns': [ ]
      },
      'image()': {
        'cssPropBits': 18,
        'cssLitGroup': [ L[ 0 ], L[ 48 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'linear-gradient()': {
        'cssPropBits': 7,
        'cssLitGroup': [ L[ 0 ], L[ 31 ], L[ 42 ], L[ 48 ], L[ 79 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'radial-gradient()': {
        'cssPropBits': 7,
        'cssLitGroup': [ L[ 0 ], L[ 11 ], L[ 31 ], L[ 42 ], L[ 48 ], L[ 56 ],
          L[ 57 ] ],
        'cssFns': [ 'rgb()', 'rgba()' ]
      },
      'repeating-linear-gradient()': 'linear-gradient()',
      'repeating-radial-gradient()': 'radial-gradient()',
      'rgb()': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 48 ] ],
        'cssFns': [ ]
      },
      'rgba()': 'rgb()',
      'rect()': {
        'cssPropBits': 5,
        'cssLitGroup': [ L[ 48 ], L[ 52 ] ],
        'cssFns': [ ]
      },
      'alpha()': {
        'cssPropBits': 1,
        'cssLitGroup': [ L[ 28 ] ],
        'cssFns': [ ]
      },
      'matrix()': 'animation-delay',
      'perspective()': 'border-bottom-left-radius',
      'rotate()': 'border-bottom-left-radius',
      'rotate3d()': 'animation-delay',
      'rotatex()': 'border-bottom-left-radius',
      'rotatey()': 'border-bottom-left-radius',
      'rotatez()': 'border-bottom-left-radius',
      'scale()': 'animation-delay',
      'scale3d()': 'animation-delay',
      'scalex()': 'border-bottom-left-radius',
      'scaley()': 'border-bottom-left-radius',
      'scalez()': 'border-bottom-left-radius',
      'skew()': 'animation-delay',
      'skewx()': 'border-bottom-left-radius',
      'skewy()': 'border-bottom-left-radius',
      'translate()': 'animation-delay',
      'translate3d()': 'animation-delay',
      'translatex()': 'border-bottom-left-radius',
      'translatey()': 'border-bottom-left-radius',
      'translatez()': 'border-bottom-left-radius'
    };
    if (true) {
      for (var key in schema) {
        if ('string' === typeof schema[ key ] &&
          Object.hasOwnProperty.call(schema, key)) {
          schema[ key ] = schema[ schema[ key ] ];
        }
      }
    }
    return schema;
  })();
if (typeof window !== 'undefined') {
  window['cssSchema'] = cssSchema;
}
;
// Copyright Google Inc.
// Licensed under the Apache Licence Version 2.0
// Autogenerated at Wed Feb 26 17:25:10 PST 2014
// @overrides window
// @provides html4
var html4 = {};
html4.atype = {
  'NONE': 0,
  'URI': 1,
  'URI_FRAGMENT': 11,
  'SCRIPT': 2,
  'STYLE': 3,
  'HTML': 12,
  'ID': 4,
  'IDREF': 5,
  'IDREFS': 6,
  'GLOBAL_NAME': 7,
  'LOCAL_NAME': 8,
  'CLASSES': 9,
  'FRAME_TARGET': 10,
  'MEDIA_QUERY': 13
};
html4[ 'atype' ] = html4.atype;
html4.ATTRIBS = {
  '*::class': 9,
  '*::dir': 0,
  '*::draggable': 0,
  '*::hidden': 0,
  '*::id': 4,
  '*::inert': 0,
  '*::itemprop': 0,
  '*::itemref': 6,
  '*::itemscope': 0,
  '*::lang': 0,
  '*::onblur': 2,
  '*::onchange': 2,
  '*::onclick': 2,
  '*::ondblclick': 2,
  '*::onerror': 2,
  '*::onfocus': 2,
  '*::onkeydown': 2,
  '*::onkeypress': 2,
  '*::onkeyup': 2,
  '*::onload': 2,
  '*::onmousedown': 2,
  '*::onmousemove': 2,
  '*::onmouseout': 2,
  '*::onmouseover': 2,
  '*::onmouseup': 2,
  '*::onreset': 2,
  '*::onscroll': 2,
  '*::onselect': 2,
  '*::onsubmit': 2,
  '*::ontouchcancel': 2,
  '*::ontouchend': 2,
  '*::ontouchenter': 2,
  '*::ontouchleave': 2,
  '*::ontouchmove': 2,
  '*::ontouchstart': 2,
  '*::onunload': 2,
  '*::spellcheck': 0,
  '*::style': 3,
  '*::title': 0,
  '*::translate': 0,
  'a::accesskey': 0,
  'a::coords': 0,
  'a::href': 1,
  'a::hreflang': 0,
  'a::name': 7,
  'a::onblur': 2,
  'a::onfocus': 2,
  'a::shape': 0,
  'a::tabindex': 0,
  'a::target': 10,
  'a::type': 0,
  'area::accesskey': 0,
  'area::alt': 0,
  'area::coords': 0,
  'area::href': 1,
  'area::nohref': 0,
  'area::onblur': 2,
  'area::onfocus': 2,
  'area::shape': 0,
  'area::tabindex': 0,
  'area::target': 10,
  'audio::controls': 0,
  'audio::loop': 0,
  'audio::mediagroup': 5,
  'audio::muted': 0,
  'audio::preload': 0,
  'audio::src': 1,
  'bdo::dir': 0,
  'blockquote::cite': 1,
  'br::clear': 0,
  'button::accesskey': 0,
  'button::disabled': 0,
  'button::name': 8,
  'button::onblur': 2,
  'button::onfocus': 2,
  'button::tabindex': 0,
  'button::type': 0,
  'button::value': 0,
  'canvas::height': 0,
  'canvas::width': 0,
  'caption::align': 0,
  'col::align': 0,
  'col::char': 0,
  'col::charoff': 0,
  'col::span': 0,
  'col::valign': 0,
  'col::width': 0,
  'colgroup::align': 0,
  'colgroup::char': 0,
  'colgroup::charoff': 0,
  'colgroup::span': 0,
  'colgroup::valign': 0,
  'colgroup::width': 0,
  'command::checked': 0,
  'command::command': 5,
  'command::disabled': 0,
  'command::icon': 1,
  'command::label': 0,
  'command::radiogroup': 0,
  'command::type': 0,
  'data::value': 0,
  'del::cite': 1,
  'del::datetime': 0,
  'details::open': 0,
  'dir::compact': 0,
  'div::align': 0,
  'dl::compact': 0,
  'fieldset::disabled': 0,
  'font::color': 0,
  'font::face': 0,
  'font::size': 0,
  'form::accept': 0,
  'form::action': 1,
  'form::autocomplete': 0,
  'form::enctype': 0,
  'form::method': 0,
  'form::name': 7,
  'form::novalidate': 0,
  'form::onreset': 2,
  'form::onsubmit': 2,
  'form::target': 10,
  'h1::align': 0,
  'h2::align': 0,
  'h3::align': 0,
  'h4::align': 0,
  'h5::align': 0,
  'h6::align': 0,
  'hr::align': 0,
  'hr::noshade': 0,
  'hr::size': 0,
  'hr::width': 0,
  'iframe::align': 0,
  'iframe::frameborder': 0,
  'iframe::height': 0,
  'iframe::marginheight': 0,
  'iframe::marginwidth': 0,
  'iframe::width': 0,
  'img::align': 0,
  'img::alt': 0,
  'img::border': 0,
  'img::height': 0,
  'img::hspace': 0,
  'img::ismap': 0,
  'img::name': 7,
  'img::src': 1,
  'img::usemap': 11,
  'img::vspace': 0,
  'img::width': 0,
  'input::accept': 0,
  'input::accesskey': 0,
  'input::align': 0,
  'input::alt': 0,
  'input::autocomplete': 0,
  'input::checked': 0,
  'input::disabled': 0,
  'input::inputmode': 0,
  'input::ismap': 0,
  'input::list': 5,
  'input::max': 0,
  'input::maxlength': 0,
  'input::min': 0,
  'input::multiple': 0,
  'input::name': 8,
  'input::onblur': 2,
  'input::onchange': 2,
  'input::onfocus': 2,
  'input::onselect': 2,
  'input::placeholder': 0,
  'input::readonly': 0,
  'input::required': 0,
  'input::size': 0,
  'input::src': 1,
  'input::step': 0,
  'input::tabindex': 0,
  'input::type': 0,
  'input::usemap': 11,
  'input::value': 0,
  'ins::cite': 1,
  'ins::datetime': 0,
  'label::accesskey': 0,
  'label::for': 5,
  'label::onblur': 2,
  'label::onfocus': 2,
  'legend::accesskey': 0,
  'legend::align': 0,
  'li::type': 0,
  'li::value': 0,
  'map::name': 7,
  'menu::compact': 0,
  'menu::label': 0,
  'menu::type': 0,
  'meter::high': 0,
  'meter::low': 0,
  'meter::max': 0,
  'meter::min': 0,
  'meter::value': 0,
  'ol::compact': 0,
  'ol::reversed': 0,
  'ol::start': 0,
  'ol::type': 0,
  'optgroup::disabled': 0,
  'optgroup::label': 0,
  'option::disabled': 0,
  'option::label': 0,
  'option::selected': 0,
  'option::value': 0,
  'output::for': 6,
  'output::name': 8,
  'p::align': 0,
  'pre::width': 0,
  'progress::max': 0,
  'progress::min': 0,
  'progress::value': 0,
  'q::cite': 1,
  'select::autocomplete': 0,
  'select::disabled': 0,
  'select::multiple': 0,
  'select::name': 8,
  'select::onblur': 2,
  'select::onchange': 2,
  'select::onfocus': 2,
  'select::required': 0,
  'select::size': 0,
  'select::tabindex': 0,
  'source::type': 0,
  'table::align': 0,
  'table::bgcolor': 0,
  'table::border': 0,
  'table::cellpadding': 0,
  'table::cellspacing': 0,
  'table::frame': 0,
  'table::rules': 0,
  'table::summary': 0,
  'table::width': 0,
  'tbody::align': 0,
  'tbody::char': 0,
  'tbody::charoff': 0,
  'tbody::valign': 0,
  'td::abbr': 0,
  'td::align': 0,
  'td::axis': 0,
  'td::bgcolor': 0,
  'td::char': 0,
  'td::charoff': 0,
  'td::colspan': 0,
  'td::headers': 6,
  'td::height': 0,
  'td::nowrap': 0,
  'td::rowspan': 0,
  'td::scope': 0,
  'td::valign': 0,
  'td::width': 0,
  'textarea::accesskey': 0,
  'textarea::autocomplete': 0,
  'textarea::cols': 0,
  'textarea::disabled': 0,
  'textarea::inputmode': 0,
  'textarea::name': 8,
  'textarea::onblur': 2,
  'textarea::onchange': 2,
  'textarea::onfocus': 2,
  'textarea::onselect': 2,
  'textarea::placeholder': 0,
  'textarea::readonly': 0,
  'textarea::required': 0,
  'textarea::rows': 0,
  'textarea::tabindex': 0,
  'textarea::wrap': 0,
  'tfoot::align': 0,
  'tfoot::char': 0,
  'tfoot::charoff': 0,
  'tfoot::valign': 0,
  'th::abbr': 0,
  'th::align': 0,
  'th::axis': 0,
  'th::bgcolor': 0,
  'th::char': 0,
  'th::charoff': 0,
  'th::colspan': 0,
  'th::headers': 6,
  'th::height': 0,
  'th::nowrap': 0,
  'th::rowspan': 0,
  'th::scope': 0,
  'th::valign': 0,
  'th::width': 0,
  'thead::align': 0,
  'thead::char': 0,
  'thead::charoff': 0,
  'thead::valign': 0,
  'tr::align': 0,
  'tr::bgcolor': 0,
  'tr::char': 0,
  'tr::charoff': 0,
  'tr::valign': 0,
  'track::default': 0,
  'track::kind': 0,
  'track::label': 0,
  'track::srclang': 0,
  'ul::compact': 0,
  'ul::type': 0,
  'video::controls': 0,
  'video::height': 0,
  'video::loop': 0,
  'video::mediagroup': 5,
  'video::muted': 0,
  'video::poster': 1,
  'video::preload': 0,
  'video::src': 1,
  'video::width': 0
};
html4[ 'ATTRIBS' ] = html4.ATTRIBS;
html4.eflags = {
  'OPTIONAL_ENDTAG': 1,
  'EMPTY': 2,
  'CDATA': 4,
  'RCDATA': 8,
  'UNSAFE': 16,
  'FOLDABLE': 32,
  'SCRIPT': 64,
  'STYLE': 128,
  'VIRTUALIZED': 256
};
html4[ 'eflags' ] = html4.eflags;
html4.ELEMENTS = {
  'a': 0,
  'abbr': 0,
  'acronym': 0,
  'address': 0,
  'applet': 272,
  'area': 2,
  'article': 0,
  'aside': 0,
  'audio': 0,
  'b': 0,
  'base': 274,
  'basefont': 274,
  'bdi': 0,
  'bdo': 0,
  'big': 0,
  'blockquote': 0,
  'body': 305,
  'br': 2,
  'button': 0,
  'canvas': 0,
  'caption': 0,
  'center': 0,
  'cite': 0,
  'code': 0,
  'col': 2,
  'colgroup': 1,
  'command': 2,
  'data': 0,
  'datalist': 0,
  'dd': 1,
  'del': 0,
  'details': 0,
  'dfn': 0,
  'dialog': 272,
  'dir': 0,
  'div': 0,
  'dl': 0,
  'dt': 1,
  'em': 0,
  'fieldset': 0,
  'figcaption': 0,
  'figure': 0,
  'font': 0,
  'footer': 0,
  'form': 0,
  'frame': 274,
  'frameset': 272,
  'h1': 0,
  'h2': 0,
  'h3': 0,
  'h4': 0,
  'h5': 0,
  'h6': 0,
  'head': 305,
  'header': 0,
  'hgroup': 0,
  'hr': 2,
  'html': 305,
  'i': 0,
  'iframe': 4,
  'img': 2,
  'input': 2,
  'ins': 0,
  'isindex': 274,
  'kbd': 0,
  'keygen': 274,
  'label': 0,
  'legend': 0,
  'li': 1,
  'link': 274,
  'map': 0,
  'mark': 0,
  'menu': 0,
  'meta': 274,
  'meter': 0,
  'nav': 0,
  'nobr': 0,
  'noembed': 276,
  'noframes': 276,
  'noscript': 276,
  'object': 272,
  'ol': 0,
  'optgroup': 0,
  'option': 1,
  'output': 0,
  'p': 1,
  'param': 274,
  'pre': 0,
  'progress': 0,
  'q': 0,
  's': 0,
  'samp': 0,
  'script': 84,
  'section': 0,
  'select': 0,
  'small': 0,
  'source': 2,
  'span': 0,
  'strike': 0,
  'strong': 0,
  'style': 148,
  'sub': 0,
  'summary': 0,
  'sup': 0,
  'table': 0,
  'tbody': 1,
  'td': 1,
  'textarea': 8,
  'tfoot': 1,
  'th': 1,
  'thead': 1,
  'time': 0,
  'title': 280,
  'tr': 1,
  'track': 2,
  'tt': 0,
  'u': 0,
  'ul': 0,
  'var': 0,
  'video': 0,
  'wbr': 2
};
html4[ 'ELEMENTS' ] = html4.ELEMENTS;
html4.ELEMENT_DOM_INTERFACES = {
  'a': 'HTMLAnchorElement',
  'abbr': 'HTMLElement',
  'acronym': 'HTMLElement',
  'address': 'HTMLElement',
  'applet': 'HTMLAppletElement',
  'area': 'HTMLAreaElement',
  'article': 'HTMLElement',
  'aside': 'HTMLElement',
  'audio': 'HTMLAudioElement',
  'b': 'HTMLElement',
  'base': 'HTMLBaseElement',
  'basefont': 'HTMLBaseFontElement',
  'bdi': 'HTMLElement',
  'bdo': 'HTMLElement',
  'big': 'HTMLElement',
  'blockquote': 'HTMLQuoteElement',
  'body': 'HTMLBodyElement',
  'br': 'HTMLBRElement',
  'button': 'HTMLButtonElement',
  'canvas': 'HTMLCanvasElement',
  'caption': 'HTMLTableCaptionElement',
  'center': 'HTMLElement',
  'cite': 'HTMLElement',
  'code': 'HTMLElement',
  'col': 'HTMLTableColElement',
  'colgroup': 'HTMLTableColElement',
  'command': 'HTMLCommandElement',
  'data': 'HTMLElement',
  'datalist': 'HTMLDataListElement',
  'dd': 'HTMLElement',
  'del': 'HTMLModElement',
  'details': 'HTMLDetailsElement',
  'dfn': 'HTMLElement',
  'dialog': 'HTMLDialogElement',
  'dir': 'HTMLDirectoryElement',
  'div': 'HTMLDivElement',
  'dl': 'HTMLDListElement',
  'dt': 'HTMLElement',
  'em': 'HTMLElement',
  'fieldset': 'HTMLFieldSetElement',
  'figcaption': 'HTMLElement',
  'figure': 'HTMLElement',
  'font': 'HTMLFontElement',
  'footer': 'HTMLElement',
  'form': 'HTMLFormElement',
  'frame': 'HTMLFrameElement',
  'frameset': 'HTMLFrameSetElement',
  'h1': 'HTMLHeadingElement',
  'h2': 'HTMLHeadingElement',
  'h3': 'HTMLHeadingElement',
  'h4': 'HTMLHeadingElement',
  'h5': 'HTMLHeadingElement',
  'h6': 'HTMLHeadingElement',
  'head': 'HTMLHeadElement',
  'header': 'HTMLElement',
  'hgroup': 'HTMLElement',
  'hr': 'HTMLHRElement',
  'html': 'HTMLHtmlElement',
  'i': 'HTMLElement',
  'iframe': 'HTMLIFrameElement',
  'img': 'HTMLImageElement',
  'input': 'HTMLInputElement',
  'ins': 'HTMLModElement',
  'isindex': 'HTMLUnknownElement',
  'kbd': 'HTMLElement',
  'keygen': 'HTMLKeygenElement',
  'label': 'HTMLLabelElement',
  'legend': 'HTMLLegendElement',
  'li': 'HTMLLIElement',
  'link': 'HTMLLinkElement',
  'map': 'HTMLMapElement',
  'mark': 'HTMLElement',
  'menu': 'HTMLMenuElement',
  'meta': 'HTMLMetaElement',
  'meter': 'HTMLMeterElement',
  'nav': 'HTMLElement',
  'nobr': 'HTMLElement',
  'noembed': 'HTMLElement',
  'noframes': 'HTMLElement',
  'noscript': 'HTMLElement',
  'object': 'HTMLObjectElement',
  'ol': 'HTMLOListElement',
  'optgroup': 'HTMLOptGroupElement',
  'option': 'HTMLOptionElement',
  'output': 'HTMLOutputElement',
  'p': 'HTMLParagraphElement',
  'param': 'HTMLParamElement',
  'pre': 'HTMLPreElement',
  'progress': 'HTMLProgressElement',
  'q': 'HTMLQuoteElement',
  's': 'HTMLElement',
  'samp': 'HTMLElement',
  'script': 'HTMLScriptElement',
  'section': 'HTMLElement',
  'select': 'HTMLSelectElement',
  'small': 'HTMLElement',
  'source': 'HTMLSourceElement',
  'span': 'HTMLSpanElement',
  'strike': 'HTMLElement',
  'strong': 'HTMLElement',
  'style': 'HTMLStyleElement',
  'sub': 'HTMLElement',
  'summary': 'HTMLElement',
  'sup': 'HTMLElement',
  'table': 'HTMLTableElement',
  'tbody': 'HTMLTableSectionElement',
  'td': 'HTMLTableDataCellElement',
  'textarea': 'HTMLTextAreaElement',
  'tfoot': 'HTMLTableSectionElement',
  'th': 'HTMLTableHeaderCellElement',
  'thead': 'HTMLTableSectionElement',
  'time': 'HTMLTimeElement',
  'title': 'HTMLTitleElement',
  'tr': 'HTMLTableRowElement',
  'track': 'HTMLTrackElement',
  'tt': 'HTMLElement',
  'u': 'HTMLElement',
  'ul': 'HTMLUListElement',
  'var': 'HTMLElement',
  'video': 'HTMLVideoElement',
  'wbr': 'HTMLElement'
};
html4[ 'ELEMENT_DOM_INTERFACES' ] = html4.ELEMENT_DOM_INTERFACES;
html4.ueffects = {
  'NOT_LOADED': 0,
  'SAME_DOCUMENT': 1,
  'NEW_DOCUMENT': 2
};
html4[ 'ueffects' ] = html4.ueffects;
html4.URIEFFECTS = {
  'a::href': 2,
  'area::href': 2,
  'audio::src': 1,
  'blockquote::cite': 0,
  'command::icon': 1,
  'del::cite': 0,
  'form::action': 2,
  'img::src': 1,
  'input::src': 1,
  'ins::cite': 0,
  'q::cite': 0,
  'video::poster': 1,
  'video::src': 1
};
html4[ 'URIEFFECTS' ] = html4.URIEFFECTS;
html4.ltypes = {
  'UNSANDBOXED': 2,
  'SANDBOXED': 1,
  'DATA': 0
};
html4[ 'ltypes' ] = html4.ltypes;
html4.LOADERTYPES = {
  'a::href': 2,
  'area::href': 2,
  'audio::src': 2,
  'blockquote::cite': 2,
  'command::icon': 1,
  'del::cite': 2,
  'form::action': 2,
  'img::src': 1,
  'input::src': 1,
  'ins::cite': 2,
  'q::cite': 2,
  'video::poster': 1,
  'video::src': 2
};
html4[ 'LOADERTYPES' ] = html4.LOADERTYPES;
// export for Closure Compiler
if (typeof window !== 'undefined') {
  window['html4'] = html4;
}
;
// Copyright (C) 2008-2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Client-side HTML schema interface library.
 *
 * @author kpreid@switchb.org
 * @requires cajaVM, html4
 * @provides HtmlSchema, htmlSchema
 * @overrides window
 */

var HtmlSchema = (function() {
  'use strict';

  function HtmlSchema_(html4) {
    var ELEMENTS = html4.ELEMENTS;
    var ELEMENT_DOM_INTERFACES = html4.ELEMENT_DOM_INTERFACES;
    var ATTRIBS = html4.ATTRIBS;
    var URIEFFECTS = html4.URIEFFECTS;
    var LOADERTYPES = html4.LOADERTYPES;
    var OPTIONAL_ENDTAG = html4.eflags.OPTIONAL_ENDTAG;
    var EMPTY = html4.eflags.EMPTY;
    var CDATA = html4.eflags.CDATA;
    var RCDATA = html4.eflags.RCDATA;
    var UNSAFE = html4.eflags.UNSAFE;
    var VIRTUALIZED = html4.eflags.VIRTUALIZED;
    var unknownElementInterface = "HTMLUnknownElement";

    var hop = Object.prototype.hasOwnProperty;

    var elemCache = {};
    var attrCache = {};
    var scriptInterfacesCache;

    var unknownElementEntry = cajaVM.def({
      allowed: false,
      isVirtualizedElementName: false,
      shouldVirtualize: true,
      empty: false,
      optionalEndTag: false,
      contentIsCDATA: false,
      contentIsRCDATA: false,
      domInterface: unknownElementInterface
    });

    var unknownAttributeEntry = cajaVM.def({
      type: undefined,
      loaderType: undefined,
      uriEffect: undefined
    });

    function makeAttributeFromSchema(attribKey) {
      return cajaVM.def({
        type: ATTRIBS[attribKey],
        loaderType: LOADERTYPES[attribKey],
        uriEffect: URIEFFECTS[attribKey]
      });
    }

    var VIRTUALIZED_ELEMENT_NAME_RE = /^caja-v-(.*)$/i;
    var VIRTUALIZED_ELEMENT_PREFIX = 'caja-v-';
    function isVirtualizedElementName(elementName) {
      return VIRTUALIZED_ELEMENT_NAME_RE.test(elementName);
    }
    function realToVirtualElementName(elementName) {
      var match = VIRTUALIZED_ELEMENT_NAME_RE.exec(elementName);
      return match ? match[1] : elementName;
    }
    function virtualToRealElementName(elementName) {
      if (htmlSchema.element(elementName).shouldVirtualize) {
        return VIRTUALIZED_ELEMENT_PREFIX + elementName;
      } else {
        return elementName;
      }
    }

    var htmlSchema = cajaVM.def({
      // may receive virtualized element names
      element: function(elementName) {
        if (typeof elementName !== 'string') {
          throw new Error('non-string ' + elementName + ' got to htmlSchema');
        }
        elementName = elementName.toLowerCase();

        var cacheKey = elementName + '$';
        if (cacheKey in elemCache) {
          return elemCache[cacheKey];
        } else {
          var entry;
          if (Object.prototype.hasOwnProperty.call(ELEMENTS, elementName)) {
            var eflags = ELEMENTS[elementName];
            entry = cajaVM.def({
              allowed: !(eflags & UNSAFE),
              isVirtualizedElementName: false,
              shouldVirtualize: !!(eflags & VIRTUALIZED),
              empty: !!(eflags & EMPTY),
              optionalEndTag: !!(eflags & OPTIONAL_ENDTAG),
              contentIsCDATA: !!(eflags & CDATA),
              contentIsRCDATA: !!(eflags & RCDATA),
              domInterface: ELEMENT_DOM_INTERFACES[elementName]
            });
          } else if (isVirtualizedElementName(elementName)) {
            var unvirtEntry =
                htmlSchema.element(realToVirtualElementName(elementName));
            entry = cajaVM.def({
              allowed: true,
              isVirtualizedElementName: true,
              shouldVirtualize: false,
              empty: false,
              optionalEndTag: false,
              contentIsCDATA: false,
              contentIsRCDATA: false,
              domInterface: unvirtEntry.domInterface
            });
          } else {
            entry = unknownElementEntry;
          }
          return elemCache[cacheKey] = entry;
        }
      },

      // should not receive virtualized attribute names
      attribute: function(elementName, attribName) {
        if (typeof elementName !== 'string') {
          throw new Error('Domado internal: ' +
              'non-string ' + elementName + ' got to HtmlSchema');
        }
        if (typeof attribName !== 'string') {
          throw new Error('Domado internal: ' +
              'non-string ' + attribName + ' got to HtmlSchema');
        }
        elementName = elementName.toLowerCase();
        attribName = attribName.toLowerCase();

        var attribKey = elementName + '::' + attribName;
        if (attribKey in attrCache) {
          return attrCache[attribKey];
        } else {
          var entry;
          if (ATTRIBS.hasOwnProperty(attribKey)) {
            entry = makeAttributeFromSchema(attribKey);
          } else {
            var wildKey = '*::' + attribName;
            if (ATTRIBS.hasOwnProperty(wildKey)) {
              entry = makeAttributeFromSchema(wildKey);
            } else {
              entry = unknownAttributeEntry;
            }
          }
          return attrCache[attribKey] = entry;
        }
      },

      isVirtualizedElementName: isVirtualizedElementName,
      realToVirtualElementName: realToVirtualElementName,
      virtualToRealElementName: virtualToRealElementName,

      getAllKnownScriptInterfaces: function() {
        if (!scriptInterfacesCache) {
          var table = {};
          for (var el in ELEMENT_DOM_INTERFACES) {
            if (hop.call(ELEMENT_DOM_INTERFACES, el)) {
              table[ELEMENT_DOM_INTERFACES[el]] = true;
            }
          }
          scriptInterfacesCache = cajaVM.def(Object.getOwnPropertyNames(table));
        }
        return scriptInterfacesCache;
      }
    });

    return htmlSchema;
  }

  return HtmlSchema_;
})();

// TODO(kpreid): Refactor this into parameters.
var htmlSchema = new HtmlSchema(html4);

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['HtmlSchema'] = HtmlSchema;
  window['htmlSchema'] = htmlSchema;
}

;
// Copyright (C) 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * An HTML sanitizer that can satisfy a variety of security policies.
 *
 * <p>
 * The HTML sanitizer is built around a SAX parser and HTML element and
 * attributes schemas.
 *
 * If the cssparser is loaded, inline styles are sanitized using the
 * css property and value schemas.  Else they are remove during
 * sanitization.
 *
 * If it exists, uses parseCssDeclarations, sanitizeCssProperty,  cssSchema
 *
 * @author mikesamuel@gmail.com
 * @author jasvir@gmail.com
 * \@requires html4, URI
 * \@overrides window
 * \@provides html, html_sanitize
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * \@namespace
 */
var html = (function(html4) {

  // For closure compiler
  var parseCssDeclarations, sanitizeCssProperty, cssSchema;
  if ('undefined' !== typeof window) {
    parseCssDeclarations = window['parseCssDeclarations'];
    sanitizeCssProperty = window['sanitizeCssProperty'];
    cssSchema = window['cssSchema'];
  }

  // The keys of this object must be 'quoted' or JSCompiler will mangle them!
  // This is a partial list -- lookupEntity() uses the host browser's parser
  // (when available) to implement full entity lookup.
  // Note that entities are in general case-sensitive; the uppercase ones are
  // explicitly defined by HTML5 (presumably as compatibility).
  var ENTITIES = {
    'lt': '<',
    'LT': '<',
    'gt': '>',
    'GT': '>',
    'amp': '&',
    'AMP': '&',
    'quot': '"',
    'apos': '\'',
    'nbsp': '\240'
  };

  // Patterns for types of entity/character reference names.
  var decimalEscapeRe = /^#(\d+)$/;
  var hexEscapeRe = /^#x([0-9A-Fa-f]+)$/;
  // contains every entity per http://www.w3.org/TR/2011/WD-html5-20110113/named-character-references.html
  var safeEntityNameRe = /^[A-Za-z][A-za-z0-9]+$/;
  // Used as a hook to invoke the browser's entity parsing. <textarea> is used
  // because its content is parsed for entities but not tags.
  // TODO(kpreid): This retrieval is a kludge and leads to silent loss of
  // functionality if the document isn't available.
  var entityLookupElement =
      ('undefined' !== typeof window && window['document'])
          ? window['document'].createElement('textarea') : null;
  /**
   * Decodes an HTML entity.
   *
   * {\@updoc
   * $ lookupEntity('lt')
   * # '<'
   * $ lookupEntity('GT')
   * # '>'
   * $ lookupEntity('amp')
   * # '&'
   * $ lookupEntity('nbsp')
   * # '\xA0'
   * $ lookupEntity('apos')
   * # "'"
   * $ lookupEntity('quot')
   * # '"'
   * $ lookupEntity('#xa')
   * # '\n'
   * $ lookupEntity('#10')
   * # '\n'
   * $ lookupEntity('#x0a')
   * # '\n'
   * $ lookupEntity('#010')
   * # '\n'
   * $ lookupEntity('#x00A')
   * # '\n'
   * $ lookupEntity('Pi')      // Known failure
   * # '\u03A0'
   * $ lookupEntity('pi')      // Known failure
   * # '\u03C0'
   * }
   *
   * @param {string} name the content between the '&' and the ';'.
   * @return {string} a single unicode code-point as a string.
   */
  function lookupEntity(name) {
    // TODO: entity lookup as specified by HTML5 actually depends on the
    // presence of the ";".
    if (ENTITIES.hasOwnProperty(name)) { return ENTITIES[name]; }
    var m = name.match(decimalEscapeRe);
    if (m) {
      return String.fromCharCode(parseInt(m[1], 10));
    } else if (!!(m = name.match(hexEscapeRe))) {
      return String.fromCharCode(parseInt(m[1], 16));
    } else if (entityLookupElement && safeEntityNameRe.test(name)) {
      entityLookupElement.innerHTML = '&' + name + ';';
      var text = entityLookupElement.textContent;
      ENTITIES[name] = text;
      return text;
    } else {
      return '&' + name + ';';
    }
  }

  function decodeOneEntity(_, name) {
    return lookupEntity(name);
  }

  var nulRe = /\0/g;
  function stripNULs(s) {
    return s.replace(nulRe, '');
  }

  var ENTITY_RE_1 = /&(#[0-9]+|#[xX][0-9A-Fa-f]+|\w+);/g;
  var ENTITY_RE_2 = /^(#[0-9]+|#[xX][0-9A-Fa-f]+|\w+);/;
  /**
   * The plain text of a chunk of HTML CDATA which possibly containing.
   *
   * {\@updoc
   * $ unescapeEntities('')
   * # ''
   * $ unescapeEntities('hello World!')
   * # 'hello World!'
   * $ unescapeEntities('1 &lt; 2 &amp;&AMP; 4 &gt; 3&#10;')
   * # '1 < 2 && 4 > 3\n'
   * $ unescapeEntities('&lt;&lt <- unfinished entity&gt;')
   * # '<&lt <- unfinished entity>'
   * $ unescapeEntities('/foo?bar=baz&copy=true')  // & often unescaped in URLS
   * # '/foo?bar=baz&copy=true'
   * $ unescapeEntities('pi=&pi;&#x3c0;, Pi=&Pi;\u03A0') // FIXME: known failure
   * # 'pi=\u03C0\u03c0, Pi=\u03A0\u03A0'
   * }
   *
   * @param {string} s a chunk of HTML CDATA.  It must not start or end inside
   *     an HTML entity.
   */
  function unescapeEntities(s) {
    return s.replace(ENTITY_RE_1, decodeOneEntity);
  }

  var ampRe = /&/g;
  var looseAmpRe = /&([^a-z#]|#(?:[^0-9x]|x(?:[^0-9a-f]|$)|$)|$)/gi;
  var ltRe = /[<]/g;
  var gtRe = />/g;
  var quotRe = /\"/g;

  /**
   * Escapes HTML special characters in attribute values.
   *
   * {\@updoc
   * $ escapeAttrib('')
   * # ''
   * $ escapeAttrib('"<<&==&>>"')  // Do not just escape the first occurrence.
   * # '&#34;&lt;&lt;&amp;&#61;&#61;&amp;&gt;&gt;&#34;'
   * $ escapeAttrib('Hello <World>!')
   * # 'Hello &lt;World&gt;!'
   * }
   */
  function escapeAttrib(s) {
    return ('' + s).replace(ampRe, '&amp;').replace(ltRe, '&lt;')
        .replace(gtRe, '&gt;').replace(quotRe, '&#34;');
  }

  /**
   * Escape entities in RCDATA that can be escaped without changing the meaning.
   * {\@updoc
   * $ normalizeRCData('1 < 2 &&amp; 3 > 4 &amp;& 5 &lt; 7&8')
   * # '1 &lt; 2 &amp;&amp; 3 &gt; 4 &amp;&amp; 5 &lt; 7&amp;8'
   * }
   */
  function normalizeRCData(rcdata) {
    return rcdata
        .replace(looseAmpRe, '&amp;$1')
        .replace(ltRe, '&lt;')
        .replace(gtRe, '&gt;');
  }

  // TODO(felix8a): validate sanitizer regexs against the HTML5 grammar at
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html

  // We initially split input so that potentially meaningful characters
  // like '<' and '>' are separate tokens, using a fast dumb process that
  // ignores quoting.  Then we walk that token stream, and when we see a
  // '<' that's the start of a tag, we use ATTR_RE to extract tag
  // attributes from the next token.  That token will never have a '>'
  // character.  However, it might have an unbalanced quote character, and
  // when we see that, we combine additional tokens to balance the quote.

  var ATTR_RE = new RegExp(
    '^\\s*' +
    '([-.:\\w]+)' +             // 1 = Attribute name
    '(?:' + (
      '\\s*(=)\\s*' +           // 2 = Is there a value?
      '(' + (                   // 3 = Attribute value
        // TODO(felix8a): maybe use backref to match quotes
        '(\")[^\"]*(\"|$)' +    // 4, 5 = Double-quoted string
        '|' +
        '(\')[^\']*(\'|$)' +    // 6, 7 = Single-quoted string
        '|' +
        // Positive lookahead to prevent interpretation of
        // <foo a= b=c> as <foo a='b=c'>
        // TODO(felix8a): might be able to drop this case
        '(?=[a-z][-\\w]*\\s*=)' +
        '|' +
        // Unquoted value that isn't an attribute name
        // (since we didn't match the positive lookahead above)
        '[^\"\'\\s]*' ) +
      ')' ) +
    ')?',
    'i');

  // false on IE<=8, true on most other browsers
  var splitWillCapture = ('a,b'.split(/(,)/).length === 3);

  // bitmask for tags with special parsing, like <script> and <textarea>
  var EFLAGS_TEXT = html4.eflags['CDATA'] | html4.eflags['RCDATA'];

  /**
   * Given a SAX-like event handler, produce a function that feeds those
   * events and a parameter to the event handler.
   *
   * The event handler has the form:{@code
   * {
   *   // Name is an upper-case HTML tag name.  Attribs is an array of
   *   // alternating upper-case attribute names, and attribute values.  The
   *   // attribs array is reused by the parser.  Param is the value passed to
   *   // the saxParser.
   *   startTag: function (name, attribs, param) { ... },
   *   endTag:   function (name, param) { ... },
   *   pcdata:   function (text, param) { ... },
   *   rcdata:   function (text, param) { ... },
   *   cdata:    function (text, param) { ... },
   *   startDoc: function (param) { ... },
   *   endDoc:   function (param) { ... }
   * }}
   *
   * @param {Object} handler a record containing event handlers.
   * @return {function(string, Object)} A function that takes a chunk of HTML
   *     and a parameter.  The parameter is passed on to the handler methods.
   */
  function makeSaxParser(handler) {
    // Accept quoted or unquoted keys (Closure compat)
    var hcopy = {
      cdata: handler.cdata || handler['cdata'],
      comment: handler.comment || handler['comment'],
      endDoc: handler.endDoc || handler['endDoc'],
      endTag: handler.endTag || handler['endTag'],
      pcdata: handler.pcdata || handler['pcdata'],
      rcdata: handler.rcdata || handler['rcdata'],
      startDoc: handler.startDoc || handler['startDoc'],
      startTag: handler.startTag || handler['startTag']
    };
    return function(htmlText, param) {
      return parse(htmlText, hcopy, param);
    };
  }

  // Parsing strategy is to split input into parts that might be lexically
  // meaningful (every ">" becomes a separate part), and then recombine
  // parts if we discover they're in a different context.

  // TODO(felix8a): Significant performance regressions from -legacy,
  // tested on
  //    Chrome 18.0
  //    Firefox 11.0
  //    IE 6, 7, 8, 9
  //    Opera 11.61
  //    Safari 5.1.3
  // Many of these are unusual patterns that are linearly slower and still
  // pretty fast (eg 1ms to 5ms), so not necessarily worth fixing.

  // TODO(felix8a): "<script> && && && ... <\/script>" is slower on all
  // browsers.  The hotspot is htmlSplit.

  // TODO(felix8a): "<p title='>>>>...'><\/p>" is slower on all browsers.
  // This is partly htmlSplit, but the hotspot is parseTagAndAttrs.

  // TODO(felix8a): "<a><\/a><a><\/a>..." is slower on IE9.
  // "<a>1<\/a><a>1<\/a>..." is faster, "<a><\/a>2<a><\/a>2..." is faster.

  // TODO(felix8a): "<p<p<p..." is slower on IE[6-8]

  var continuationMarker = {};
  function parse(htmlText, handler, param) {
    var m, p, tagName;
    var parts = htmlSplit(htmlText);
    var state = {
      noMoreGT: false,
      noMoreEndComments: false
    };
    parseCPS(handler, parts, 0, state, param);
  }

  function continuationMaker(h, parts, initial, state, param) {
    return function () {
      parseCPS(h, parts, initial, state, param);
    };
  }

  function parseCPS(h, parts, initial, state, param) {
    try {
      if (h.startDoc && initial == 0) { h.startDoc(param); }
      var m, p, tagName;
      for (var pos = initial, end = parts.length; pos < end;) {
        var current = parts[pos++];
        var next = parts[pos];
        switch (current) {
        case '&':
          if (ENTITY_RE_2.test(next)) {
            if (h.pcdata) {
              h.pcdata('&' + next, param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
            pos++;
          } else {
            if (h.pcdata) { h.pcdata("&amp;", param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          }
          break;
        case '<\/':
          if ((m = /^([-\w:]+)[^\'\"]*/.exec(next))) {
            if (m[0].length === next.length && parts[pos + 1] === '>') {
              // fast case, no attribute parsing needed
              pos += 2;
              tagName = m[1].toLowerCase();
              if (h.endTag) {
                h.endTag(tagName, param, continuationMarker,
                  continuationMaker(h, parts, pos, state, param));
              }
            } else {
              // slow case, need to parse attributes
              // TODO(felix8a): do we really care about misparsing this?
              pos = parseEndTag(
                parts, pos, h, param, continuationMarker, state);
            }
          } else {
            if (h.pcdata) {
              h.pcdata('&lt;/', param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          }
          break;
        case '<':
          if (m = /^([-\w:]+)\s*\/?/.exec(next)) {
            if (m[0].length === next.length && parts[pos + 1] === '>') {
              // fast case, no attribute parsing needed
              pos += 2;
              tagName = m[1].toLowerCase();
              if (h.startTag) {
                h.startTag(tagName, [], param, continuationMarker,
                  continuationMaker(h, parts, pos, state, param));
              }
              // tags like <script> and <textarea> have special parsing
              var eflags = html4.ELEMENTS[tagName];
              if (eflags & EFLAGS_TEXT) {
                var tag = { name: tagName, next: pos, eflags: eflags };
                pos = parseText(
                  parts, tag, h, param, continuationMarker, state);
              }
            } else {
              // slow case, need to parse attributes
              pos = parseStartTag(
                parts, pos, h, param, continuationMarker, state);
            }
          } else {
            if (h.pcdata) {
              h.pcdata('&lt;', param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          }
          break;
        case '<\!--':
          // The pathological case is n copies of '<\!--' without '-->', and
          // repeated failure to find '-->' is quadratic.  We avoid that by
          // remembering when search for '-->' fails.
          if (!state.noMoreEndComments) {
            // A comment <\!--x--> is split into three tokens:
            //   '<\!--', 'x--', '>'
            // We want to find the next '>' token that has a preceding '--'.
            // pos is at the 'x--'.
            for (p = pos + 1; p < end; p++) {
              if (parts[p] === '>' && /--$/.test(parts[p - 1])) { break; }
            }
            if (p < end) {
              if (h.comment) {
                var comment = parts.slice(pos, p).join('');
                h.comment(
                  comment.substr(0, comment.length - 2), param,
                  continuationMarker,
                  continuationMaker(h, parts, p + 1, state, param));
              }
              pos = p + 1;
            } else {
              state.noMoreEndComments = true;
            }
          }
          if (state.noMoreEndComments) {
            if (h.pcdata) {
              h.pcdata('&lt;!--', param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          }
          break;
        case '<\!':
          if (!/^\w/.test(next)) {
            if (h.pcdata) {
              h.pcdata('&lt;!', param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          } else {
            // similar to noMoreEndComment logic
            if (!state.noMoreGT) {
              for (p = pos + 1; p < end; p++) {
                if (parts[p] === '>') { break; }
              }
              if (p < end) {
                pos = p + 1;
              } else {
                state.noMoreGT = true;
              }
            }
            if (state.noMoreGT) {
              if (h.pcdata) {
                h.pcdata('&lt;!', param, continuationMarker,
                  continuationMaker(h, parts, pos, state, param));
              }
            }
          }
          break;
        case '<?':
          // similar to noMoreEndComment logic
          if (!state.noMoreGT) {
            for (p = pos + 1; p < end; p++) {
              if (parts[p] === '>') { break; }
            }
            if (p < end) {
              pos = p + 1;
            } else {
              state.noMoreGT = true;
            }
          }
          if (state.noMoreGT) {
            if (h.pcdata) {
              h.pcdata('&lt;?', param, continuationMarker,
                continuationMaker(h, parts, pos, state, param));
            }
          }
          break;
        case '>':
          if (h.pcdata) {
            h.pcdata("&gt;", param, continuationMarker,
              continuationMaker(h, parts, pos, state, param));
          }
          break;
        case '':
          break;
        default:
          if (h.pcdata) {
            h.pcdata(current, param, continuationMarker,
              continuationMaker(h, parts, pos, state, param));
          }
          break;
        }
      }
      if (h.endDoc) { h.endDoc(param); }
    } catch (e) {
      if (e !== continuationMarker) { throw e; }
    }
  }

  // Split str into parts for the html parser.
  function htmlSplit(str) {
    // can't hoist this out of the function because of the re.exec loop.
    var re = /(<\/|<\!--|<[!?]|[&<>])/g;
    str += '';
    if (splitWillCapture) {
      return str.split(re);
    } else {
      var parts = [];
      var lastPos = 0;
      var m;
      while ((m = re.exec(str)) !== null) {
        parts.push(str.substring(lastPos, m.index));
        parts.push(m[0]);
        lastPos = m.index + m[0].length;
      }
      parts.push(str.substring(lastPos));
      return parts;
    }
  }

  function parseEndTag(parts, pos, h, param, continuationMarker, state) {
    var tag = parseTagAndAttrs(parts, pos);
    // drop unclosed tags
    if (!tag) { return parts.length; }
    if (h.endTag) {
      h.endTag(tag.name, param, continuationMarker,
        continuationMaker(h, parts, pos, state, param));
    }
    return tag.next;
  }

  function parseStartTag(parts, pos, h, param, continuationMarker, state) {
    var tag = parseTagAndAttrs(parts, pos);
    // drop unclosed tags
    if (!tag) { return parts.length; }
    if (h.startTag) {
      h.startTag(tag.name, tag.attrs, param, continuationMarker,
        continuationMaker(h, parts, tag.next, state, param));
    }
    // tags like <script> and <textarea> have special parsing
    if (tag.eflags & EFLAGS_TEXT) {
      return parseText(parts, tag, h, param, continuationMarker, state);
    } else {
      return tag.next;
    }
  }

  var endTagRe = {};

  // Tags like <script> and <textarea> are flagged as CDATA or RCDATA,
  // which means everything is text until we see the correct closing tag.
  function parseText(parts, tag, h, param, continuationMarker, state) {
    var end = parts.length;
    if (!endTagRe.hasOwnProperty(tag.name)) {
      endTagRe[tag.name] = new RegExp('^' + tag.name + '(?:[\\s\\/]|$)', 'i');
    }
    var re = endTagRe[tag.name];
    var first = tag.next;
    var p = tag.next + 1;
    for (; p < end; p++) {
      if (parts[p - 1] === '<\/' && re.test(parts[p])) { break; }
    }
    if (p < end) { p -= 1; }
    var buf = parts.slice(first, p).join('');
    if (tag.eflags & html4.eflags['CDATA']) {
      if (h.cdata) {
        h.cdata(buf, param, continuationMarker,
          continuationMaker(h, parts, p, state, param));
      }
    } else if (tag.eflags & html4.eflags['RCDATA']) {
      if (h.rcdata) {
        h.rcdata(normalizeRCData(buf), param, continuationMarker,
          continuationMaker(h, parts, p, state, param));
      }
    } else {
      throw new Error('bug');
    }
    return p;
  }

  // at this point, parts[pos-1] is either "<" or "<\/".
  function parseTagAndAttrs(parts, pos) {
    var m = /^([-\w:]+)/.exec(parts[pos]);
    var tag = {};
    tag.name = m[1].toLowerCase();
    tag.eflags = html4.ELEMENTS[tag.name];
    var buf = parts[pos].substr(m[0].length);
    // Find the next '>'.  We optimistically assume this '>' is not in a
    // quoted context, and further down we fix things up if it turns out to
    // be quoted.
    var p = pos + 1;
    var end = parts.length;
    for (; p < end; p++) {
      if (parts[p] === '>') { break; }
      buf += parts[p];
    }
    if (end <= p) { return void 0; }
    var attrs = [];
    while (buf !== '') {
      m = ATTR_RE.exec(buf);
      if (!m) {
        // No attribute found: skip garbage
        buf = buf.replace(/^[\s\S][^a-z\s]*/, '');

      } else if ((m[4] && !m[5]) || (m[6] && !m[7])) {
        // Unterminated quote: slurp to the next unquoted '>'
        var quote = m[4] || m[6];
        var sawQuote = false;
        var abuf = [buf, parts[p++]];
        for (; p < end; p++) {
          if (sawQuote) {
            if (parts[p] === '>') { break; }
          } else if (0 <= parts[p].indexOf(quote)) {
            sawQuote = true;
          }
          abuf.push(parts[p]);
        }
        // Slurp failed: lose the garbage
        if (end <= p) { break; }
        // Otherwise retry attribute parsing
        buf = abuf.join('');
        continue;

      } else {
        // We have an attribute
        var aName = m[1].toLowerCase();
        var aValue = m[2] ? decodeValue(m[3]) : '';
        attrs.push(aName, aValue);
        buf = buf.substr(m[0].length);
      }
    }
    tag.attrs = attrs;
    tag.next = p + 1;
    return tag;
  }

  function decodeValue(v) {
    var q = v.charCodeAt(0);
    if (q === 0x22 || q === 0x27) { // " or '
      v = v.substr(1, v.length - 2);
    }
    return unescapeEntities(stripNULs(v));
  }

  /**
   * Returns a function that strips unsafe tags and attributes from html.
   * @param {function(string, Array.<string>): ?Array.<string>} tagPolicy
   *     A function that takes (tagName, attribs[]), where tagName is a key in
   *     html4.ELEMENTS and attribs is an array of alternating attribute names
   *     and values.  It should return a record (as follows), or null to delete
   *     the element.  It's okay for tagPolicy to modify the attribs array,
   *     but the same array is reused, so it should not be held between calls.
   *     Record keys:
   *        attribs: (required) Sanitized attributes array.
   *        tagName: Replacement tag name.
   * @return {function(string, Array)} A function that sanitizes a string of
   *     HTML and appends result strings to the second argument, an array.
   */
  function makeHtmlSanitizer(tagPolicy) {
    var stack;
    var ignoring;
    var emit = function (text, out) {
      if (!ignoring) { out.push(text); }
    };
    return makeSaxParser({
      'startDoc': function(_) {
        stack = [];
        ignoring = false;
      },
      'startTag': function(tagNameOrig, attribs, out) {
        if (ignoring) { return; }
        if (!html4.ELEMENTS.hasOwnProperty(tagNameOrig)) { return; }
        var eflagsOrig = html4.ELEMENTS[tagNameOrig];
        if (eflagsOrig & html4.eflags['FOLDABLE']) {
          return;
        }

        var decision = tagPolicy(tagNameOrig, attribs);
        if (!decision) {
          ignoring = !(eflagsOrig & html4.eflags['EMPTY']);
          return;
        } else if (typeof decision !== 'object') {
          throw new Error('tagPolicy did not return object (old API?)');
        }
        if ('attribs' in decision) {
          attribs = decision['attribs'];
        } else {
          throw new Error('tagPolicy gave no attribs');
        }
        var eflagsRep;
        var tagNameRep;
        if ('tagName' in decision) {
          tagNameRep = decision['tagName'];
          eflagsRep = html4.ELEMENTS[tagNameRep];
        } else {
          tagNameRep = tagNameOrig;
          eflagsRep = eflagsOrig;
        }
        // TODO(mikesamuel): relying on tagPolicy not to insert unsafe
        // attribute names.

        // If this is an optional-end-tag element and either this element or its
        // previous like sibling was rewritten, then insert a close tag to
        // preserve structure.
        if (eflagsOrig & html4.eflags['OPTIONAL_ENDTAG']) {
          var onStack = stack[stack.length - 1];
          if (onStack && onStack.orig === tagNameOrig &&
              (onStack.rep !== tagNameRep || tagNameOrig !== tagNameRep)) {
                out.push('<\/', onStack.rep, '>');
          }
        }

        if (!(eflagsOrig & html4.eflags['EMPTY'])) {
          stack.push({orig: tagNameOrig, rep: tagNameRep});
        }

        out.push('<', tagNameRep);
        for (var i = 0, n = attribs.length; i < n; i += 2) {
          var attribName = attribs[i],
              value = attribs[i + 1];
          if (value !== null && value !== void 0) {
            out.push(' ', attribName, '="', escapeAttrib(value), '"');
          }
        }
        out.push('>');

        if ((eflagsOrig & html4.eflags['EMPTY'])
            && !(eflagsRep & html4.eflags['EMPTY'])) {
          // replacement is non-empty, synthesize end tag
          out.push('<\/', tagNameRep, '>');
        }
      },
      'endTag': function(tagName, out) {
        if (ignoring) {
          ignoring = false;
          return;
        }
        if (!html4.ELEMENTS.hasOwnProperty(tagName)) { return; }
        var eflags = html4.ELEMENTS[tagName];
        if (!(eflags & (html4.eflags['EMPTY'] | html4.eflags['FOLDABLE']))) {
          var index;
          if (eflags & html4.eflags['OPTIONAL_ENDTAG']) {
            for (index = stack.length; --index >= 0;) {
              var stackElOrigTag = stack[index].orig;
              if (stackElOrigTag === tagName) { break; }
              if (!(html4.ELEMENTS[stackElOrigTag] &
                    html4.eflags['OPTIONAL_ENDTAG'])) {
                // Don't pop non optional end tags looking for a match.
                return;
              }
            }
          } else {
            for (index = stack.length; --index >= 0;) {
              if (stack[index].orig === tagName) { break; }
            }
          }
          if (index < 0) { return; }  // Not opened.
          for (var i = stack.length; --i > index;) {
            var stackElRepTag = stack[i].rep;
            if (!(html4.ELEMENTS[stackElRepTag] &
                  html4.eflags['OPTIONAL_ENDTAG'])) {
              out.push('<\/', stackElRepTag, '>');
            }
          }
          if (index < stack.length) {
            tagName = stack[index].rep;
          }
          stack.length = index;
          out.push('<\/', tagName, '>');
        }
      },
      'pcdata': emit,
      'rcdata': emit,
      'cdata': emit,
      'endDoc': function(out) {
        for (; stack.length; stack.length--) {
          out.push('<\/', stack[stack.length - 1].rep, '>');
        }
      }
    });
  }

  var ALLOWED_URI_SCHEMES = /^(?:https?|mailto)$/i;

  function safeUri(uri, effect, ltype, hints, naiveUriRewriter) {
    if (!naiveUriRewriter) { return null; }
    try {
      var parsed = URI.parse('' + uri);
      if (parsed) {
        if (!parsed.hasScheme() ||
            ALLOWED_URI_SCHEMES.test(parsed.getScheme())) {
          var safe = naiveUriRewriter(parsed, effect, ltype, hints);
          return safe ? safe.toString() : null;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function log(logger, tagName, attribName, oldValue, newValue) {
    if (!attribName) {
      logger(tagName + " removed", {
        change: "removed",
        tagName: tagName
      });
    }
    if (oldValue !== newValue) {
      var changed = "changed";
      if (oldValue && !newValue) {
        changed = "removed";
      } else if (!oldValue && newValue)  {
        changed = "added";
      }
      logger(tagName + "." + attribName + " " + changed, {
        change: changed,
        tagName: tagName,
        attribName: attribName,
        oldValue: oldValue,
        newValue: newValue
      });
    }
  }

  function lookupAttribute(map, tagName, attribName) {
    var attribKey;
    attribKey = tagName + '::' + attribName;
    if (map.hasOwnProperty(attribKey)) {
      return map[attribKey];
    }
    attribKey = '*::' + attribName;
    if (map.hasOwnProperty(attribKey)) {
      return map[attribKey];
    }
    return void 0;
  }
  function getAttributeType(tagName, attribName) {
    return lookupAttribute(html4.ATTRIBS, tagName, attribName);
  }
  function getLoaderType(tagName, attribName) {
    return lookupAttribute(html4.LOADERTYPES, tagName, attribName);
  }
  function getUriEffect(tagName, attribName) {
    return lookupAttribute(html4.URIEFFECTS, tagName, attribName);
  }

  /**
   * Sanitizes attributes on an HTML tag.
   * @param {string} tagName An HTML tag name in lowercase.
   * @param {Array.<?string>} attribs An array of alternating names and values.
   * @param {?function(?string): ?string} opt_naiveUriRewriter A transform to
   *     apply to URI attributes; it can return a new string value, or null to
   *     delete the attribute.  If unspecified, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes; it can return a new string value, or null to delete
   *     the attribute.  If unspecified, these attributes are kept unchanged.
   * @return {Array.<?string>} The sanitized attributes as a list of alternating
   *     names and values, where a null value means to omit the attribute.
   */
  function sanitizeAttribs(tagName, attribs,
    opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger) {
    // TODO(felix8a): it's obnoxious that domado duplicates much of this
    // TODO(felix8a): maybe consistently enforce constraints like target=
    for (var i = 0; i < attribs.length; i += 2) {
      var attribName = attribs[i];
      var value = attribs[i + 1];
      var oldValue = value;
      var atype = null, attribKey;
      if ((attribKey = tagName + '::' + attribName,
           html4.ATTRIBS.hasOwnProperty(attribKey)) ||
          (attribKey = '*::' + attribName,
           html4.ATTRIBS.hasOwnProperty(attribKey))) {
        atype = html4.ATTRIBS[attribKey];
      }
      if (atype !== null) {
        switch (atype) {
          case html4.atype['NONE']: break;
          case html4.atype['SCRIPT']:
            value = null;
            if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
          case html4.atype['STYLE']:
            if ('undefined' === typeof parseCssDeclarations) {
              value = null;
              if (opt_logger) {
                log(opt_logger, tagName, attribName, oldValue, value);
	      }
              break;
            }
            var sanitizedDeclarations = [];
            parseCssDeclarations(
                value,
                {
                  'declaration': function (property, tokens) {
                    var normProp = property.toLowerCase();
                    sanitizeCssProperty(
                        normProp, tokens,
                        opt_naiveUriRewriter
                        ? function (url) {
                            return safeUri(
                                url, html4.ueffects.SAME_DOCUMENT,
                                html4.ltypes.SANDBOXED,
                                {
                                  "TYPE": "CSS",
                                  "CSS_PROP": normProp
                                }, opt_naiveUriRewriter);
                          }
                        : null);
                    if (tokens.length) {
                      sanitizedDeclarations.push(
                          normProp + ': ' + tokens.join(' '));
                    }
                  }
                });
            value = sanitizedDeclarations.length > 0 ?
              sanitizedDeclarations.join(' ; ') : null;
            if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
          case html4.atype['ID']:
          case html4.atype['IDREF']:
          case html4.atype['IDREFS']:
          case html4.atype['GLOBAL_NAME']:
          case html4.atype['LOCAL_NAME']:
          case html4.atype['CLASSES']:
            value = opt_nmTokenPolicy ? opt_nmTokenPolicy(value) : value;
            if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
          case html4.atype['URI']:
            value = safeUri(value,
              getUriEffect(tagName, attribName),
              getLoaderType(tagName, attribName),
              {
                "TYPE": "MARKUP",
                "XML_ATTR": attribName,
                "XML_TAG": tagName
              }, opt_naiveUriRewriter);
              if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
          case html4.atype['URI_FRAGMENT']:
            if (value && '#' === value.charAt(0)) {
              value = value.substring(1);  // remove the leading '#'
              value = opt_nmTokenPolicy ? opt_nmTokenPolicy(value) : value;
              if (value !== null && value !== void 0) {
                value = '#' + value;  // restore the leading '#'
              }
            } else {
              value = null;
            }
            if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
          default:
            value = null;
            if (opt_logger) {
              log(opt_logger, tagName, attribName, oldValue, value);
            }
            break;
        }
      } else {
        value = null;
        if (opt_logger) {
          log(opt_logger, tagName, attribName, oldValue, value);
        }
      }
      attribs[i + 1] = value;
    }
    return attribs;
  }

  /**
   * Creates a tag policy that omits all tags marked UNSAFE in html4-defs.js
   * and applies the default attribute sanitizer with the supplied policy for
   * URI attributes and NMTOKEN attributes.
   * @param {?function(?string): ?string} opt_naiveUriRewriter A transform to
   *     apply to URI attributes.  If not given, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes.  If not given, such attributes are left unchanged.
   * @return {function(string, Array.<?string>)} A tagPolicy suitable for
   *     passing to html.sanitize.
   */
  function makeTagPolicy(
    opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger) {
    return function(tagName, attribs) {
      if (!(html4.ELEMENTS[tagName] & html4.eflags['UNSAFE'])) {
        return {
          'attribs': sanitizeAttribs(tagName, attribs,
            opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger)
        };
      } else {
        if (opt_logger) {
          log(opt_logger, tagName, undefined, undefined, undefined);
        }
      }
    };
  }

  /**
   * Sanitizes HTML tags and attributes according to a given policy.
   * @param {string} inputHtml The HTML to sanitize.
   * @param {function(string, Array.<?string>)} tagPolicy A function that
   *     decides which tags to accept and sanitizes their attributes (see
   *     makeHtmlSanitizer above for details).
   * @return {string} The sanitized HTML.
   */
  function sanitizeWithPolicy(inputHtml, tagPolicy) {
    var outputArray = [];
    makeHtmlSanitizer(tagPolicy)(inputHtml, outputArray);
    return outputArray.join('');
  }

  /**
   * Strips unsafe tags and attributes from HTML.
   * @param {string} inputHtml The HTML to sanitize.
   * @param {?function(?string): ?string} opt_naiveUriRewriter A transform to
   *     apply to URI attributes.  If not given, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes.  If not given, such attributes are left unchanged.
   */
  function sanitize(inputHtml,
    opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger) {
    var tagPolicy = makeTagPolicy(
      opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger);
    return sanitizeWithPolicy(inputHtml, tagPolicy);
  }

  // Export both quoted and unquoted names for Closure linkage.
  var html = {};
  html.escapeAttrib = html['escapeAttrib'] = escapeAttrib;
  html.makeHtmlSanitizer = html['makeHtmlSanitizer'] = makeHtmlSanitizer;
  html.makeSaxParser = html['makeSaxParser'] = makeSaxParser;
  html.makeTagPolicy = html['makeTagPolicy'] = makeTagPolicy;
  html.normalizeRCData = html['normalizeRCData'] = normalizeRCData;
  html.sanitize = html['sanitize'] = sanitize;
  html.sanitizeAttribs = html['sanitizeAttribs'] = sanitizeAttribs;
  html.sanitizeWithPolicy = html['sanitizeWithPolicy'] = sanitizeWithPolicy;
  html.unescapeEntities = html['unescapeEntities'] = unescapeEntities;
  return html;
})(html4);

var html_sanitize = html['sanitize'];

// Exports for Closure compiler.  Note this file is also cajoled
// for domado and run in an environment without 'window'
if (typeof window !== 'undefined') {
  window['html'] = html;
  window['html_sanitize'] = html_sanitize;
}
;
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * JavaScript support for TemplateCompiler.java and for a tamed version of
 * <code>document.write{,ln}</code>.
 * <p>
 * This handles the problem of making sure that only the bits of a Gadget's
 * static HTML which should be visible to a script are visible, and provides
 * mechanisms to reliably find elements using dynamically generated unique IDs
 * in the face of DOM modifications by untrusted scripts.
 *
 * @author mikesamuel@gmail.com
 * @author jasvir@gmail.com
 * @provides HtmlEmitter
 * @overrides window
 * @requires bridalMaker html htmlSchema cajaVM URI Q
 * @requires lexCss sanitizeMediaQuery sanitizeStylesheetWithExternals
 * @overrides window
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * @param base a node that is the ancestor of all statically generated HTML.
 * @param opt_mitigatingUrlRewriter a script url rewriting proxy which can be used
 *     to optionally load premitigated scripts instead of mitigating on the
 *     fly (used only in SES)
 * @param opt_domicile the domado instance that will receive a load event when
 *     the html-emitter is closed, and which will have the {@code writeHook}
 *     property set to the HtmlEmitter's document.write implementation.
 * @param opt_guestGlobal the object in the guest frame that is the global scope
 *     for guest code.
 */
function HtmlEmitter(base, opt_mitigatingUrlRewriter, opt_domicile,
      opt_guestGlobal) {
  if (!base) {
    throw new Error(
        'Host page error: Virtual document element was not provided');
  }

  var targetDocument = base.nodeType === 9  // Document node
      ? base
      : base.ownerDocument;

  // TODO(kpreid): Fix our terminology: HTML5 spec contains something called the
  // 'insertion point', which is not this; this is the 'current node' and
  // implicitly the 'stack of open elements' via parents.
  var insertionPoint = base;
  var bridal = bridalMaker(targetDocument);

  // TODO: Take into account <base> elements.

  /**
   * Contiguous pairs of ex-descendants of base, and their ex-parent.
   * The detached elements (even indices) are ordered depth-first.
   */
  var detached = null;
  /** Makes sure IDs are accessible within removed detached nodes. */
  var idMap = null;

  /** Hook from attach/detach to document.write logic. */
  var updateInsertionMode, notifyEOF;

  var arraySplice = Array.prototype.splice;

  var HTML5_WHITESPACE_RE = /^[\u0009\u000a\u000c\u000d\u0020]*$/;

  function buildIdMap() {
    idMap = {};
    var descs = base.getElementsByTagName('*');
    for (var i = 0, desc; (desc = descs[i]); ++i) {
      var id = desc.getAttributeNode('id');
      // The key is decorated to avoid name conflicts and restrictions.
      if (id && id.value) { idMap[id.value + " map entry"] = desc; }
    }
  }
  /**
   * Returns the element with the given ID under the base node.
   * @param id an auto-generated ID since we cannot rely on user supplied IDs
   *     to be unique.
   * @return {Element|null} null if no such element exists.
   */
  function byId(id) {
    if (!idMap) { buildIdMap(); }
    var node = idMap[id + " map entry"];
    if (node) { return node; }
    for (; (node = targetDocument.getElementById(id));) {
      if (base.contains
          ? base.contains(node)
          : (base.compareDocumentPosition(node) & 0x10)) {
        idMap[id + " map entry"] = node;
        return node;
      } else {
        node.id = '';
      }
    }
    return null;
  }

  /**
   * emitStatic allows the caller to inject the static HTML from JavaScript,
   * if the gadget host page's usage pattern requires it.
   */
  function emitStatic(htmlString) {
    if (!insertionPoint) {
      throw new Error('Host page error: HtmlEmitter.emitStatic called after' +
          ' document finish()ed');
    }
    if (base.nodeType === 1 /* Element */) {
      base.innerHTML += htmlString;
    } else {
      // We need to handle Document nodes, which don't provide .innerHTML.

      // Additionally, we currently don't use real <html> and <head> elements
      // and so just doing base.write(htmlString), which would otherwise be
      // sufficient, would insert unwanted structure around our HTML.
      // TODO(kpreid): Fix that.
      var dummy = targetDocument.createElement('div');
      dummy.innerHTML = htmlString;
      while (dummy.firstChild) {
        base.appendChild(dummy.firstChild);
      }
    }
    updateInsertionMode();
  }

  // Below we define the attach, detach, and finish operations.
  // These obey the conventions that:
  //   (1) All detached nodes, along with their ex-parents are in detached,
  //       and they are ordered depth-first.
  //   (2) When a node is specified by an ID, after the operation is performed,
  //       it is in the tree.
  //   (3) Each node is attached to the same parent regardless of what the
  //       script does.  Even if a node is removed from the DOM by a script,
  //       any of its children that appear after the script, will be added.
  // As an example, consider this HTML which has the end-tags removed since
  // they don't correspond to actual nodes.
  //   <table>
  //     <script>
  //     <tr>
  //       <td>Foo<script>Bar
  //       <th>Baz
  //   <script>
  //   <p>The-End
  // There are two script elements, and we need to make sure that each only
  // sees the bits of the DOM that it is supposed to be aware of.
  //
  // To make sure that things work when javascript is off, we emit the whole
  // HTML tree, and then detach everything that shouldn't be present.
  // We represent the removed bits as pairs of (removedNode, parentItWasPartOf).
  // Including both makes us robust against changes scripts make to the DOM.
  // In this case, the detach operation results in the tree
  //   <table>
  // and the detached list
  //   [<tr><td>FooBar<th>Baz in <table>, <p>The-End in (base)]

  // After the first script executes, we reattach the bits needed by the second
  // script, which gives us the DOM
  //   <table><tr><td>Foo
  // and the detached list
  //   ['Bar' in <td>, <th>Baz in <tr>, <p>The-End in (base)]
  // Note that we did not simply remove items from the old detached list.  Since
  // the second script was deeper than the first, we had to add only a portion
  // of the <tr>'s content which required doing a separate mini-detach operation
  // and push its operation on to the front of the detached list.

  // After the second script executes, we reattach the bits needed by the third
  // script, which gives us the DOM
  //   <table><tr><td>FooBar<th>Baz
  // and the detached list
  //   [<p>The-End in (base)]

  // After the third script executes, we reattached the rest of the detached
  // nodes, and we're done.

  // To perform a detach or reattach operation, we impose a depth-first ordering
  // on HTML start tags, and text nodes:
  //   [0: <table>, 1: <tr>, 2: <td>, 3: 'Foo', 4: 'Bar', 5: <th>, 6: 'Baz',
  //    7: <p>, 8: 'The-End']
  // Then the detach operation simply removes the minimal number of nodes from
  // the DOM to make sure that only a prefix of those nodes are present.
  // In the case above, we are detaching everything after item 0.
  // Then the reattach operation advances the number.  In the example above, we
  // advance the index from 0 to 3, and then from 3 to 6.
  // The finish operation simply reattaches the rest, advancing the counter from
  // 6 to the end.

  // The minimal detached list from the node with DFS index I is the ordered
  // list such that a (node, parent) pair (N, P) is on the list if
  // dfs-index(N) > I and there is no pair (P, GP) on the list.

  // To calculate the minimal detached list given a node representing a point in
  // that ordering, we rely on the following observations:
  //    The minimal detached list after a node, is the concatenation of
  //    (1) that node's children in order
  //    (2) the next sibling of that node and its later siblings,
  //        the next sibling of that node's parent and its later siblings,
  //        the next sibling of that node's grandparent and its later siblings,
  //        etc., until base is reached.

  function detachOnto(limit, out) {
    // Set detached to be the minimal set of nodes that have to be removed
    // to make sure that limit is the last attached node in DFS order as
    // specified above.

    // First, store all the children.
    for (var child = limit.firstChild, next; child; child = next) {
      next = child.nextSibling;  // removeChild kills nextSibling.
      out.push(child, limit);
      limit.removeChild(child);
    }

    // Second, store your ancestor's next siblings and recurse.
    for (var anc = limit, greatAnc; anc && anc !== base; anc = greatAnc) {
      greatAnc = anc.parentNode;
      for (var sibling = anc.nextSibling, next; sibling; sibling = next) {
        next = sibling.nextSibling;
        out.push(sibling, greatAnc);
        greatAnc.removeChild(sibling);
      }
    }
  }
  /**
   * Make sure that everything up to and including the node with the given ID
   * is attached, and that nothing that follows the node is attached.
   */
  function attach(id) {
    var limit = byId(id);
    if (detached) {
      // Build an array of arguments to splice so we can replace the reattached
      // nodes with the nodes detached from limit.
      var newDetached = [0, 0];
      // Since limit has no parent, detachOnto will bottom out at its sibling.
      detachOnto(limit, newDetached);
      // Find the node containing limit that appears on detached.
      var limitAnc = limit;
      for (var parent; (parent = limitAnc.parentNode);) {
        limitAnc = parent;
      }
      // Reattach up to and including limit ancestor.
      // If some browser quirk causes us to miss limit in detached, we'll
      // reattach everything and try to continue.
      var nConsumed = 0;
      while (nConsumed < detached.length) {
        // in IE, some types of nodes can't be standalone, and detaching
        // one will create new parentNodes for them.  so at this point,
        // limitAnc might be an ancestor of the node on detached.
        var reattach = detached[nConsumed];
        var reattAnc = reattach;
        for (; reattAnc.parentNode; reattAnc = reattAnc.parentNode) {}
        (detached[nConsumed + 1] /* the parent */).appendChild(reattach);
        nConsumed += 2;
        if (reattAnc === limitAnc) { break; }
      }
      // Replace the reattached bits with the ones detached from limit.
      newDetached[1] = nConsumed;  // splice's second arg is the number removed
      arraySplice.apply(detached, newDetached);
    } else {
      // The first time attach is called, the limit is actually part of the DOM.
      // There's no point removing anything when all scripts are deferred.
      detached = [];
      detachOnto(limit, detached);
    }
    // Keep track of the insertion point for document.write.
    // The tag was closed if there is no child waiting to be added.
    // FIXME(mikesamuel): This is not technically correct, since the script
    // element could have been the only child.
    var isLimitClosed = detached[1] !== limit;
    insertionPoint = isLimitClosed ? limit.parentNode : limit;
    updateInsertionMode();
    return limit;
  }
  /**
   * Removes a script place-holder.
   * When a text node immediately precedes a script block, the limit will be
   * a text node.  Text nodes can't be addressed by ID, so the TemplateCompiler
   * follows them with a {@code <span>} which must be removed to be semantics
   * preserving.
   */
  function discard(placeholder) {
    // An untrusted script block should not be able to access the wrapper before
    // it's removed since it won't be part of the DOM so there should be a
    // parentNode.
    placeholder.parentNode.removeChild(placeholder);
  }
  /**
   * Reattach any remaining detached bits, free resources. Corresponds to HTML5
   * document.close(). May be called redundantly.
   *
   * See also reopen() below.
   */
  function finish() {
    if (detached) {
      for (var i = 0, n = detached.length; i < n; i += 2) {
        detached[i + 1].appendChild(detached[i]);
      }
    }
    // Release references so nodes can be garbage collected.
    idMap = detached = null;
    // At this point we need to close the document, which means
    // adding html/head/body elements if they're missing.
    // notifyEOF() will do that, but we have to set
    // insertionPoint and insertionMode appropriately first.
    insertionPoint = hasChild(base, 'html') || base;
    updateInsertionMode();
    notifyEOF();
    insertionPoint = null;
    return this;
  }

  function virtTagName(el) {
    if (!el) { return ''; }
    return htmlSchema.realToVirtualElementName(el.tagName).toLowerCase();
  }

  function hasChild(el, name) {
    if (!el) { return false; }
    
    for (var child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && virtTagName(child) === name) {
        return child;
      }
    }
    return false;
  }

  function signalLoaded() {
    // Signals the close of the document and fires any window.onload event
    // handlers.
    var domicile = opt_domicile;
    // Fire any deferred or async scripts and after they're all loaded,
    // fire any onload handlers.
    if (domicile) {
      delayScript(function () { domicile.signalLoaded(); });
    }
    execDelayedScripts();
    return this;
  }


  /**
   * Delayed scripts that should be evaluated before signalling that the
   * document is loaded.
   * Elements in this are one of<ul>
   * <li>null - script which has been executed.</li>
   * <li>UNSATISFIED - script which cannot yet be executed.</li>
   * <li>a function of zero arguments which encapsulates the script body.</li>
   * </ul>
   */
  var delayedScripts = [];

  var UNSATISFIED = {};

  function delayScript(fn) {
    if (delayedScripts) {
      delayedScripts.push(fn);
    } else {
      fn();
    }
  }

  // Execute any delayed scripts.
  function execDelayedScripts() {
    if (delayedScripts) {
      // Sample length each time in case one delayed scripts execution
      // causes another to fire.
      for (var i = 0; i < delayedScripts.length; ++i) {
        var delayedScript = delayedScripts[i];
        if (!delayedScript) { continue; }
        if (delayedScript === UNSATISFIED) { return; }
        delayedScripts[i] = null;
        try {
          delayedScript();
        } catch (_) {
          // Any dispatching to onerror should have been handled by
          // delayedScript so log.
          // TODO(mikesamuel): How do we log from this file.
          // Should domicile provide a log hook?
        }
      }
      delayedScripts = null;
    }
  }


  function handleEmbed(params) {
    if (!opt_guestGlobal) { return; }
    if (!opt_guestGlobal.cajaHandleEmbed) { return; }
    opt_guestGlobal.cajaHandleEmbed(params);
  }

  this.byId = byId;
  this.attach = attach;
  this.discard = discard;
  this.emitStatic = emitStatic;
  this.finish = finish;
  this.signalLoaded = signalLoaded;
  this.setAttr = bridal.setAttribute;
  this.rmAttr = function(el, attr) { return el.removeAttribute(attr); };
  this.handleEmbed = handleEmbed;

  (function (domicile) {
    if (!domicile || domicile.writeHook) {
      updateInsertionMode = notifyEOF = function () {};
      return;
    }

    function concat(items) {
      return Array.prototype.join.call(items, '');
    }

    function evaluateUntrustedScript(
        scriptBaseUri, scriptInnerText, scriptNode, opt_delayed, opt_mitigate) {
      if (!opt_guestGlobal) { return; }

      if (opt_delayed) {
        delayScript(function () {
          evaluateUntrustedScript(
            scriptBaseUri, scriptInnerText, scriptNode, false, opt_mitigate);
        });
        return;
      }

      var errorMessage = "SCRIPT element evaluation failed";

      var cajaVM = opt_guestGlobal.cajaVM;
      if (cajaVM) {
        var compileModule = cajaVM.compileModule;
        if (compileModule) {
          try {
            // TODO(jasvir): Consider caching in localStorage here
            // May require tying the key to the caja version and/or
            // a crypto hash
            var compiledModule = compileModule(scriptInnerText, opt_mitigate);
            try {
              compiledModule(opt_domicile.window);

              // Success.
              domicile.fireVirtualEvent(scriptNode, 'Event', 'load');
              return;  // Do not trigger onerror below.
            } catch (runningEx) {
              errorMessage = String(runningEx);
            }
          } catch (compileEx) {
            errorMessage =
              String(compileEx && (compileEx.message || compileEx.description))
                || errorMessage;
          }
        }
      }

      // TODO(kpreid): Include error message appropriately
      domicile.fireVirtualEvent(scriptNode, 'Event', 'error');

      // Dispatch to the onerror handler.
      try {
        // TODO(kpreid): This should probably become a full event dispatch.
        // TODO: Should this happen inline or be dispatched out of band?
        opt_domicile.window.onerror(
            errorMessage,
            // URL where error was raised.
            // If this is an external load, then we need to use that URL,
            // but for inline scripts we maintain the illusion by using the
            // domicile.pseudoLocation.href which was passed here.
            scriptBaseUri,
            1  // Line number where error was raised.
            // TODO: remap by inspection of the error if possible.
            );
      } catch (_) {
        // Ignore problems dispatching error.
      }

      return errorMessage;
    }

    function makeCssUriHandler(baseUri, method, mime) {
      return function(uri, prop) {
        // TODO: sanitizeCss* functions resolve URIs, so can we avoid closing
        // over baseUri here?
        return (domicile && domicile[method])
            ? domicile[method](URI.utils.resolve(baseUri, uri), mime, prop)
            : void 0;
      };
    }

    function makeCssUriSanitizer(baseUri) {
      return makeCssUriHandler(baseUri, 'cssUri', 'image/*');
    }

    function makeCssUriFetcher(baseUri) {
      return makeCssUriHandler(baseUri, 'fetchUri', 'text/css');
    }

    function defineUntrustedStylesheet(
        styleBaseUri, cssText, styleElement, outerMediaQuery) {
      var safeCss;
      function emitCss(text) {
        // If a stylesheet has a media attribute, and contains an import with
        // a media query:
        //   <style media="screen and (color)">
        //     @import "foo.css" only (fancy:very)
        //   </style>
        // We cannot just AND two media queries, though because media queries
        // do not arbitrarily parenthesize, so instead we use a master outer
        // @media block and allow continuation to nest @media inside it.
        if (outerMediaQuery) {
          text = '@media ' + outerMediaQuery + ' {\n' + text + '\n}';
        }
        styleElement.appendChild(styleElement.ownerDocument.createTextNode(
            text + '\n'));
      }
      function continuation(sanitizeStyle, moreToCome) {
        if (!moreToCome && safeCss) {
          emitCss(safeCss.toString());
        }
      }
      if (domicile && domicile.emitCss) {
        var sanitized = sanitizeStylesheetWithExternals(
            styleBaseUri, cssText, domicile.virtualization,
            makeCssUriSanitizer(styleBaseUri),
            makeCssUriFetcher(styleBaseUri),
            continuation);
        safeCss = sanitized.result;
        continuation(sanitized.result, sanitized.moreToCome);
      }
    }

    function resolveUntrustedExternal(
        url, mime, marker, continuation) {
      if (domicile && domicile.fetchUri) {
        domicile.fetchUri(url, mime,
          function (result) {
            if (result && result.html) {
              continuation(url, result.html);
            } else {
              continuation(url, null);
            }
          });
        if (marker) {
          throw marker;
        }
      }
    }

    function defineUntrustedExternalStylesheet(
        url, styleElement, marker, media, continuation) {
      resolveUntrustedExternal(
          url, 'text/css', marker, function(url, result) {
            if (result !== null) {
              defineUntrustedStylesheet(url, result, styleElement, media);
            }
            continuation();
          });
    }

    function getMitigatedUrl(url) {
      if (!opt_mitigatingUrlRewriter) { return null; }
      if ('function' === typeof opt_mitigatingUrlRewriter) {
        var p = opt_mitigatingUrlRewriter(URI.parse(url));
        return p ? String(p) : null;
      }
      return null;
    }

    function evaluateUntrustedExternalScript(
        url, scriptNode, marker, opt_continuation, delayed) {
      var proxiedUrl = getMitigatedUrl(url);
      var mitigateOpts;
      if (proxiedUrl) {
        // Disable mitigation
        mitigateOpts = {
          parseProgram : true,
          rewriteTopLevelVars : false,
          rewriteTopLevelFuncs : false,
          rewriteTypeOf : false
        };
        url = proxiedUrl;
      } else {
        mitigateOpts = undefined; // Enable all mitigation
      }
      var handler;
      if (delayed && delayedScripts) {
        var idx = delayedScripts.length;
        delayedScripts[idx] = UNSATISFIED;
        handler = function(url, src) {
          delayedScripts[idx] = function () {
            evaluateUntrustedScript(url, src, scriptNode, true, mitigateOpts);
          };
          // TODO(mikesamuel): should this be done via timeout?
          execDelayedScripts();
        };
      } else {
        handler = function(uri, src, opt_delayed) {
          evaluateUntrustedScript(uri, src, scriptNode, opt_delayed,
              mitigateOpts);
        };
      }
      function outerHandler(uri, src, opt_delayed) {
        // TODO(kpreid): opt_delayed never passed?
        handler(
            uri,
            src === null ? 'throw new Error("not loaded")' : src,
            opt_delayed);
        if (opt_continuation) { opt_continuation(); }
      }
      // TODO(mikesamuel): What is the appropriate voodoo here that triggers
      // dispatch to the module global onerror handler?
      // Can we prepackage a 'throw new Error("not loaded")' module, and load
      // that when loading otherwise fails?

      resolveUntrustedExternal(url, 'text/javascript', marker, outerHandler);
    }

    function finishCdata() {
      var result = {
        text: cdataContent.join(''),
        external: pendingExternal,
        delayed: pendingDelayed
      };
      cdataContent.length = 0;
      pendingExternal = undefined;
      pendingDelayed = false;
      return result;
    }

    function lookupAttr(attribs, attr) {
      var srcIndex = 0;
      do {
        srcIndex = attribs.indexOf(attr, srcIndex) + 1;
      } while (srcIndex && !(srcIndex & 1));
      return srcIndex ? attribs[srcIndex] : undefined;
    }

    function resolveUriRelativeToDocument(href) {
      if (domicile && domicile.pseudoLocation && domicile.pseudoLocation.href) {
        return URI.utils.resolve(domicile.pseudoLocation.href, href);
      }
      return href;
    }

    // Chunks of CDATA content which need to be specially processed and
    // interpreted rather than inserted into the host DOM.
    var cdataContent = [];
    // The URL of any pending CDATA element, for example the value of the
    // <script src> attribute.
    var pendingExternal = undefined;
    // True iff the pending CDATA tag is defer or async.
    var pendingDelayed = false;
    // The value of the media attribute of a pending CDATA <style> element.
    var pendingMedia = '';

    var documentLoaded = undefined;
    var depth = 0;

    /**
     * Note: mutates attribs to virtualized form.
     */
    function normalInsert(virtualTagName, attribs) {
      var realTagName = htmlSchema.virtualToRealElementName(virtualTagName);

      // Extract attributes which we need to invoke side-effects on rather
      // than just sanitization; currently <body> event handlers.
      var slowPathAttribs = [];
      if (opt_domicile && virtualTagName === 'body') {
        for (var i = attribs.length - 2; i >= 0; i -= 2) {
          if (/^on/i.test(attribs[i])) {
            slowPathAttribs.push.apply(slowPathAttribs, attribs.splice(i, 2));
          }
        }
      }

      var vSchemaEl = htmlSchema.element(virtualTagName);
      var rSchemaEl = htmlSchema.element(realTagName);

      domicile.sanitizeAttrs(realTagName, attribs);

      if (!rSchemaEl.allowed && realTagName !== 'script' &&
          realTagName !== 'style') {
        throw new Error('HtmlEmitter internal: unsafe element ' + realTagName +
            ' slipped through virtualization!');
      }

      var el = bridal.createElement(realTagName, attribs);
      if (vSchemaEl.optionalEndTag && el.tagName === insertionPoint.tagName) {
        documentWriter.endTag(el.tagName.toLowerCase(), true);
        // TODO(kpreid): Replace this with HTML5 parsing model
      }
      insertionPoint.appendChild(el);
      if (!vSchemaEl.empty) { insertionPoint = el; }

      for (var i = slowPathAttribs.length - 2; i >= 0; i -= 2) {
        opt_domicile.tameNode(el).setAttribute(
          slowPathAttribs[i], slowPathAttribs[i+1]);
      }
    }

    function normalEndTag(tagName) {
      tagName = htmlSchema.virtualToRealElementName(tagName).toUpperCase();

      var anc = insertionPoint;
      while (anc !== base && !/\bvdoc-container___\b/.test(anc.className)) {
        var p = anc.parentNode;
        if (anc.tagName === tagName) {
          insertionPoint = p;
          return;
        }
        anc = p;
      }
    }

    function normalText(text) {
      var realTagName = insertionPoint.tagName;
      if (!htmlSchema.element(realTagName).allowed) {
        throw new Error('HtmlEmitter internal: attempted to add text to ' +
            'unsafe element ' + realTagName + '!');
      }
      insertionPoint.appendChild(targetDocument.createTextNode(
          html.unescapeEntities(text)));
    }

    function stopParsing() {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#stop-parsing
      // Note: Most of the post-processing tasks are currently handled by the
      // caller of finish(), not this code.
      insertionPoint = null;
    }

    // Per HTML5 spec
    function isHtml5NonWhitespace(text) {
      return !HTML5_WHITESPACE_RE.test(text);
    }
    var insertionModes = {
      initial: {
        toString: function () { return "initial"; },
        startTag: function (tagName, attribs) {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.startTag.apply(undefined, arguments);
        },
        endTag: function (tagName) {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.endTag.apply(undefined, arguments);
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode = insertionModes.beforeHtml;
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.endOfFile();
        }
      },
      beforeHtml: {
        toString: function () { return "before html"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.beforeHead;
          } else {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head' || tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          normalInsert('html', []);
          insertionMode = insertionModes.beforeHead;
          insertionMode.endOfFile();
        }
      },
      beforeHead: {
        toString: function () { return "before head"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'head') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.inHead;
          } else {
            insertionMode.startTag('head', []);
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head' || tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            insertionMode.startTag('head', []);
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.startTag('head', []);
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode.startTag('head', []);
          insertionMode.endOfFile();
        }
      },
      inHead: {
        toString: function () { return "in head"; },
        startTag: function (tagName, attribs, marker, continuation) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'base' || tagName === 'basefont' ||
                     tagName === 'bgsound' || tagName === 'link') {
            // Define a stylesheet for <link>
            if (tagName === 'link') {
              // Link types are case insensitive
              var rel = lookupAttr(attribs, 'rel');
              var href = lookupAttr(attribs, 'href');
              var rels = rel ? String(rel).toLowerCase().split(' ') : [];
              if (href && rels.indexOf('stylesheet') >= 0) {
                var res = resolveUriRelativeToDocument(href);
                var media = lookupAttr(attribs, 'media');
                media = media ? sanitizeMediaQuery(lexCss(media)) : '';
                // Nonconformant and visible to the guest, but needed
                var styleElement = insertionPoint.ownerDocument
                    .createElement('style');
                insertionPoint.appendChild(styleElement);
                defineUntrustedExternalStylesheet(
                    res, styleElement, marker, media, continuation);
              }
            }

            // "Insert an HTML element for the token."
            normalInsert(tagName, attribs);

            // "Immediately pop the current node off the stack of open
            // elements."
            // (Currently handled inside of normalInsert using the .empty flag.
            // TODO(kpreid): Be HTML5 conformant in this aspect.)
            //insertionPoint = insertionPoint.parentElement;

            // "Acknowledge the token's self-closing flag, if it is set."
            // Not implemented.
          } else if (tagName === 'command' || tagName === 'meta' ||
                     tagName === 'noscript' || tagName === 'noframes') {
            // TODO(kpreid): Spec deviations for noscript, noframes, meta...
            normalInsert(tagName, attribs);
          } else if (tagName === 'title') {
            normalInsert(tagName, attribs);
            originalInsertionMode = insertionMode;
            insertionMode = insertionModes.text;
          } else if (tagName === 'style') {
            // "Follow the generic raw text element parsing algorithm."
            // "Insert an HTML element for the token."
            normalInsert(tagName, attribs);

            // "...switch the tokenizer to the RAWTEXT state..."
            // Handled before this stage.

            // "Let the original insertion mode be the current insertion mode."
            originalInsertionMode = insertionMode;

            pendingExternal = undefined;
            pendingDelayed = false;

            // "Then, switch the insertion mode to "text"."
            insertionMode = insertionModes.text;

            pendingMedia = lookupAttr(attribs, 'media');
            pendingMedia = pendingMedia
                ? sanitizeMediaQuery(lexCss(pendingMedia)) : '';
          } else if (tagName === 'script') {
            // "Create an element for the token in the HTML namespace."
            // "Mark the element as being "parser-inserted" and unset the
            // element's "force-async" flag."
            // "If the parser was originally created for the HTML fragment
            // parsing algorithm, then mark the script element as "already
            // started". (fragment case)"
            // "Append the new element to the current node and push it onto the
            // stack of open elements."
            // Note: We don't implement the mentioned flags so we can just merge
            // the steps into a normalInsert.
            // Note: src= will be filtered out by the whitelist.
            // Note: normalInsert mutates attribs, so we copy in this case.
            normalInsert(tagName, attribs.slice());

            // "Switch the tokenizer to the script data state."
            // This is internally done by the SAX parser.

            // "Let the original insertion mode be the current insertion mode."
            originalInsertionMode = insertionMode;

            // TODO(kpreid): Where in HTML5 is this side effect supposed to
            // occur, if at all? Should this actually be read out of the stashed
            // src attribute? Can we make this another "slow path attribute"
            // thing like normalInsert does for event handlers?
            var scriptSrc = lookupAttr(attribs, 'src');
            if (!scriptSrc) {
              // A script tag without a script src - use child node for source
              pendingExternal = undefined;
            } else {
              pendingExternal = scriptSrc;
            }
            pendingDelayed = (lookupAttr(attribs, 'defer') !== undefined
                || lookupAttr(attribs, 'async') !== undefined);

            // "Switch the insertion mode to "text"."
            insertionMode = insertionModes.text;
          } else if (tagName === 'head') {
            // "Parse error. Ignore the token."
          } else {
            insertionMode.endTag('head');
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head') {
            insertionPoint = insertionPoint.parentElement;
            insertionMode = insertionModes.afterHead;
          } else if (tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            insertionMode.endTag('head');
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.endTag('head');
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode.endTag('head');
          insertionMode.endOfFile();
        }
      },
      afterHead: {
        toString: function () { return "after head"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'body') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.inBody;
          // TODO(kpreid): Implement the "stuff that should be in head" case.
          } else if (tagName === 'head') {
            // "Parse error. Ignore the token."
          } else {
            insertionMode.startTag('body', []);
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'body' || tagName === 'html' || tagName === 'br') {
            insertionMode.startTag('body', []);
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.startTag('body', []);
            insertionMode.text.apply(undefined, arguments);
          } else {
            normalText(text);
          }
        },
        endOfFile: function() {
          insertionMode.startTag('body', []);
          insertionMode.endOfFile();
        }
      },
      inBody: {
        toString: function () { return "in body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            // TODO(kpreid): Implement
            // "Parse error. For each attribute on the token, check to see if
            //  the attribute is already present on the top element of the stack
            //  of open elements. If it is not, add the attribute and its
            //  corresponding value to that element."
          } else if (tagName === 'base' || tagName === 'basefont' ||
              tagName === 'bgsound'     || tagName === 'command' ||
              tagName === 'link'        || tagName === 'meta' ||
              tagName === 'noframes'    || tagName === 'script' ||
              tagName === 'style'       || tagName === 'title') {
            insertionModes.inHead.startTag.apply(undefined, arguments);
          } else if (tagName === 'body') {
            // "Parse error."
            // TODO(kpreid): Implement attribute merging etc.
          } else {
            normalInsert(tagName, attribs);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'body') {
            // Yes, we really aren't moving the insertion point.
            insertionMode = insertionModes.afterBody;
          } else if (tagName === 'html') {
            insertionMode.endTag('body');
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // TODO(kpreid): Confirm vs spec'd "Any other end tag" handling
            normalEndTag(tagName);
          }
        },
        text: function (text) {
          normalText(text);
        },
        endOfFile: function() {
          // "If there is a node in the stack of open elements that is not
          // either a dd element, a dt element, an li element, a p element, a
          // tbody element, a td element, a tfoot element, a th element, a thead
          // element, a tr element, the body element, or the html element, then
          // this is a parse error.
          //
          // Stop parsing."
          stopParsing();
        }
      },
      text: {
        // Deviation from HTML5: When handling a <script> or <style>, does not
        // actually insert text content, to prevent unsandboxed interpretation.
        toString: function () { return "text"; },
        startTag: function (tagName, attribs) {
          throw new Error("shouldn't happen: start tag <" + tagName +
              "...> while in text insertion mode for " +
              insertionPoint.tagName);
        },
        endTag: function(tagName, marker, continuation) {
          var info;
          var node = insertionPoint;
          if (tagName === 'script') {
            if (node.tagName !== 'SCRIPT') {
              throw new Error('shouldn\'t happen: end tag </' + tagName +
                  '> while in text insertion mode for ' +
                  node.tagName);
            }

            // ...

            // "Pop the current node off the stack of open elements."
            normalEndTag(tagName);

            // "Switch the insertion mode to the original insertion mode."
            insertionMode = originalInsertionMode;

            // ...

            // "Execute the script."
            info = finishCdata();
            if (info.external) {
              var res = resolveUriRelativeToDocument(info.external);
              evaluateUntrustedExternalScript(
                  res, node, marker, continuation, info.delayed);
            } else {
              evaluateUntrustedScript(
                  domicile.pseudoLocation.href, info.text, node, info.delayed);
            }
          } else {
            if (tagName === 'style') {
              info = finishCdata();
              var media = pendingMedia;
              pendingMedia = '';
              // no info.external since URL'd stylesheets are defined with
              // <link>, not <style>.
              defineUntrustedStylesheet(domicile.pseudoLocation.href,
                  info.text, node, media);
            }

            // "Pop the current node off the stack of open elements."
            normalEndTag(tagName);

            // "Switch the insertion mode to the original insertion mode."
            insertionMode = originalInsertionMode;
          }
        },
        text: function(text) {
          var inSpecial = insertionPoint.tagName === 'STYLE' ||
              insertionPoint.tagName === 'SCRIPT';
          if (inSpecial) {
            // If we were to insert this content into the DOM, it might be
            // executed outside the sandbox.
            cdataContent.push(text);
          } else {
            normalText(text);
          }
        },
        endOfFile: function() {
          // "Parse error."

          // "If the current node is a script element, mark the script element
          // as "already started"."
          // TODO(kpreid): Implement said flag.

          // "Pop the current node off the stack of open elements."
          normalEndTag(insertionPoint.tagName);

          // "Switch the insertion mode to the original insertion mode and
          // reprocess the current token."
          insertionMode = originalInsertionMode;
          insertionMode.endOfFile();
        }
      },
      afterBody: {
        toString: function () { return "after body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'html') {
            insertionMode = insertionModes.afterAfterBody;
          } else {
            insertionMode = insertionModes.inBody;
            insertionMode.endTag.apply(undefined, arguments);
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            // "Parse error."
            insertionMode = insertionModes.inBody;
          }
          insertionModes.inBody.text.apply(undefined, arguments);
        },
        endOfFile: function() {
          // "Stop parsing."
          stopParsing();
        }
      },
      afterAfterBody: {
        toString: function () { return "after after body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          // "Parse error."
          insertionMode = insertionModes.inBody;
          insertionMode.endTag.apply(undefined, arguments);
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.text.apply(undefined, arguments);
          } else {
            insertionModes.inBody.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          // "Stop parsing."
          stopParsing();
        }
      }
    };
    var insertionMode = insertionModes.initial;
    var originalInsertionMode = null;

    function docSection(el) {
      for (;;) {
        if (!el || el === base) { return ['doc', el]; }
        var tn = virtTagName(el);
        if (tn === 'html' || tn === 'head' || tn === 'body') {
          return [tn, el];
        }
        el = el.parentNode;
      }
    }

    /**
     * Given that attach() has updated the insertionPoint, change the
     * insertionMode to a suitable value.
     */
    updateInsertionMode = function updateInsertionMode_() {
      // Note: This algorithm was made from scratch and does NOT reflect the
      // HTML5 specification.

      // The basic idea is that every document must have an html
      // element that contains a head element and a body element,
      // so the current insertionMode depends on where we are in
      // the existing document, and also on what already exists
      // in the document. The complication is we want to do
      // something sensible if the document is malformed.

      var sect = docSection(insertionPoint);
      switch (sect[0]) {
        case 'doc':
          if (hasChild(sect[1], 'html')) {
            insertionMode = insertionModes.afterAfterBody;
          } else {
            insertionMode = insertionModes.beforeHtml;
          }
          break;
        case 'head':
          insertionMode = insertionModes.inHead;
          break;
        case 'body':
          insertionMode = insertionModes.inBody;
          break;
        case 'html':
          if (hasChild(sect[1], 'body')) {
            insertionMode = insertionModes.afterBody;
          } else if (hasChild(sect[1], 'head')) {
            insertionMode = insertionModes.afterHead;
          } else {
            insertionMode = insertionModes.beforeHead;
          }
          break;
        default: throw new Error('bug');
      }
    };

    notifyEOF = function notifyEOF_() {
      if (insertionPoint) {
        // Act on HTML5 "end-of-file token".
        insertionMode.endOfFile();
      }
    };

    /**
     * This corresponds to document.open() and is an extremely incomplete
     * implementation thereof.
     * http://www.whatwg.org/specs/web-apps/current-work/multipage/elements.html#dom-document-open
     */
    function reopen() {
      while (base.firstChild) {
        base.removeChild(base.firstChild);
      }
      insertionPoint = base;
      insertionMode = insertionModes.initial;
      originalInsertionMode = null;
      // no need to reinitialize idMap and detached, because this is only for
      // guest-driven writing.
    }

    var documentWriter = {
      startDoc: function() {
        // TODO(jasvir): Fix recursive document.write
        if (depth == 0) {
          documentLoaded = Q.defer();
        }
        depth++;
      },
      endDoc: function () {
        depth--;
        if (depth == 0) {
          // TODO(kpreid): I think this is wrong or at least simply unnecessary;
          // we should hook everything document-load-done-related into finish()
          // rather than bothering to 'guess' the end via nesting level here
          // Unify/reconcile the following:
          //   * this
          //   * actions taken by stopParsing()
          //   * actions taken by finish()
          documentLoaded.resolve(true);
        }
      },
      startTag: function (tagName, attribs, params, marker, continuation) {
        var schemaElem = htmlSchema.element(tagName);
        if (!schemaElem.allowed) {
          if (tagName === 'script' || tagName === 'style') {
            // Continue, let element be inserted. (Script and style elements are
            // marked as disallowed in the schema because their text content is
            // powerful, so they are explicitly special-cased in any code
            // prepared to deal with them.)
          } else if (tagName === 'base') {
            var baseHref = lookupAttr(attribs, 'href');
            if (baseHref && domicile) {
              domicile.setBaseUri(resolveUriRelativeToDocument(baseHref));
            }
            return; // TODO(kpreid): Remove, allow virtualized element
          } else if (schemaElem.shouldVirtualize) {
            // virtualization will be handled by normalInsert
          } else {
            // Ignore tags which are unsafe, not to be virtualized, and not
            // handled by one of the above special cases.
            return;
          }
        }
        insertionMode.startTag(tagName, attribs, marker, continuation);
      },
      endTag: function (tagName, optional, marker, continuation) {
        insertionMode.endTag(tagName, marker, continuation);
      },
      pcdata: function (text) {
        insertionMode.text(text);
      },
      cdata: function (text) {
        insertionMode.text(text);
      }
    };
    documentWriter.rcdata = documentWriter.pcdata;

    var htmlParser = html.makeSaxParser(documentWriter);

    // Document.write and document.writeln behave as described at
    // http://www.w3.org/TR/2009/WD-html5-20090825/embedded-content-0.html#dom-document-write
    // but with a few differences:
    // (1) all HTML written is sanitized per the opt_domicile's HTML
    //     sanitizer
    // (2) HTML written cannot change where subsequent static HTML is emitted.
    // (3) document.write cannot be used to inject scripts, so the
    //     "if there is a pending external script" does not apply.
    //     TODO(kpreid): This is going to change in the SES/client-side case.
    /**
     * A tame version of document.write.
     * @param html_varargs according to HTML5, the input to document.write is
     *     varargs, and the HTML is the concatenation of all the arguments.
     */
    var tameDocWrite = function write(htmlPieces) {
      // TODO: Do we need to fail early if documentLoaded is undefined.
      var htmlText = concat(arguments);
      if (!insertionPoint) {
        reopen();
      }
      // A <script> or <style> element started in one document.write and
      // continues in this one as in
      //   document.write('<script>foo');
      //   document.write('(bar)</script>');
      // so we need to trick the SAX parser into a CDATA context.
      if (insertionPoint.tagName === 'SCRIPT') {
        htmlText = '<script>' + htmlText;
      } else if (insertionPoint.tagName === 'STYLE') {
        htmlText = '<style>' + htmlText;
      }
      htmlParser(htmlText);
      return documentLoaded.promise;
    };
    domicile.writeHook = cajaVM.def({
      open: reopen,
      close: finish,
      write: tameDocWrite
    });
    domicile.evaluateUntrustedExternalScript =
      cajaVM.def(evaluateUntrustedExternalScript);
  })(opt_domicile);
}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['HtmlEmitter'] = HtmlEmitter;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * A lexical scannar for CSS3 as defined at http://www.w3.org/TR/css3-syntax .
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 * \@provides lexCss, decodeCss
 * \@overrides window
 */

var lexCss;
var decodeCss;

(function () {

  /**
   * Decodes an escape sequence as specified in CSS3 section 4.1.
   * http://www.w3.org/TR/css3-syntax/#characters
   * @private
   */
  function decodeCssEscape(s) {
    var i = parseInt(s.substring(1), 16);
    // If parseInt didn't find a hex diigt, it returns NaN so return the
    // escaped character.
    // Otherwise, parseInt will stop at the first non-hex digit so there's no
    // need to worry about trailing whitespace.
    if (i > 0xffff) {
      // A supplemental codepoint.
      return i -= 0x10000,
        String.fromCharCode(
            0xd800 + (i >> 10),
            0xdc00 + (i & 0x3FF));
    } else if (i == i) {
      return String.fromCharCode(i);
    } else if (s[1] < ' ') {
      // "a backslash followed by a newline is ignored".
      return '';
    } else {
      return s[1];
    }
  }

  /**
   * Returns an equivalent CSS string literal given plain text: foo -> "foo".
   * @private
   */
  function escapeCssString(s, replacer) {
    return '"' + s.replace(/[\u0000-\u001f\\\"<>]/g, replacer) + '"';
  }

  /**
   * Maps chars to CSS escaped equivalents: "\n" -> "\\a ".
   * @private
   */
  function escapeCssStrChar(ch) {
    return cssStrChars[ch]
        || (cssStrChars[ch] = '\\' + ch.charCodeAt(0).toString(16) + ' ');
  }

  /**
   * Maps chars to URI escaped equivalents: "\n" -> "%0a".
   * @private
   */
  function escapeCssUrlChar(ch) {
    return cssUrlChars[ch]
        || (cssUrlChars[ch] = (ch < '\x10' ? '%0' : '%')
            + ch.charCodeAt(0).toString(16));
  }

  /**
   * Mapping of CSS special characters to escaped equivalents.
   * @private
   */
  var cssStrChars = {
    '\\': '\\\\'
  };

  /**
   * Mapping of CSS special characters to URL-escaped equivalents.
   * @private
   */
  var cssUrlChars = {
    '\\': '%5c'
  };

  // The comments below are copied from the CSS3 module syntax at
  // http://www.w3.org/TR/css3-syntax .
  // These string constants minify out when this is run-through closure
  // compiler.
  // Rules that have been adapted have comments prefixed with "Diff:", and
  // where rules have been combined to avoid back-tracking in the regex engine
  // or to work around limitations, there is a comment prefixed with
  // "NewRule:".

  // In the below, we assume CRLF and CR have been normalize to CR.

  // wc  ::=  #x9 | #xA | #xC | #xD | #x20
  var WC = '[\\t\\n\\f ]';
  // w  ::=  wc*
  var W = WC + '*';
  // nl  ::=  #xA | #xD #xA | #xD | #xC
  var NL = '[\\n\\f]';
  // nonascii  ::=  [#x80-#xD7FF#xE000-#xFFFD#x10000-#x10FFFF]
  // NewRule: Supplemental codepoints are represented as surrogate pairs in JS.
  var SURROGATE_PAIR = '[\\ud800-\\udbff][\\udc00-\\udfff]';
  var NONASCII = '[\\u0080-\\ud7ff\\ue000-\\ufffd]|' + SURROGATE_PAIR;
  // unicode  ::=  '\' [0-9a-fA-F]{1,6} wc?
  // NewRule: No point in having ESCAPE do (\\x|\\y)
  var UNICODE_TAIL = '[0-9a-fA-F]{1,6}' + WC + '?';
  var UNICODE = '\\\\' + UNICODE_TAIL;
  // escape  ::=  unicode
  //           | '\' [#x20-#x7E#x80-#xD7FF#xE000-#xFFFD#x10000-#x10FFFF]
  // NewRule: Below we use escape tail to efficiently match an escape or a
  // line continuation so we can decode string content.
  var ESCAPE_TAIL = '(?:' + UNICODE_TAIL
      + '|[\\u0020-\\u007e\\u0080-\\ud7ff\\ue000\\ufffd]|'
      + SURROGATE_PAIR + ')';
  var ESCAPE = '\\\\' + ESCAPE_TAIL;
  // urlchar  ::=  [#x9#x21#x23-#x26#x28-#x7E] | nonascii | escape
  var URLCHAR = '(?:[\\t\\x21\\x23-\\x26\\x28-\\x5b\\x5d-\\x7e]|'
      + NONASCII + '|' + ESCAPE + ')';
  // stringchar  ::= urlchar | #x20 | '\' nl
  // We ignore mismatched surrogate pairs inside strings, so stringchar
  // simplifies to a non-(quote|newline|backslash) or backslash any.
  // Since we normalize CRLF to a single code-unit, there is no special
  // handling needed for '\\' + CRLF.
  var STRINGCHAR = '[^\'"\\n\\f\\\\]|\\\\[\\s\\S]';
  // string  ::=  '"' (stringchar | "'")* '"' | "'" (stringchar | '"')* "'"
  var STRING = '"(?:\'|' + STRINGCHAR + ')*"'
      + '|\'(?:\"|' + STRINGCHAR + ')*\'';
  // num  ::=  [0-9]+ | [0-9]* '.' [0-9]+
  // Diff: We attach signs to num tokens.
  var NUM = '[-+]?(?:[0-9]+(?:[.][0-9]+)?|[.][0-9]+)';
  // nmstart  ::=  [a-zA-Z] | '_' | nonascii | escape
  var NMSTART = '(?:[a-zA-Z_]|' + NONASCII + '|' + ESCAPE + ')';
  // nmchar  ::=  [a-zA-Z0-9] | '-' | '_' | nonascii | escape
  var NMCHAR = '(?:[a-zA-Z0-9_-]|' + NONASCII + '|' + ESCAPE + ')';
  // name  ::=  nmchar+
  var NAME = NMCHAR + '+';
  // ident  ::=  '-'? nmstart nmchar*
  var IDENT = '-?' + NMSTART + NMCHAR + '*';

  // ATKEYWORD  ::=  '@' ident
  var ATKEYWORD = '@' + IDENT;
  // HASH  ::=  '#' name
  var HASH = '#' + NAME;
  // NUMBER  ::=  num
  var NUMBER = NUM;

  // NewRule: union of IDENT, ATKEYWORD, HASH, but excluding #[0-9].
  var WORD_TERM = '(?:@?-?' + NMSTART + '|#)' + NMCHAR + '*';

  // PERCENTAGE  ::=  num '%'
  var PERCENTAGE = NUM + '%';
  // DIMENSION  ::=  num ident
  var DIMENSION = NUM + IDENT;
  var NUMERIC_VALUE = NUM + '(?:%|' + IDENT + ')?';
  // URI  ::=  "url(" w (string | urlchar* ) w ")"
  var URI = 'url[(]' + W + '(?:' + STRING + '|' + URLCHAR + '*)' + W + '[)]';
  // UNICODE-RANGE  ::=  "U+" [0-9A-F?]{1,6} ('-' [0-9A-F]{1,6})?
  var UNICODE_RANGE = 'U[+][0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?';
  // CDO  ::=  "<\!--"
  var CDO = '<\!--';
  // CDC  ::=  "-->"
  var CDC = '-->';
  // S  ::=  wc+
  var S = WC + '+';
  // COMMENT  ::=  "/*" [^*]* '*'+ ([^/] [^*]* '*'+)* "/"
  // Diff: recognizes // comments.
  var COMMENT = '/(?:[*][^*]*[*]+(?:[^/][^*]*[*]+)*/|/[^\\n\\f]*)';
  // FUNCTION  ::=  ident '('
  // Diff: We exclude url explicitly.
  // TODO: should we be tolerant of "fn ("?
  var FUNCTION = '(?!url[(])' + IDENT + '[(]';
  // INCLUDES  ::=  "~="
  var INCLUDES = '~=';
  // DASHMATCH  ::=  "|="
  var DASHMATCH = '[|]=';
  // PREFIXMATCH  ::=  "^="
  var PREFIXMATCH = '[^]=';
  // SUFFIXMATCH  ::=  "$="
  var SUFFIXMATCH = '[$]=';
  // SUBSTRINGMATCH  ::=  "*="
  var SUBSTRINGMATCH = '[*]=';
  // NewRule: one rule for all the comparison operators.
  var CMP_OPS = '[~|^$*]=';
  // CHAR  ::=  any character not matched by the above rules, except for " or '
  // Diff: We exclude / and \ since they are handled above to prevent
  // /* without a following */ from combining when comments are concatenated.
  var CHAR = '[^"\'\\\\/]|/(?![/*])';
  // BOM  ::=  #xFEFF
  var BOM = '\\uFEFF';

  var CSS_TOKEN = new RegExp([
      BOM, UNICODE_RANGE, URI, FUNCTION, WORD_TERM, STRING, NUMERIC_VALUE,
      CDO, CDC, S, COMMENT, CMP_OPS, CHAR].join("|"), 'gi');

  var CSS_DECODER = new RegExp('\\\\(?:' + ESCAPE_TAIL + '|' + NL + ')', 'g');
  var URL_RE = new RegExp('^url\\(' + W + '["\']?|["\']?' + W + '\\)$', 'gi');
  /**
   * Decodes CSS escape sequences in a CSS string body.
   */
   decodeCss = function (css) {
     return css.replace(CSS_DECODER, decodeCssEscape);
   };

  /**
   * Given CSS Text, returns an array of normalized tokens.
   * @param {string} cssText
   * @return {Array.<string>} tokens where all ignorable token sequences have
   *    been reduced to a single {@code " "} and all strings and
   *    {@code url(...)} tokens have been normalized to use double quotes as
   *    delimiters and to not otherwise contain double quotes.
   */
  lexCss = function (cssText) {
    cssText = '' + cssText;
    var tokens = cssText.replace(/\r\n?/g, '\n')  // Normalize CRLF & CR to LF.
        .match(CSS_TOKEN) || [];
    var j = 0;
    var last = ' ';
    for (var i = 0, n = tokens.length; i < n; ++i) {
      // Normalize all escape sequences.  We will have to re-escape some
      // codepoints in string and url(...) bodies but we already know the
      // boundaries.
      // We might mistakenly treat a malformed identifier like \22\20\22 as a
      // string, but that will not break any valid stylesheets since we requote
      // and re-escape in string below.
      var tok = decodeCss(tokens[i]);
      var len = tok.length;
      var cc = tok.charCodeAt(0);
      tok =
          // All strings should be double quoted, and the body should never
          // contain a double quote.
          (cc == '"'.charCodeAt(0) || cc == '\''.charCodeAt(0))
          ? escapeCssString(tok.substring(1, len - 1), escapeCssStrChar)
          // A breaking ignorable token should is replaced with a single space.
          : (cc == '/'.charCodeAt(0) && len > 1  // Comment.
             || tok == '\\' || tok == CDC || tok == CDO || tok == '\ufeff'
             // Characters in W.
             || cc <= ' '.charCodeAt(0))
          ? ' '
          // Make sure that all url(...)s are double quoted.
          : /url\(/i.test(tok)
          ? 'url(' + escapeCssString(
            tok.replace(URL_RE, ''),
            escapeCssUrlChar)
            + ')'
          // Escapes in identifier like tokens will have been normalized above.
          : tok;
      // Merge adjacent space tokens.
      if (last != tok || tok != ' ') {
        tokens[j++] = last = tok;
      }
    }
    tokens.length = j;
    return tokens;
  };
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['lexCss'] = lexCss;
  window['decodeCss'] = decodeCss;
}
;
// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Implements RFC 3986 for parsing/formatting URIs.
 *
 * @author mikesamuel@gmail.com
 * \@provides URI
 * \@overrides window
 */

var URI = (function () {

/**
 * creates a uri from the string form.  The parser is relaxed, so special
 * characters that aren't escaped but don't cause ambiguities will not cause
 * parse failures.
 *
 * @return {URI|null}
 */
function parse(uriStr) {
  var m = ('' + uriStr).match(URI_RE_);
  if (!m) { return null; }
  return new URI(
      nullIfAbsent(m[1]),
      nullIfAbsent(m[2]),
      nullIfAbsent(m[3]),
      nullIfAbsent(m[4]),
      nullIfAbsent(m[5]),
      nullIfAbsent(m[6]),
      nullIfAbsent(m[7]));
}


/**
 * creates a uri from the given parts.
 *
 * @param scheme {string} an unencoded scheme such as "http" or null
 * @param credentials {string} unencoded user credentials or null
 * @param domain {string} an unencoded domain name or null
 * @param port {number} a port number in [1, 32768].
 *    -1 indicates no port, as does null.
 * @param path {string} an unencoded path
 * @param query {Array.<string>|string|null} a list of unencoded cgi
 *   parameters where even values are keys and odds the corresponding values
 *   or an unencoded query.
 * @param fragment {string} an unencoded fragment without the "#" or null.
 * @return {URI}
 */
function create(scheme, credentials, domain, port, path, query, fragment) {
  var uri = new URI(
      encodeIfExists2(scheme, URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_),
      encodeIfExists2(
          credentials, URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_),
      encodeIfExists(domain),
      port > 0 ? port.toString() : null,
      encodeIfExists2(path, URI_DISALLOWED_IN_PATH_),
      null,
      encodeIfExists(fragment));
  if (query) {
    if ('string' === typeof query) {
      uri.setRawQuery(query.replace(/[^?&=0-9A-Za-z_\-~.%]/g, encodeOne));
    } else {
      uri.setAllParameters(query);
    }
  }
  return uri;
}
function encodeIfExists(unescapedPart) {
  if ('string' == typeof unescapedPart) {
    return encodeURIComponent(unescapedPart);
  }
  return null;
};
/**
 * if unescapedPart is non null, then escapes any characters in it that aren't
 * valid characters in a url and also escapes any special characters that
 * appear in extra.
 *
 * @param unescapedPart {string}
 * @param extra {RegExp} a character set of characters in [\01-\177].
 * @return {string|null} null iff unescapedPart == null.
 */
function encodeIfExists2(unescapedPart, extra) {
  if ('string' == typeof unescapedPart) {
    return encodeURI(unescapedPart).replace(extra, encodeOne);
  }
  return null;
};
/** converts a character in [\01-\177] to its url encoded equivalent. */
function encodeOne(ch) {
  var n = ch.charCodeAt(0);
  return '%' + '0123456789ABCDEF'.charAt((n >> 4) & 0xf) +
      '0123456789ABCDEF'.charAt(n & 0xf);
}

/**
 * {@updoc
 *  $ normPath('foo/./bar')
 *  # 'foo/bar'
 *  $ normPath('./foo')
 *  # 'foo'
 *  $ normPath('foo/.')
 *  # 'foo'
 *  $ normPath('foo//bar')
 *  # 'foo/bar'
 * }
 */
function normPath(path) {
  return path.replace(/(^|\/)\.(?:\/|$)/g, '$1').replace(/\/{2,}/g, '/');
}

var PARENT_DIRECTORY_HANDLER = new RegExp(
    ''
    // A path break
    + '(/|^)'
    // followed by a non .. path element
    // (cannot be . because normPath is used prior to this RegExp)
    + '(?:[^./][^/]*|\\.{2,}(?:[^./][^/]*)|\\.{3,}[^/]*)'
    // followed by .. followed by a path break.
    + '/\\.\\.(?:/|$)');

var PARENT_DIRECTORY_HANDLER_RE = new RegExp(PARENT_DIRECTORY_HANDLER);

var EXTRA_PARENT_PATHS_RE = /^(?:\.\.\/)*(?:\.\.$)?/;

/**
 * Normalizes its input path and collapses all . and .. sequences except for
 * .. sequences that would take it above the root of the current parent
 * directory.
 * {@updoc
 *  $ collapse_dots('foo/../bar')
 *  # 'bar'
 *  $ collapse_dots('foo/./bar')
 *  # 'foo/bar'
 *  $ collapse_dots('foo/../bar/./../../baz')
 *  # 'baz'
 *  $ collapse_dots('../foo')
 *  # '../foo'
 *  $ collapse_dots('../foo').replace(EXTRA_PARENT_PATHS_RE, '')
 *  # 'foo'
 * }
 */
function collapse_dots(path) {
  if (path === null) { return null; }
  var p = normPath(path);
  // Only /../ left to flatten
  var r = PARENT_DIRECTORY_HANDLER_RE;
  // We replace with $1 which matches a / before the .. because this
  // guarantees that:
  // (1) we have at most 1 / between the adjacent place,
  // (2) always have a slash if there is a preceding path section, and
  // (3) we never turn a relative path into an absolute path.
  for (var q; (q = p.replace(r, '$1')) != p; p = q) {};
  return p;
}

/**
 * resolves a relative url string to a base uri.
 * @return {URI}
 */
function resolve(baseUri, relativeUri) {
  // there are several kinds of relative urls:
  // 1. //foo - replaces everything from the domain on.  foo is a domain name
  // 2. foo - replaces the last part of the path, the whole query and fragment
  // 3. /foo - replaces the the path, the query and fragment
  // 4. ?foo - replace the query and fragment
  // 5. #foo - replace the fragment only

  var absoluteUri = baseUri.clone();
  // we satisfy these conditions by looking for the first part of relativeUri
  // that is not blank and applying defaults to the rest

  var overridden = relativeUri.hasScheme();

  if (overridden) {
    absoluteUri.setRawScheme(relativeUri.getRawScheme());
  } else {
    overridden = relativeUri.hasCredentials();
  }

  if (overridden) {
    absoluteUri.setRawCredentials(relativeUri.getRawCredentials());
  } else {
    overridden = relativeUri.hasDomain();
  }

  if (overridden) {
    absoluteUri.setRawDomain(relativeUri.getRawDomain());
  } else {
    overridden = relativeUri.hasPort();
  }

  var rawPath = relativeUri.getRawPath();
  var simplifiedPath = collapse_dots(rawPath);
  if (overridden) {
    absoluteUri.setPort(relativeUri.getPort());
    simplifiedPath = simplifiedPath
        && simplifiedPath.replace(EXTRA_PARENT_PATHS_RE, '');
  } else {
    overridden = !!rawPath;
    if (overridden) {
      // resolve path properly
      if (simplifiedPath.charCodeAt(0) !== 0x2f /* / */) {  // path is relative
        var absRawPath = collapse_dots(absoluteUri.getRawPath() || '')
            .replace(EXTRA_PARENT_PATHS_RE, '');
        var slash = absRawPath.lastIndexOf('/') + 1;
        simplifiedPath = collapse_dots(
            (slash ? absRawPath.substring(0, slash) : '')
            + collapse_dots(rawPath))
            .replace(EXTRA_PARENT_PATHS_RE, '');
      }
    } else {
      simplifiedPath = simplifiedPath
          && simplifiedPath.replace(EXTRA_PARENT_PATHS_RE, '');
      if (simplifiedPath !== rawPath) {
        absoluteUri.setRawPath(simplifiedPath);
      }
    }
  }

  if (overridden) {
    absoluteUri.setRawPath(simplifiedPath);
  } else {
    overridden = relativeUri.hasQuery();
  }

  if (overridden) {
    absoluteUri.setRawQuery(relativeUri.getRawQuery());
  } else {
    overridden = relativeUri.hasFragment();
  }

  if (overridden) {
    absoluteUri.setRawFragment(relativeUri.getRawFragment());
  }

  return absoluteUri;
}

/**
 * a mutable URI.
 *
 * This class contains setters and getters for the parts of the URI.
 * The <tt>getXYZ</tt>/<tt>setXYZ</tt> methods return the decoded part -- so
 * <code>uri.parse('/foo%20bar').getPath()</code> will return the decoded path,
 * <tt>/foo bar</tt>.
 *
 * <p>The raw versions of fields are available too.
 * <code>uri.parse('/foo%20bar').getRawPath()</code> will return the raw path,
 * <tt>/foo%20bar</tt>.  Use the raw setters with care, since
 * <code>URI::toString</code> is not guaranteed to return a valid url if a
 * raw setter was used.
 *
 * <p>All setters return <tt>this</tt> and so may be chained, a la
 * <code>uri.parse('/foo').setFragment('part').toString()</code>.
 *
 * <p>You should not use this constructor directly -- please prefer the factory
 * functions {@link uri.parse}, {@link uri.create}, {@link uri.resolve}
 * instead.</p>
 *
 * <p>The parameters are all raw (assumed to be properly escaped) parts, and
 * any (but not all) may be null.  Undefined is not allowed.</p>
 *
 * @constructor
 */
function URI(
    rawScheme,
    rawCredentials, rawDomain, port,
    rawPath, rawQuery, rawFragment) {
  this.scheme_ = rawScheme;
  this.credentials_ = rawCredentials;
  this.domain_ = rawDomain;
  this.port_ = port;
  this.path_ = rawPath;
  this.query_ = rawQuery;
  this.fragment_ = rawFragment;
  /**
   * @type {Array|null}
   */
  this.paramCache_ = null;
}

/** returns the string form of the url. */
URI.prototype.toString = function () {
  var out = [];
  if (null !== this.scheme_) { out.push(this.scheme_, ':'); }
  if (null !== this.domain_) {
    out.push('//');
    if (null !== this.credentials_) { out.push(this.credentials_, '@'); }
    out.push(this.domain_);
    if (null !== this.port_) { out.push(':', this.port_.toString()); }
  }
  if (null !== this.path_) { out.push(this.path_); }
  if (null !== this.query_) { out.push('?', this.query_); }
  if (null !== this.fragment_) { out.push('#', this.fragment_); }
  return out.join('');
};

URI.prototype.clone = function () {
  return new URI(this.scheme_, this.credentials_, this.domain_, this.port_,
                 this.path_, this.query_, this.fragment_);
};

URI.prototype.getScheme = function () {
  // HTML5 spec does not require the scheme to be lowercased but
  // all common browsers except Safari lowercase the scheme.
  return this.scheme_ && decodeURIComponent(this.scheme_).toLowerCase();
};
URI.prototype.getRawScheme = function () {
  return this.scheme_;
};
URI.prototype.setScheme = function (newScheme) {
  this.scheme_ = encodeIfExists2(
      newScheme, URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_);
  return this;
};
URI.prototype.setRawScheme = function (newScheme) {
  this.scheme_ = newScheme ? newScheme : null;
  return this;
};
URI.prototype.hasScheme = function () {
  return null !== this.scheme_;
};


URI.prototype.getCredentials = function () {
  return this.credentials_ && decodeURIComponent(this.credentials_);
};
URI.prototype.getRawCredentials = function () {
  return this.credentials_;
};
URI.prototype.setCredentials = function (newCredentials) {
  this.credentials_ = encodeIfExists2(
      newCredentials, URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_);

  return this;
};
URI.prototype.setRawCredentials = function (newCredentials) {
  this.credentials_ = newCredentials ? newCredentials : null;
  return this;
};
URI.prototype.hasCredentials = function () {
  return null !== this.credentials_;
};


URI.prototype.getDomain = function () {
  return this.domain_ && decodeURIComponent(this.domain_);
};
URI.prototype.getRawDomain = function () {
  return this.domain_;
};
URI.prototype.setDomain = function (newDomain) {
  return this.setRawDomain(newDomain && encodeURIComponent(newDomain));
};
URI.prototype.setRawDomain = function (newDomain) {
  this.domain_ = newDomain ? newDomain : null;
  // Maintain the invariant that paths must start with a slash when the URI
  // is not path-relative.
  return this.setRawPath(this.path_);
};
URI.prototype.hasDomain = function () {
  return null !== this.domain_;
};


URI.prototype.getPort = function () {
  return this.port_ && decodeURIComponent(this.port_);
};
URI.prototype.setPort = function (newPort) {
  if (newPort) {
    newPort = Number(newPort);
    if (newPort !== (newPort & 0xffff)) {
      throw new Error('Bad port number ' + newPort);
    }
    this.port_ = '' + newPort;
  } else {
    this.port_ = null;
  }
  return this;
};
URI.prototype.hasPort = function () {
  return null !== this.port_;
};


URI.prototype.getPath = function () {
  return this.path_ && decodeURIComponent(this.path_);
};
URI.prototype.getRawPath = function () {
  return this.path_;
};
URI.prototype.setPath = function (newPath) {
  return this.setRawPath(encodeIfExists2(newPath, URI_DISALLOWED_IN_PATH_));
};
URI.prototype.setRawPath = function (newPath) {
  if (newPath) {
    newPath = String(newPath);
    this.path_ = 
      // Paths must start with '/' unless this is a path-relative URL.
      (!this.domain_ || /^\//.test(newPath)) ? newPath : '/' + newPath;
  } else {
    this.path_ = null;
  }
  return this;
};
URI.prototype.hasPath = function () {
  return null !== this.path_;
};


URI.prototype.getQuery = function () {
  // From http://www.w3.org/Addressing/URL/4_URI_Recommentations.html
  // Within the query string, the plus sign is reserved as shorthand notation
  // for a space.
  return this.query_ && decodeURIComponent(this.query_).replace(/\+/g, ' ');
};
URI.prototype.getRawQuery = function () {
  return this.query_;
};
URI.prototype.setQuery = function (newQuery) {
  this.paramCache_ = null;
  this.query_ = encodeIfExists(newQuery);
  return this;
};
URI.prototype.setRawQuery = function (newQuery) {
  this.paramCache_ = null;
  this.query_ = newQuery ? newQuery : null;
  return this;
};
URI.prototype.hasQuery = function () {
  return null !== this.query_;
};

/**
 * sets the query given a list of strings of the form
 * [ key0, value0, key1, value1, ... ].
 *
 * <p><code>uri.setAllParameters(['a', 'b', 'c', 'd']).getQuery()</code>
 * will yield <code>'a=b&c=d'</code>.
 */
URI.prototype.setAllParameters = function (params) {
  if (typeof params === 'object') {
    if (!(params instanceof Array)
        && (params instanceof Object
            || Object.prototype.toString.call(params) !== '[object Array]')) {
      var newParams = [];
      var i = -1;
      for (var k in params) {
        var v = params[k];
        if ('string' === typeof v) {
          newParams[++i] = k;
          newParams[++i] = v;
        }
      }
      params = newParams;
    }
  }
  this.paramCache_ = null;
  var queryBuf = [];
  var separator = '';
  for (var j = 0; j < params.length;) {
    var k = params[j++];
    var v = params[j++];
    queryBuf.push(separator, encodeURIComponent(k.toString()));
    separator = '&';
    if (v) {
      queryBuf.push('=', encodeURIComponent(v.toString()));
    }
  }
  this.query_ = queryBuf.join('');
  return this;
};
URI.prototype.checkParameterCache_ = function () {
  if (!this.paramCache_) {
    var q = this.query_;
    if (!q) {
      this.paramCache_ = [];
    } else {
      var cgiParams = q.split(/[&\?]/);
      var out = [];
      var k = -1;
      for (var i = 0; i < cgiParams.length; ++i) {
        var m = cgiParams[i].match(/^([^=]*)(?:=(.*))?$/);
        // From http://www.w3.org/Addressing/URL/4_URI_Recommentations.html
        // Within the query string, the plus sign is reserved as shorthand
        // notation for a space.
        out[++k] = decodeURIComponent(m[1]).replace(/\+/g, ' ');
        out[++k] = decodeURIComponent(m[2] || '').replace(/\+/g, ' ');
      }
      this.paramCache_ = out;
    }
  }
};
/**
 * sets the values of the named cgi parameters.
 *
 * <p>So, <code>uri.parse('foo?a=b&c=d&e=f').setParameterValues('c', ['new'])
 * </code> yields <tt>foo?a=b&c=new&e=f</tt>.</p>
 *
 * @param key {string}
 * @param values {Array.<string>} the new values.  If values is a single string
 *   then it will be treated as the sole value.
 */
URI.prototype.setParameterValues = function (key, values) {
  // be nice and avoid subtle bugs where [] operator on string performs charAt
  // on some browsers and crashes on IE
  if (typeof values === 'string') {
    values = [ values ];
  }

  this.checkParameterCache_();
  var newValueIndex = 0;
  var pc = this.paramCache_;
  var params = [];
  for (var i = 0, k = 0; i < pc.length; i += 2) {
    if (key === pc[i]) {
      if (newValueIndex < values.length) {
        params.push(key, values[newValueIndex++]);
      }
    } else {
      params.push(pc[i], pc[i + 1]);
    }
  }
  while (newValueIndex < values.length) {
    params.push(key, values[newValueIndex++]);
  }
  this.setAllParameters(params);
  return this;
};
URI.prototype.removeParameter = function (key) {
  return this.setParameterValues(key, []);
};
/**
 * returns the parameters specified in the query part of the uri as a list of
 * keys and values like [ key0, value0, key1, value1, ... ].
 *
 * @return {Array.<string>}
 */
URI.prototype.getAllParameters = function () {
  this.checkParameterCache_();
  return this.paramCache_.slice(0, this.paramCache_.length);
};
/**
 * returns the value<b>s</b> for a given cgi parameter as a list of decoded
 * query parameter values.
 * @return {Array.<string>}
 */
URI.prototype.getParameterValues = function (paramNameUnescaped) {
  this.checkParameterCache_();
  var values = [];
  for (var i = 0; i < this.paramCache_.length; i += 2) {
    if (paramNameUnescaped === this.paramCache_[i]) {
      values.push(this.paramCache_[i + 1]);
    }
  }
  return values;
};
/**
 * returns a map of cgi parameter names to (non-empty) lists of values.
 * @return {Object.<string,Array.<string>>}
 */
URI.prototype.getParameterMap = function (paramNameUnescaped) {
  this.checkParameterCache_();
  var paramMap = {};
  for (var i = 0; i < this.paramCache_.length; i += 2) {
    var key = this.paramCache_[i++],
      value = this.paramCache_[i++];
    if (!(key in paramMap)) {
      paramMap[key] = [value];
    } else {
      paramMap[key].push(value);
    }
  }
  return paramMap;
};
/**
 * returns the first value for a given cgi parameter or null if the given
 * parameter name does not appear in the query string.
 * If the given parameter name does appear, but has no '<tt>=</tt>' following
 * it, then the empty string will be returned.
 * @return {string|null}
 */
URI.prototype.getParameterValue = function (paramNameUnescaped) {
  this.checkParameterCache_();
  for (var i = 0; i < this.paramCache_.length; i += 2) {
    if (paramNameUnescaped === this.paramCache_[i]) {
      return this.paramCache_[i + 1];
    }
  }
  return null;
};

URI.prototype.getFragment = function () {
  return this.fragment_ && decodeURIComponent(this.fragment_);
};
URI.prototype.getRawFragment = function () {
  return this.fragment_;
};
URI.prototype.setFragment = function (newFragment) {
  this.fragment_ = newFragment ? encodeURIComponent(newFragment) : null;
  return this;
};
URI.prototype.setRawFragment = function (newFragment) {
  this.fragment_ = newFragment ? newFragment : null;
  return this;
};
URI.prototype.hasFragment = function () {
  return null !== this.fragment_;
};

function nullIfAbsent(matchPart) {
  return ('string' == typeof matchPart) && (matchPart.length > 0)
         ? matchPart
         : null;
}




/**
 * a regular expression for breaking a URI into its component parts.
 *
 * <p>http://www.gbiv.com/protocols/uri/rfc/rfc3986.html#RFC2234 says
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * <p>The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * <p>The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * <p>msamuel: I have modified the regular expression slightly to expose the
 * credentials, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       credentials -\
 *    $3 = www.ics.uci.edu   domain       | authority
 *    $4 = <undefined>       port        -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 */
var URI_RE_ = new RegExp(
      "^" +
      "(?:" +
        "([^:/?#]+)" +         // scheme
      ":)?" +
      "(?://" +
        "(?:([^/?#]*)@)?" +    // credentials
        "([^/?#:@]*)" +        // domain
        "(?::([0-9]+))?" +     // port
      ")?" +
      "([^?#]+)?" +            // path
      "(?:\\?([^#]*))?" +      // query
      "(?:#(.*))?" +           // fragment
      "$"
      );

var URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_ = /[#\/\?@]/g;
var URI_DISALLOWED_IN_PATH_ = /[\#\?]/g;

URI.parse = parse;
URI.create = create;
URI.resolve = resolve;
URI.collapse_dots = collapse_dots;  // Visible for testing.

// lightweight string-based api for loadModuleMaker
URI.utils = {
  mimeTypeOf: function (uri) {
    var uriObj = parse(uri);
    if (/\.html$/.test(uriObj.getPath())) {
      return 'text/html';
    } else {
      return 'application/javascript';
    }
  },
  resolve: function (base, uri) {
    if (base) {
      return resolve(parse(base), parse(uri)).toString();
    } else {
      return '' + uri;
    }
  }
};


return URI;
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['URI'] = URI;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * JavaScript support for client-side CSS sanitization.
 * The CSS property schema API is defined in CssPropertyPatterns.java which
 * is used to generate css-defs.js.
 *
 * @author mikesamuel@gmail.com
 * \@requires CSS_PROP_BIT_GLOBAL_NAME
 * \@requires CSS_PROP_BIT_HASH_VALUE
 * \@requires CSS_PROP_BIT_NEGATIVE_QUANTITY
 * \@requires CSS_PROP_BIT_PROPERTY_NAME
 * \@requires CSS_PROP_BIT_QUANTITY
 * \@requires CSS_PROP_BIT_QSTRING
 * \@requires CSS_PROP_BIT_UNRESERVED_WORD
 * \@requires CSS_PROP_BIT_URL
 * \@requires cssSchema
 * \@requires decodeCss
 * \@requires html4
 * \@requires URI
 * \@overrides window
 * \@requires parseCssStylesheet
 * \@provides sanitizeCssProperty
 * \@provides sanitizeCssSelectorList
 * \@provides sanitizeStylesheet
 * \@provides sanitizeStylesheetWithExternals
 * \@provides sanitizeMediaQuery
 */

var sanitizeCssProperty = undefined;
var sanitizeCssSelectorList = undefined;
var sanitizeStylesheet = undefined;
var sanitizeStylesheetWithExternals = undefined;
var sanitizeMediaQuery = undefined;

(function () {
  var NOEFFECT_URL = 'url("about:blank")';
  /**
   * The set of characters that need to be normalized inside url("...").
   * We normalize newlines because they are not allowed inside quoted strings,
   * normalize quote characters, angle-brackets, and asterisks because they
   * could be used to break out of the URL or introduce targets for CSS
   * error recovery.  We normalize parentheses since they delimit unquoted
   * URLs and calls and could be a target for error recovery.
   */
  var NORM_URL_REGEXP = /[\n\f\r\"\'()*<>]/g;
  /** The replacements for NORM_URL_REGEXP. */
  var NORM_URL_REPLACEMENTS = {
    '\n': '%0a',
    '\f': '%0c',
    '\r': '%0d',
    '"':  '%22',
    '\'': '%27',
    '(':  '%28',
    ')':  '%29',
    '*':  '%2a',
    '<':  '%3c',
    '>':  '%3e'
  };

  function normalizeUrl(s) {
    if ('string' === typeof s) {
      return 'url("' + s.replace(NORM_URL_REGEXP, normalizeUrlChar) + '")';
    } else {
      return NOEFFECT_URL;
    }
  }
  function normalizeUrlChar(ch) {
    return NORM_URL_REPLACEMENTS[ch];
  }

  // From RFC3986
  var URI_SCHEME_RE = new RegExp(
      '^' +
      '(?:' +
        '([^:\/?# ]+)' +         // scheme
      ':)?'
  );

  var ALLOWED_URI_SCHEMES = /^(?:https?|mailto)$/i;

  function resolveUri(baseUri, uri) {
    if (baseUri) {
      return URI.utils.resolve(baseUri, uri);
    }
    return uri;
  }

  function safeUri(uri, prop, naiveUriRewriter) {
    if (!naiveUriRewriter) { return null; }
    var parsed = ('' + uri).match(URI_SCHEME_RE);
    if (parsed && (!parsed[1] || ALLOWED_URI_SCHEMES.test(parsed[1]))) {
      return naiveUriRewriter(uri, prop);
    } else {
      return null;
    }
  }

  function withoutVendorPrefix(ident) {
    // http://stackoverflow.com/a/5411098/20394 has a fairly extensive list
    // of vendor prefices.
    // Blink has not declared a vendor prefix distinct from -webkit-
    // and http://css-tricks.com/tldr-on-vendor-prefix-drama/ discusses
    // how Mozilla recognizes some -webkit-
    // http://wiki.csswg.org/spec/vendor-prefixes talks more about
    // cross-implementation, and lists other prefixes.
    // Note: info is duplicated in CssValidator.java
    return ident.replace(
        /^-(?:apple|css|epub|khtml|moz|mso?|o|rim|wap|webkit|xv)-(?=[a-z])/, '');
  }

  /**
   * Given a series of normalized CSS tokens, applies a property schema, as
   * defined in CssPropertyPatterns.java, and sanitizes the tokens in place.
   * @param property a property name.
   * @param tokens as parsed by lexCss.  Modified in place.
   * @param opt_naiveUriRewriter a URI rewriter; an object with a "rewrite"
   *     function that takes a URL and returns a safe URL.
   * @param opt_baseURI a URI against which all relative URLs in tokens will
   *     be resolved.
   * @param opt_idSuffix {string} appended to all IDs to scope them.
   */
  sanitizeCssProperty = (function () {

    function unionArrays(arrs) {
      var map = {};
      for (var i = arrs.length; --i >= 0;) {
        var arr = arrs[i];
        for (var j = arr.length; --j >= 0;) {
          map[arr[j]] = ALLOWED_LITERAL;
        }
      }
      return map;
    }

    // Used as map value to avoid hasOwnProperty checks.
    var ALLOWED_LITERAL = {};

    return function sanitize(
        property, tokens, opt_naiveUriRewriter, opt_baseUri, opt_idSuffix) {

      var propertyKey = withoutVendorPrefix(property);
      var propertySchema = cssSchema[propertyKey];

      // If the property isn't recognized, elide all tokens.
      if (!propertySchema || 'object' !== typeof propertySchema) {
        tokens.length = 0;
        return;
      }

      var propBits = propertySchema['cssPropBits'];

      /**
       * Recurse to apply the appropriate function schema to the function call
       * that starts at {@code tokens[start]}.
       * @param {Array.<string>} tokens an array of CSS token that is modified
       *   in place so that all tokens involved in the function call
       *   (from {@code tokens[start]} to a close parenthesis) are folded to
       *   one token.
       * @param {number} start an index into tokens of a function token like
       *   {@code 'name('}.
       * @return the replacement function or the empty string if the function
       *   call is not both well-formed and allowed.
       */
      function sanitizeFunctionCall(tokens, start) {
        var parenDepth = 1, end = start + 1, n = tokens.length;
        while (end < n && parenDepth) {
          var token = tokens[end++];
          // Decrement if we see a close parenthesis, and increment if we
          // see a function.  Since url(...) are whole tokens, they will not
          // affect the token scanning.
          parenDepth += (token === ')' ? -1 : /^[^"']*\($/.test(token));
        }
        // Allow error-recovery from unclosed functions by ignoring the call and
        // so allowing resumption at the next ';'.
        if (!parenDepth) {
          var fnToken = tokens[start].toLowerCase();
          var bareFnToken = withoutVendorPrefix(fnToken);
          // Cut out the originals, so the caller can step by one token.
          var fnTokens = tokens.splice(start, end - start, '');
          var fns = propertySchema['cssFns'];
          // Look for a function that matches the name.
          for (var i = 0, nFns = fns.length; i < nFns; ++i) {
            if (fns[i].substring(0, bareFnToken.length) == bareFnToken) {
              fnTokens[0] = fnTokens[fnTokens.length - 1] = '';
              // Recurse and sanitize the function parameters.
              sanitize(
                fns[i],
                // The actual parameters to the function.
                fnTokens,
                opt_naiveUriRewriter, opt_baseUri);
              // Reconstitute the function from its parameter tokens.
              return fnToken + fnTokens.join(' ') + ')';
            }
          }
        }
        return '';
      }

      // Used to determine whether to treat quoted strings as URLs or
      // plain text content, and whether unrecognized keywords can be quoted
      // to treat ['Arial', 'Black'] equivalently to ['"Arial Black"'].
      var stringDisposition =
        propBits & (CSS_PROP_BIT_URL | CSS_PROP_BIT_UNRESERVED_WORD);
      // Used to determine what to do with unreserved words.
      var identDisposition =
        propBits & (CSS_PROP_BIT_GLOBAL_NAME | CSS_PROP_BIT_PROPERTY_NAME);

      // Used to join unquoted keywords into a single quoted string.
      var lastQuoted = NaN;
      var i = 0, k = 0;
      for (;i < tokens.length; ++i) {
        // Has the effect of normalizing hex digits, keywords,
        // and function names.
        var token = tokens[i].toLowerCase();
        var cc = token.charCodeAt(0), cc1, cc2, isnum1, isnum2, end;
        var litGroup, litMap;
        token = (

          // Strip out spaces.  Normally cssparser.js dumps these, but we
          // strip them out in case the content doesn't come via cssparser.js.
          (cc === ' '.charCodeAt(0)) ? ''
          : (cc === '"'.charCodeAt(0)) ? (  // Quoted string.
            (stringDisposition === CSS_PROP_BIT_URL)
            ? (opt_naiveUriRewriter
               // Sanitize and convert to url("...") syntax.
               // Treat url content as case-sensitive.
               ? (normalizeUrl(
                   // Rewrite to a safe URI.
                   safeUri(
                     // Convert to absolute URL
                     resolveUri(
                       opt_baseUri,
                       // Strip off quotes
                       decodeCss(tokens[i].substring(1, token.length - 1))),
                     propertyKey,
                     opt_naiveUriRewriter)))
              : '')
            : ((propBits & CSS_PROP_BIT_QSTRING)
               // Ambiguous when more than one bit set in disposition.
               && !(stringDisposition & (stringDisposition - 1)))
            ? token
            // Drop if quoted strings not allowed.
            : ''
          )

          // inherit is always allowed.
          : token === 'inherit'
          ? token

          : (
            litGroup = propertySchema['cssLitGroup'],
            litMap = (litGroup
                      ? (propertySchema['cssLitMap']
                         // Lazily compute the union from litGroup.
                         || (propertySchema['cssLitMap'] =
                             unionArrays(litGroup)))
                      : ALLOWED_LITERAL),  // A convenient empty object.
            (litMap[withoutVendorPrefix(token)] === ALLOWED_LITERAL)
          )
          // Token is in the literal map or matches extra.
          ? token

          // Preserve hash color literals if allowed.
          : (cc === '#'.charCodeAt(0) && /^#(?:[0-9a-f]{3}){1,2}$/.test(token))
          ? (propBits & CSS_PROP_BIT_HASH_VALUE ? token : '')

          : ('0'.charCodeAt(0) <= cc && cc <= '9'.charCodeAt(0))
          // A number starting with a digit.
          ? ((propBits & CSS_PROP_BIT_QUANTITY) ? token : '')

          // Normalize quantities so they don't start with a '.' or '+' sign and
          // make sure they all have an integer component so can't be confused
          // with a dotted identifier.
          // This can't be done in the lexer since ".4" is a valid rule part.
          : (cc1 = token.charCodeAt(1),
             cc2 = token.charCodeAt(2),
             isnum1 = '0'.charCodeAt(0) <= cc1 && cc1 <= '9'.charCodeAt(0),
             isnum2 = '0'.charCodeAt(0) <= cc2 && cc2 <= '9'.charCodeAt(0),
             // +.5 -> 0.5 if allowed.
             (cc === '+'.charCodeAt(0)
              && (isnum1 || (cc1 === '.'.charCodeAt(0) && isnum2))))
          ? ((propBits & CSS_PROP_BIT_QUANTITY)
            ? ((isnum1 ? '' : '0') + token.substring(1))
            : '')

          // -.5 -> -0.5 if allowed otherwise -> 0 if quantities allowed.
          : (cc === '-'.charCodeAt(0)
             && (isnum1 || (cc1 === '.'.charCodeAt(0) && isnum2)))
            ? ((propBits & CSS_PROP_BIT_NEGATIVE_QUANTITY)
               ? ((isnum1 ? '-' : '-0') + token.substring(1))
               : ((propBits & CSS_PROP_BIT_QUANTITY) ? '0' : ''))

          // .5 -> 0.5 if allowed.
          : (cc === '.'.charCodeAt(0) && isnum1)
          ? ((propBits & CSS_PROP_BIT_QUANTITY) ? '0' + token : '')

          // Handle url("...") by rewriting the body.
          : ('url("' === token.substring(0, 5))
          ? ((opt_naiveUriRewriter && (propBits & CSS_PROP_BIT_URL))
             ? normalizeUrl(safeUri(resolveUri(opt_baseUri,
                  tokens[i].substring(5, token.length - 2)),
                  propertyKey,
                  opt_naiveUriRewriter))
             : '')

          // Handle func(...) by recursing.
          // Functions start at a token like "name(" and end with a ")" taking
          // into account nesting.
          : (token.charAt(token.length-1) === '(')
          ? sanitizeFunctionCall(tokens, i)

          : (identDisposition
             && /^-?[a-z_][\w\-]*$/.test(token) && !/__$/.test(token))
          ? (opt_idSuffix && identDisposition === CSS_PROP_BIT_GLOBAL_NAME
             ? tokens[i] + opt_idSuffix  // use original token, not lowercased
             : (identDisposition === CSS_PROP_BIT_PROPERTY_NAME
                && cssSchema[token]
                && 'number' === typeof cssSchema[token].cssPropBits)
             ? token
             : '')

          : (/^\w+$/.test(token)
             && stringDisposition === CSS_PROP_BIT_UNRESERVED_WORD
             && (propBits & CSS_PROP_BIT_QSTRING))
          // Quote unrecognized keywords so font names like
          //    Arial Bold
          // ->
          //    "Arial Bold"
          ? (lastQuoted+1 === k
             // If the last token was also a keyword that was quoted, then
             // combine this token into that.
             ? (tokens[lastQuoted] = (
                  tokens[lastQuoted].substring(0, tokens[lastQuoted].length-1)
                  + ' ' + token + '"'),
                token = '')
             : (lastQuoted = k, '"' + token + '"'))

          // Disallowed.
          : '');
        if (token) {
          tokens[k++] = token;
        }
      }
      // For single URL properties, if the URL failed to pass the sanitizer,
      // then just drop it.
      if (k === 1 && tokens[0] === NOEFFECT_URL) { k = 0; }
      tokens.length = k;
    };
  })();

  // Note, duplicated in CssRewriter.java
  // Constructed from
  //    https://developer.mozilla.org/en-US/docs/Web/CSS/Reference
  //    https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  //    http://dev.w3.org/csswg/selectors4/
  var PSEUDO_SELECTOR_WHITELIST =
    new RegExp(
        '^(active|after|before|blank|checked|default|disabled'
        + '|drop|empty|enabled|first|first-child|first-letter'
        + '|first-line|first-of-type|fullscreen|focus|hover'
        + '|in-range|indeterminate|invalid|last-child|last-of-type'
        + '|left|link|only-child|only-of-type|optional|out-of-range'
        + '|placeholder-shown|read-only|read-write|required|right'
        + '|root|scope|user-error|valid|visited'
        + ')$');

  // Set of punctuation tokens that are child/sibling selectors.
  var COMBINATOR = {};
  COMBINATOR['>'] = COMBINATOR['+'] = COMBINATOR['~'] = COMBINATOR;

  /**
   * Given a series of tokens, returns a list of sanitized selectors.
   * @param {Array.<string>} selectors In the form produced by csslexer.js.
   * @param {{
   *     containerClass: ?string,
   *     idSuffix: string,
   *     tagPolicy: function(string, Array.<string>): ?Array.<string>,
   *     virtualizeAttrName: ?function(string, string): ?string
   *   }} virtualization An object like <pre<{
   *   containerClass: class name prepended to all selectors to scope them (if
   *       not null)
   *   idSuffix: appended to all IDs to scope them
   *   tagPolicy: As in html-sanitizer, used for rewriting element names.
   *   virtualizeAttrName: Rewrite a single attribute name for attribute
   *       selectors, or return null if not possible. Should be consistent
   *       with tagPolicy if possible.
   * }</pre>
   *    If containerClass is {@code "sfx"} and idSuffix is {@code "-sfx"}, the
   *    selector
   *    {@code ["a", "#foo", " ", "b", ".bar"]} will be namespaced to
   *    {@code [".sfx", " ", "a", "#foo-sfx", " ", "b", ".bar"]}.
   * @param {function(Array.<string>): boolean} opt_onUntranslatableSelector
   *     When a selector cannot be translated, this function is called with the
   *     non-whitespace/comment tokens comprising the selector and returns a
   *     value indicating whether to continue processing the selector list.
   *     If it returns falsey, then processing is aborted and null is returned.
   *     If not present or it returns truthy, then the complex selector is
   *     dropped from the selector list.
   * @return {Array.<string>}? an array of sanitized selectors.
   *    Null when the untraslatable compound selector handler aborts processing.
   */
  sanitizeCssSelectorList = function(
      selectors, virtualization, opt_onUntranslatableSelector) {
    var containerClass = virtualization.containerClass;
    var idSuffix = virtualization.idSuffix;
    var tagPolicy = virtualization.tagPolicy;
    var sanitized = [];

    // Remove any spaces that are not operators.
    var k = 0, i, inBrackets = 0, tok;
    for (i = 0; i < selectors.length; ++i) {
      tok = selectors[i];

      if (
            (tok == '(' || tok == '[') ? (++inBrackets, true)
          : (tok == ')' || tok == ']') ? (inBrackets && --inBrackets, true)
          : !(selectors[i] == ' '
              && (inBrackets || COMBINATOR[selectors[i-1]] === COMBINATOR
                  || COMBINATOR[selectors[i+1]] === COMBINATOR))
        ) {
        selectors[k++] = selectors[i];
      }
    }
    selectors.length = k;

    // Split around commas.  If there is an error in one of the comma separated
    // bits, we throw the whole away, but the failure of one selector does not
    // affect others except that opt_onUntranslatableSelector allows one to
    // treat the entire output as unusable.
    var n = selectors.length, start = 0;
    for (i = 0; i < n; ++i) {
      if (selectors[i] === ',') {  // TODO: ignore ',' inside brackets.
        if (!processComplexSelector(start, i)) { return null; }
        start = i+1;
      }
    }
    if (!processComplexSelector(start, n)) { return null; }


    function processComplexSelector(start, end) {
      // Space around commas is not an operator.
      if (selectors[start] === ' ') { ++start; }
      if (end-1 !== start && selectors[end] === ' ') { --end; }

      // Split the selector into element selectors, content around
      // space (ancestor operator) and '>' (descendant operator).
      var out = [];
      var lastOperator = start;
      var valid = true;  // True iff out contains a valid complex selector.
      for (var i = start; valid && i < end; ++i) {
        var tok = selectors[i];
        if (COMBINATOR[tok] === COMBINATOR || tok === ' ') {
          // We've found the end of a single link in the selector chain.
          if (!processCompoundSelector(lastOperator, i, tok)) {
            valid = false;
          } else {
            lastOperator = i+1;
          }
        }
      }
      if (!processCompoundSelector(lastOperator, end, '')) {
        valid = false;
      }

      function processCompoundSelector(start, end, combinator) {
        // Split the element selector into four parts.
        // DIV.foo#bar[href]:hover
        //    ^       ^     ^
        // el classes attrs pseudo
        var element, classId, attrs, pseudoSelector,
            tok,  // The current token
            // valid implies the parts above comprise a sanitized selector.
            valid = true;
        element = '';
        if (start < end) {
          tok = selectors[start];
          if (tok === '*') {
            ++start;
            element = tok;
          } else if (/^[a-zA-Z]/.test(tok)) {  // is an element selector
            var decision = tagPolicy(tok.toLowerCase(), []);
            if (decision) {
              if ('tagName' in decision) {
                tok = decision['tagName'];
              }
              ++start;
              element = tok;
            }
          }
        }
        classId = '';
        attrs = '';
        pseudoSelector = '';
        for (;valid && start < end; ++start) {
          tok = selectors[start];
          if (tok.charAt(0) === '#') {
            if (/^#_|__$|[^\w#:\-]/.test(tok)) {
              valid = false;
            } else {
              // Rewrite ID elements to include the suffix.
              classId += tok + idSuffix;
            }
          } else if (tok === '.') {
            if (++start < end
                && /^[0-9A-Za-z:_\-]+$/.test(tok = selectors[start])
                && !/^_|__$/.test(tok)) {
              classId += '.' + tok;
            } else {
              valid = false;
            }
          } else if (start + 1 < end && selectors[start] === '[') {
            ++start;
            var vAttr = selectors[start++].toLowerCase();
            // Schema lookup for type information
            var atype = html4.ATTRIBS[element + '::' + vAttr];
            if (atype !== +atype) { atype = html4.ATTRIBS['*::' + vAttr]; }

            var rAttr;
            // Consult policy
            // TODO(kpreid): Making this optional is a kludge to avoid changing
            // the public interface until we have a more well-structured design.
            if (virtualization.virtualizeAttrName) {
              rAttr = virtualization.virtualizeAttrName(element, vAttr);
              if (typeof rAttr !== 'string') {
                // rejected
                valid = false;
                rAttr = vAttr;
              }
              // don't reject even if not in schema
              if (valid && atype !== +atype) {
                atype = html4.atype['NONE'];
              }
            } else {
              rAttr = vAttr;
              if (atype !== +atype) {  // not permitted according to schema
                valid = false;
              }
            }

            var op = '', value = '', ignoreCase = false;
            if (/^[~^$*|]?=$/.test(selectors[start])) {
              op = selectors[start++];
              value = selectors[start++];
              // Quote identifier values.
              if (/^[0-9A-Za-z:_\-]+$/.test(value)) {
                value = '"' + value + '"';
              } else if (value === ']') {
                value = '""';
                --start;
              }
              // Reject unquoted values.
              if (!/^"([^\"\\]|\\.)*"$/.test(value)) {
                valid = false;
              }
              ignoreCase = selectors[start] === "i";
              if (ignoreCase) { ++start; }
            }
            if (selectors[start] !== ']') {
              ++start;
              valid = false;
            }
            // TODO: replace this with a lookup table that also provides a
            // function from operator and value to testable value.
            switch (atype) {
            case html4.atype['CLASSES']:
            case html4.atype['LOCAL_NAME']:
            case html4.atype['NONE']:
              break;
            case html4.atype['GLOBAL_NAME']:
            case html4.atype['ID']:
            case html4.atype['IDREF']:
              if ((op === '=' || op === '~=' || op === '$=')
                  && value != '""' && !ignoreCase) {
                // The suffix is case-sensitive, so we can't translate case
                // ignoring matches.
                value = '"'
                  + value.substring(1, value.length-1) + idSuffix
                  + '"';
              } else if (op === '|=' || op === '') {
                // Ok.  a|=b -> a == b || a.startsWith(b + "-") and since we
                // use "-" to separate the suffix from the identifier, we can
                // allow this through unmodified.
                // Existence checks are also ok.
              } else {
                // Can't correctly handle prefix and substring operators
                // without leaking information about the suffix.
                valid = false;
              }
              break;
            case html4.atype['URI']:
            case html4.atype['URI_FRAGMENT']:
              // URIs are rewritten, so we can't meanginfully translate URI
              // selectors besides the common a[href] one that is used to
              // distinguish links from naming anchors.
              if (op !== '') { valid = false; }
              break;
            // TODO: IDREFS
            default:
              valid = false;
            }
            if (valid) {
              attrs += '[' + rAttr.replace(/[^\w-]/g, '\\$&') + op + value +
                  (ignoreCase ? ' i]' : ']');
            }
          } else if (start < end && selectors[start] === ':') {
            tok = selectors[++start];
            if (PSEUDO_SELECTOR_WHITELIST.test(tok)) {
              pseudoSelector += ':' + tok;
            } else {
              break;
            }
          } else {
            break;  // Unrecognized token.
          }
        }
        if (start !== end) {  // Tokens not consumed.
          valid = false;
        }
        if (valid) {
          // ':' is allowed in identifiers, but is also the
          // pseudo-selector separator, so ':' in preceding parts needs to
          // be escaped.
          var selector = (element + classId).replace(/[^ .*#\w-]/g, '\\$&')
              + attrs + pseudoSelector + combinator;
          if (selector) { out.push(selector); }
        }
        return valid;
      }

      if (valid) {
        if (out.length) {
          var safeSelector = out.join('');

          // Namespace the selector so that it only matches under
          // a node with suffix in its CLASS attribute.
          if (containerClass !== null) {
            safeSelector = '.' + containerClass + ' ' + safeSelector;
          }

          sanitized.push(safeSelector);
        }  // else nothing there.
        return true;
      } else {
        return !opt_onUntranslatableSelector
          || opt_onUntranslatableSelector(selectors.slice(start, end));
      }
    }
    return sanitized;
  };

  (function () {
    var MEDIA_TYPE =
       '(?:'
       + 'all|aural|braille|embossed|handheld|print'
       + '|projection|screen|speech|tty|tv'
       + ')';

    // A white-list of media features extracted from the "Pseudo-BNF" in
    // http://dev.w3.org/csswg/mediaqueries4/#media1 and
    // https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Media_queries
    var MEDIA_FEATURE =
       '(?:'
       + '(?:min-|max-)?'
       + '(?:' + (
           '(?:device-)?'
         + '(?:aspect-ratio|height|width)'
         + '|color(?:-index)?'
         + '|monochrome'
         + '|orientation'
         + '|resolution'
       )
       + ')'
       + '|grid'
       + '|hover'
       + '|luminosity'
       + '|pointer'
       + '|scan'
       + '|script'
       + ')';

    var LENGTH_UNIT = '(?:p[cxt]|[cem]m|in|dpi|dppx|dpcm|%)';

    var CSS_VALUE =
       '-?(?:'
       + '[a-z]\\w+(?:-\\w+)*'  // An identifier
       // A length or scalar quantity, or a rational number.
       // dev.w3.org/csswg/mediaqueries4/#values introduces a ratio value-type
       // to allow matching aspect ratios like "4 / 3".
       + '|\\d+(?: / \\d+|(?:\\.\\d+)?' + LENGTH_UNIT + '?)'
       + ')';

    var MEDIA_EXPR =
       '\\( ' + MEDIA_FEATURE + ' (?:' + ': ' + CSS_VALUE + ' )?\\)';

    var MEDIA_QUERY =
       '(?:'
       + '(?:(?:(?:only|not) )?' + MEDIA_TYPE + '|' + MEDIA_EXPR + ')'
       // We use 'and ?' since 'and(' is a single CSS function token while
       // 'and (' parses to two separate tokens -- IDENT "and", DELIM "(".
       + '(?: and ?' + MEDIA_EXPR + ')*'
       + ')';

    var STARTS_WITH_KEYWORD_REGEXP = /^\w/;

    var MEDIA_QUERY_LIST_REGEXP = new RegExp(
      '^' + MEDIA_QUERY + '(?: , ' + MEDIA_QUERY + ')*' + '$',
      'i'
    );

    /**
     * Sanitizes a media query as defined in
     * http://dev.w3.org/csswg/mediaqueries4/#syntax
     * <blockquote>
     * Media Queries allow authors to adapt the style applied to a document
     * based on the environment the document is being rendered in.
     * </blockquote>
     *
     * @param {Array.<string>} cssTokens an array of tokens of the kind produced
     *   by cssLexers.
     * @return {string} a CSS media query.  This may be the empty string, or if
     *   the input is invalid, then a query that is always false.
     */
    sanitizeMediaQuery = function (cssTokens) {
      cssTokens = cssTokens.slice();
      // Strip out space tokens.
      var nTokens = cssTokens.length, k = 0;
      for (var i = 0; i < nTokens; ++i) {
        var tok = cssTokens[i];
        if (tok != ' ') { cssTokens[k++] = tok; }
      }
      cssTokens.length = k;
      var css = cssTokens.join(' ');
      css = (
        !css.length ? ''  // Always true per the spec.
        : !(MEDIA_QUERY_LIST_REGEXP.test(css)) ? 'not all'  // Always false.
        // Emit as-is if it starts with 'only', 'not' or a media type.
        : STARTS_WITH_KEYWORD_REGEXP.test(css) ? css
        : 'not all , ' + css  // Not ambiguous with a URL.
      );
      return css;
    };
  }());

  (function () {

    /**
     * Extracts a url out of an at-import rule of the form:
     *   \@import "mystyle.css";
     *   \@import url("mystyle.css");
     *
     * Returns null if no valid url was found.
     */
    function cssParseUri(candidate) {
      var string1 = /^\s*["]([^"]*)["]\s*$/;
      var string2 = /^\s*[']([^']*)[']\s*$/;
      var url1 = /^\s*url\s*[(]["]([^"]*)["][)]\s*$/;
      var url2 = /^\s*url\s*[(][']([^']*)['][)]\s*$/;
      // Not officially part of the CSS2.1 grammar
      // but supported by Chrome
      var url3 = /^\s*url\s*[(]([^)]*)[)]\s*$/;
      var match;
      if ((match = string1.exec(candidate))) {
        return match[1];
      } else if ((match = string2.exec(candidate))) {
        return match[1];
      } else if ((match = url1.exec(candidate))) {
        return match[1];
      } else if ((match = url2.exec(candidate))) {
        return match[1];
      } else if ((match = url3.exec(candidate))) {
        return match[1];
      }
      return null;
    }

    /**
     * @param {string} baseUri a string against which relative urls are
     *    resolved.
     * @param {string} cssText a string containing a CSS stylesheet.
     * @param {{
     *     containerClass: ?string,
     *     idSuffix: string,
     *     tagPolicy: function(string, Array.<string>): ?Array.<string>,
     *     virtualizeAttrName: ?function(string, string): ?string
     *   }} virtualization An object like <pre<{
     *   containerClass: class name prepended to all selectors to scope them (if
     *       not null)
     *   idSuffix: appended to all IDs to scope them
     *   tagPolicy: As in html-sanitizer, used for rewriting element names.
     *   virtualizeAttrName: Rewrite a single attribute name for attribute
     *       selectors, or return null if not possible. Should be consistent
     *       with tagPolicy if possible. Optional.
     * }</pre>
     *    If containerClass is {@code "sfx"} and idSuffix is {@code "-sfx"}, the
     *    selector
     *    {@code ["a", "#foo", " ", "b", ".bar"]} will be namespaced to
     *    {@code [".sfx", " ", "a", "#foo-sfx", " ", "b", ".bar"]}.
     * @param {function(string, string)} naiveUriRewriter maps URLs of media
     *    (images, sounds) that appear as CSS property values to sanitized
     *    URLs or null if the URL should not be allowed as an external media
     *    file in sanitized CSS.
     * @param {undefined|function({toString: function ():string}, boolean)}
     *     continuation
     *     callback that receives the result of loading imported CSS.
     *     The callback is called with
     *     (cssContent : function ():string, moreToCome : boolean)
     *     where cssContent is the CSS at the imported URL, and moreToCome is
     *     true when the external URL itself loaded other external URLs.
     *     If the output of the original call is stringified when moreToCome is
     *     false, then it will be complete.
     * @param {Array.<number>} opt_importCount the number of imports that need
     *     to be satisfied before there is no more pending content.
     * @return {{result:{toString:function ():string},moreToCome:boolean}}
     *     the CSS text, and a flag that indicates whether there are pending
     *     imports that will be passed to continuation.
     */
    function sanitizeStylesheetInternal(
        baseUri, cssText, virtualization, naiveUriRewriter, naiveUriFetcher,
        continuation, opt_importCount) {
      var safeCss = void 0;
      // Return a result with moreToCome===true when the last import has been
      // sanitized.
      var importCount = opt_importCount || [0];
      // A stack describing the { ... } regions.
      // Null elements indicate blocks that should not be emitted.
      var blockStack = [];
      // True when the content of the current block should be left off safeCss.
      var elide = false;
      parseCssStylesheet(
          cssText,
          {
            'startStylesheet': function () {
              safeCss = [];
            },
            'endStylesheet': function () {
            },
            'startAtrule': function (atIdent, headerArray) {
              if (elide) {
                atIdent = null;
              } else if (atIdent === '@media') {
                safeCss.push('@media', ' ', sanitizeMediaQuery(headerArray));
              } else if (atIdent === '@keyframes'
                         || atIdent === '@-webkit-keyframes') {
                var animationId = headerArray[0];
                if (headerArray.length === 1
                    && !/__$|[^\w\-]/.test(animationId)) {
                  safeCss.push(
                      atIdent, ' ', animationId + virtualization.idSuffix);
                  atIdent = '@keyframes';
                } else {
                  atIdent = null;
                }
              } else {
                if (atIdent === '@import' && headerArray.length > 0) {
                  atIdent = null;
                  if ('function' === typeof continuation) {
                    var mediaQuery = sanitizeMediaQuery(headerArray.slice(1));
                    if (mediaQuery !== 'not all') {
                      ++importCount[0];
                      var placeholder = [];
                      safeCss.push(placeholder);
                      var cssUrl = safeUri(
                          resolveUri(baseUri, cssParseUri(headerArray[0])),
                          function(result) {
                            var sanitized = sanitizeStylesheetInternal(
                                cssUrl, result.html, virtualization,
                                naiveUriRewriter, naiveUriFetcher,
                                continuation, importCount);
                            --importCount[0];
                            var safeImportedCss = mediaQuery
                              ? {
                                toString: function () {
                                  return (
                                    '@media ' + mediaQuery + ' {'
                                    + sanitized.result + '}'
                                  );
                                }
                              }
                              : sanitized.result;
                            placeholder[0] = safeImportedCss;
                            continuation(safeImportedCss, !!importCount[0]);
                          },
                          naiveUriFetcher);
                    }
                  } else {
                    // TODO: Use a logger instead.
                    if (window.console) {
                      window.console.log(
                          '@import ' + headerArray.join(' ') + ' elided');
                    }
                  }
                }
              }
              elide = !atIdent;
              blockStack.push(atIdent);
            },
            'endAtrule': function () {
              blockStack.pop();
              if (!elide) {
                safeCss.push(';');
              }
              checkElide();
            },
            'startBlock': function () {
              // There are no bare blocks in CSS, so we do not change the
              // block stack here, but instead in the events that bracket
              // blocks.
              if (!elide) {
                safeCss.push('{');
              }
            },
            'endBlock': function () {
              if (!elide) {
                safeCss.push('}');
                elide = true;  // skip any semicolon from endAtRule.
              }
            },
            'startRuleset': function (selectorArray) {
              if (!elide) {
                var selector = void 0;
                if (blockStack[blockStack.length - 1] === '@keyframes') {
                  // Allow [from | to | <percentage>]
                  selector = selectorArray.join(' ')
                    .match(/^ *(?:from|to|\d+(?:\.\d+)?%) *(?:, *(?:from|to|\d+(?:\.\d+)?%) *)*$/i);
                  elide = !selector;
                  if (selector) { selector = selector[0].replace(/ +/g, ''); }
                } else {
                  var selectors = sanitizeCssSelectorList(
                      selectorArray, virtualization);
                  if (!selectors || !selectors.length) {
                    elide = true;
                  } else {
                    selector = selectors.join(', ');
                  }
                }
                if (!elide) {
                  safeCss.push(selector, '{');
                }
              }
              blockStack.push(null);
            },
            'endRuleset': function () {
              blockStack.pop();
              if (!elide) {
                safeCss.push('}');
              }
              checkElide();
            },
            'declaration': function (property, valueArray) {
              if (!elide) {
                var isImportant = false;
                var nValues = valueArray.length;
                if (nValues >= 2
                    && valueArray[nValues - 2] === '!'
                    && valueArray[nValues - 1].toLowerCase() === 'important') {
                  isImportant = true;
                  valueArray.length -= 2;
                }
                sanitizeCssProperty(
                    property, valueArray, naiveUriRewriter, baseUri,
                    virtualization.idSuffix);
                if (valueArray.length) {
                  safeCss.push(
                      property, ':', valueArray.join(' '),
                      isImportant ? ' !important;' : ';');
                }
              }
            }
          });
      function checkElide() {
        elide = blockStack.length && blockStack[blockStack.length-1] === null;
      }
      return {
        result : { toString: function () { return safeCss.join(''); } },
        moreToCome : !!importCount[0]
      };
    }

    sanitizeStylesheet = function (
        baseUri, cssText, virtualization, naiveUriRewriter) {
      return sanitizeStylesheetInternal(
          baseUri, cssText, virtualization,
          naiveUriRewriter, undefined, undefined).result.toString();
    };

    sanitizeStylesheetWithExternals = function (
        baseUri, cssText, virtualization, naiveUriRewriter, naiveUriFetcher,
        continuation) {
      return sanitizeStylesheetInternal(
          baseUri, cssText, virtualization,
          naiveUriRewriter, naiveUriFetcher, continuation);
    };
  })();
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['sanitizeCssProperty'] = sanitizeCssProperty;
  window['sanitizeCssSelectorList'] = sanitizeCssSelectorList;
  window['sanitizeStylesheet'] = sanitizeStylesheet;
  window['sanitizeMediaQuery'] = sanitizeMediaQuery;
}
;
// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Utilities for dealing with CSS source code.
 *
 * @author mikesamuel@gmail.com
 * \@requires lexCss
 * \@overrides window
 * \@provides parseCssStylesheet, parseCssDeclarations
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * parseCssStylesheet takes a chunk of CSS text and a handler object with
 * methods that it calls as below:
 * <pre>
 * // At the beginning of a stylesheet.
 * handler.startStylesheet();
 *
 * // For an @foo rule ended by a semicolon: @import "foo.css";
 * handler.startAtrule('@import', ['"foo.css"']);
 * handler.endAtrule();
 *
 * // For an @foo rule ended with a block. @media print { ... }
 * handler.startAtrule('@media', ['print']);
 * handler.startBlock();
 * // Calls to contents elided.  Probably selectors and declarations as below.
 * handler.endBlock();
 * handler.endAtrule();
 *
 * // For a ruleset: p.clazz q, s { color: blue; }
 * handler.startRuleset(['p', '.', 'clazz', ' ', 'q', ',', ' ', 's']);
 * handler.declaration('color', ['blue']);
 * handler.endRuleset();
 *
 * // At the end of a stylesheet.
 * handler.endStylesheet();
 * </pre>
 * When errors are encountered, the parser drops the useless tokens and
 * attempts to resume parsing.
 *
 * @param {string} cssText CSS3 content to parse as a stylesheet.
 * @param {Object} handler An object like <pre>{
 *   startStylesheet: function () { ... },
 *   endStylesheet: function () { ... },
 *   startAtrule: function (atIdent, headerArray) { ... },
 *   endAtrule: function () { ... },
 *   startBlock: function () { ... },
 *   endBlock: function () { ... },
 *   startRuleset: function (selectorArray) { ... },
 *   endRuleset: function () { ... },
 *   declaration: function (property, valueArray) { ... },
 * }</pre>
 */
var parseCssStylesheet;

/**
 * parseCssDeclarations parses a run of declaration productions as seen in the
 * body of the HTML5 {@code style} attribute.
 *
 * @param {string} cssText CSS3 content to parse as a run of declarations.
 * @param {Object} handler An object like <pre>{
 *   declaration: function (property, valueArray) { ... },
 * }</pre>
 */
var parseCssDeclarations;

(function () {
  // stylesheet  : [ CDO | CDC | S | statement ]*;
  parseCssStylesheet = function(cssText, handler) {
    var toks = lexCss(cssText);
    if (handler['startStylesheet']) { handler['startStylesheet'](); }
    for (var i = 0, n = toks.length; i < n;) {
      // CDO and CDC ("<!--" and "-->") are converted to space by the lexer.
      i = toks[i] === ' ' ? i+1 : statement(toks, i, n, handler);
    }
    if (handler['endStylesheet']) { handler['endStylesheet'](); }
  };

  // statement   : ruleset | at-rule;
  function statement(toks, i, n, handler) {
    if (i < n) {
      var tok = toks[i];
      if (tok.charAt(0) === '@') {
        return atrule(toks, i, n, handler, true);
      } else {
        return ruleset(toks, i, n, handler);
      }
    } else {
      return i;
    }
  }

  // at-rule     : ATKEYWORD S* any* [ block | ';' S* ];
  function atrule(toks, i, n, handler, blockok) {
    var start = i++;
    while (i < n && toks[i] !== '{' && toks[i] !== ';') {
      ++i;
    }
    if (i < n && (blockok || toks[i] === ';')) {
      var s = start+1, e = i;
      if (s < n && toks[s] === ' ') { ++s; }
      if (e > s && toks[e-1] === ' ') { --e; }
      if (handler['startAtrule']) {
        handler['startAtrule'](toks[start].toLowerCase(), toks.slice(s, e));
      }
      i = (toks[i] === '{')
          ? block(toks, i, n, handler)
          : i+1;  // Skip over ';'
      if (handler['endAtrule']) {
        handler['endAtrule']();
      }
    }
    // Else we reached end of input or are missing a semicolon.
    // Drop the rule on the floor.
    return i;
  }

  // block       : '{' S* [ any | block | ATKEYWORD S* | ';' S* ]* '}' S*;
   // Assumes the leading '{' has been verified by callers.
  function block(toks, i, n, handler) {
    ++i; //  skip over '{'
    if (handler['startBlock']) { handler['startBlock'](); }
    while (i < n) {
      var ch = toks[i].charAt(0);
      if (ch == '}') {
        ++i;
        break;
      }
      if (ch === ' ' || ch === ';') {
        i = i+1;
      } else if (ch === '@') {
        i = atrule(toks, i, n, handler, false);
      } else if (ch === '{') {
        i = block(toks, i, n, handler);
      } else {
        // Instead of using (any* block) to subsume ruleset we allow either
        // blocks or rulesets with a non-blank selector.
        // This is more restrictive but does not require atrule specific
        // parse tree fixup to realize that the contents of the block in
        //    @media print { ... }
        // is a ruleset.  We just don't care about any block carrying at-rules
        // whose body content is not ruleset content.
        i = ruleset(toks, i, n, handler);
      }
    }
    if (handler['endBlock']) { handler['endBlock'](); }
    return i;
  }

  // ruleset    : selector? '{' S* declaration? [ ';' S* declaration? ]* '}' S*;
  function ruleset(toks, i, n, handler) {
    // toks[s:e] are the selector tokens including internal whitespace.
    var s = i, e = selector(toks, i, n, true);
    if (e < 0) {
      // Skip malformed content per selector calling convention.
      e = ~e;
      // Make sure we skip at least one token.
      return e === s ? e+1 : e;
    }
    var tok = toks[e];
    if (tok !== '{') {
      // Make sure we skip at least one token.
      return e === s ? e+1 : e;
    }
    i = e+1;  // Skip over '{'
    // Don't include any trailing space in the selector slice.
    if (e > s && toks[e-1] === ' ') { --e; }
    if (handler['startRuleset']) {
      handler['startRuleset'](toks.slice(s, e));
    }
    while (i < n) {
      tok = toks[i];
      if (tok === '}') {
        ++i;
        break;
      }
      if (tok === ' ') {
        i = i+1;
      } else {
        i = declaration(toks, i, n, handler);
      }
    }
    if (handler['endRuleset']) {
      handler['endRuleset']();
    }
    return i;
  }

  // selector    : any+;
  // any         : [ IDENT | NUMBER | PERCENTAGE | DIMENSION | STRING
  //               | DELIM | URI | HASH | UNICODE-RANGE | INCLUDES
  //               | FUNCTION S* any* ')' | DASHMATCH | '(' S* any* ')'
  //               | '[' S* any* ']' ] S*;
  // A negative return value, rv, indicates the selector was malformed and
  // the index at which we stopped is ~rv.
  function selector(toks, i, n, allowSemi) {
    var s = i;
    // The definition of any above can be summed up as
    //   "any run of token except ('[', ']', '(', ')', ':', ';', '{', '}')
    //    or nested runs of parenthesized tokens or square bracketed tokens".
    // Spaces are significant in the selector.
    // Selector is used as (selector?) so the below looks for (any*) for
    // simplicity.
    var tok;
    // Keeping a stack pointer actually causes this to minify better since
    // ".length" and ".push" are a lo of chars.
    var brackets = [], stackLast = -1;
    for (;i < n; ++i) {
      tok = toks[i].charAt(0);
      if (tok === '[' || tok === '(') {
        brackets[++stackLast] = tok;
      } else if ((tok === ']' && brackets[stackLast] === '[') ||
                 (tok === ')' && brackets[stackLast] === '(')) {
        --stackLast;
      } else if (tok === '{' || tok === '}' || tok === ';' || tok === '@'
                 || (tok === ':' && !allowSemi)) {
        break;
      }
    }
    if (stackLast >= 0) {
      // Returns the bitwise inverse of i+1 to indicate an error in the
      // token stream so that clients can ignore it.
      i = ~(i+1);
    }
    return i;
  }

  var ident = /^-?[a-z]/i;

  function skipDeclaration(toks, i, n) {
    // TODO(felix8a): maybe skip balanced pairs of {}
    while (i < n && toks[i] !== ';' && toks[i] !== '}') { ++i; }
    return i < n && toks[i] === ';' ? i+1 : i;
  }

  // declaration : property ':' S* value;
  // property    : IDENT S*;
  // value       : [ any | block | ATKEYWORD S* ]+;
  function declaration(toks, i, n, handler) {
    var property = toks[i++];
    if (!ident.test(property)) {
      return skipDeclaration(toks, i, n);
    }
    var tok;
    if (i < n && toks[i] === ' ') { ++i; }
    if (i == n || toks[i] !== ':') {
      return skipDeclaration(toks, i, n);
    }
    ++i;
    if (i < n && toks[i] === ' ') { ++i; }

    // None of the rules we care about want atrules or blocks in value, so
    // we look for any+ but that is the same as selector but not zero-length.
    // This gets us the benefit of not emitting any value with mismatched
    // brackets.
    var s = i, e = selector(toks, i, n, false);
    if (e < 0) {
      // Skip malformed content per selector calling convention.
      e = ~e;
    } else {
      var value = [], valuelen = 0;
      for (var j = s; j < e; ++j) {
        tok = toks[j];
        if (tok !== ' ') {
          value[valuelen++] = tok;
        }
      }
      // One of the following is now true:
      // (1) e is flush with the end of the tokens as in <... style="x:y">.
      // (2) tok[e] points to a ';' in which case we need to consume the semi.
      // (3) tok[e] points to a '}' in which case we don't consume it.
      // (4) else there is bogus unparsed value content at toks[e:].
      // Allow declaration flush with end for style attr body.
      if (e < n) {  // 2, 3, or 4
        do {
          tok = toks[e];
          if (tok === ';' || tok === '}') { break; }
          // Don't emit the property if there is questionable trailing content.
          valuelen = 0;
        } while (++e < n);
        if (tok === ';') {
          ++e;
        }
      }
      if (valuelen && handler['declaration']) {
        // TODO: coerce non-keyword ident tokens to quoted strings.
        handler['declaration'](property.toLowerCase(), value);
      }
    }
    return e;
  }

  parseCssDeclarations = function(cssText, handler) {
    var toks = lexCss(cssText);
    for (var i = 0, n = toks.length; i < n;) {
      i = toks[i] !== ' ' ? declaration(toks, i, n, handler) : i+1;
    }
  };
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['parseCssStylesheet'] = parseCssStylesheet;
  window['parseCssDeclarations'] = parseCssDeclarations;
}
;
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * A set of utility functions that implement browser feature testing to unify
 * certain DOM behaviors, and a set of recommendations about when to use these
 * functions as opposed to the native DOM functions.
 *
 * @author ihab.awad@gmail.com
 * @author jasvir@gmail.com
 * @provides bridalMaker
 * @requires WeakMap, html, html4
 * @overrides window
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * Construct the bridal object for a specific document.
 *
 * @param {Node} targetDocNode The document to manipulate, or some node owned
 *     by it.
 */
var bridalMaker = function (targetDocNode) {
  var document = targetDocNode.nodeType === 9 ? targetDocNode :
      targetDocNode.ownerDocument;

  var window = bridalMaker.getWindow(document);
  var navigator      = window.navigator;
  var XMLHttpRequest = window.XMLHttpRequest;
  var ActiveXObject  = window.ActiveXObject;

  ////////////////////////////////////////////////////////////////////////////
  // Private section
  ////////////////////////////////////////////////////////////////////////////

  var isOpera = navigator.userAgent.indexOf('Opera') === 0;
  var isIE = !isOpera && navigator.userAgent.indexOf('MSIE') !== -1;
  var isWebkit = !isOpera && navigator.userAgent.indexOf('WebKit') !== -1;

  var featureAttachEvent = !!(window.attachEvent && !window.addEventListener);
  /**
   * Does the extended form of extendedCreateElement work?
   * From http://msdn.microsoft.com/en-us/library/ms536389.aspx :<blockquote>
   *     You can also specify all the attributes inside the createElement
   *     method by using an HTML string for the method argument.
   *     The following example demonstrates how to dynamically create two
   *     radio buttons utilizing this technique.
   *     <pre>
   *     ...
   *     var newRadioButton = document.createElement(
   *         "&lt;INPUT TYPE='RADIO' NAME='RADIOTEST' VALUE='First Choice'>")
   *     </pre>
   * </blockquote>
   */
  var featureExtendedCreateElement =
      (function () {
        try {
          return (
              document.createElement('<input type="radio">').type === 'radio');
        } catch (e) {
          return false;
        }
      })();

  // HTML5 compatibility on IE
  // Standard html5 but non-html4 tags cause IE to throw
  // Workaround from http://remysharp.com/html5-enabling-script
  function html5shim() {
    var html5_elements =["abbr", "article", "aside", "audio", "canvas",
        "details", "figcaption", "figure", "footer", "header", "hgroup", "mark",
        "meter", "nav", "output", "progress", "section", "summary", "time",
        "video"];
    var documentFragment = document.createDocumentFragment();
    for (var i = 0; i < html5_elements.length; i++) {
      try {
        document.createElement(html5_elements[i]);
        documentFragment.createElement(html5_elements[i]);
      } catch (e) {
        // failure in the shim is not a real failure
      }
    }
  }
  if (isIE) {
    html5shim();
  }

  // lazily initialized to allow working in cases where WeakMap is not available
  // and this code is never used.
  var hiddenEventTypes;

  var CUSTOM_EVENT_TYPE_SUFFIX = '_custom___';
  function tameEventType(type, opt_isCustom, opt_tagName) {
    type = String(type);
    if (endsWithUnderbars.test(type)) {
      throw new Error('Invalid event type ' + type);
    }
    var tagAttr = false;
    if (opt_tagName) {
      tagAttr = String(opt_tagName).toLowerCase() + '::on' + type;
    }
    if (!opt_isCustom
        && ((tagAttr && html4.atype.SCRIPT === html4.ATTRIBS[tagAttr])
            || html4.atype.SCRIPT === html4.ATTRIBS['*::on' + type])) {
      return type;
    }
    return type + CUSTOM_EVENT_TYPE_SUFFIX;
  }

  function eventHandlerTypeFilter(handler, tameType) {
    // This does not need to check that handler is callable by untrusted code
    // since the handler will invoke plugin_dispatchEvent which will do that
    // check on the untrusted function reference.
    return function (event) {
      if (hiddenEventTypes && tameType === hiddenEventTypes.get(event)) {
        return handler.call(this, event);
      }
    };
  }

  var endsWithUnderbars = /__$/;
  var escapeAttrib = html.escapeAttrib;
  function constructClone(node, deep) {
    var clone;
    if (node.nodeType === 1 && featureExtendedCreateElement) {
      // From http://blog.pengoworks.com/index.cfm/2007/7/16/IE6--IE7-quirks-with-cloneNode-and-form-elements
      //     It turns out IE 6/7 doesn't properly clone some form elements
      //     when you use the cloneNode(true) and the form element is a
      //     checkbox, radio or select element.
      // JQuery provides a clone method which attempts to fix this and an issue
      // with event listeners.  According to the source code for JQuery's clone
      // method ( http://docs.jquery.com/Manipulation/clone#true ):
      //     IE copies events bound via attachEvent when
      //     using cloneNode. Calling detachEvent on the
      //     clone will also remove the events from the orignal
      // We do not need to deal with XHTML DOMs and so can skip the clean step
      // that jQuery does.
      var tagDesc = node.tagName;
      // Copying form state is not strictly mentioned in DOM2's spec of
      // cloneNode, but all implementations do it.  The value copying
      // can be interpreted as fixing implementations' failure to have
      // the value attribute "reflect" the input's value as determined by the
      // value property.
      switch (node.tagName) {
        case 'INPUT':
          tagDesc = '<input name="' + escapeAttrib(node.name)
              + '" type="' + escapeAttrib(node.type)
              + '" value="' + escapeAttrib(node.defaultValue) + '"'
              + (node.defaultChecked ? ' checked="checked">' : '>');
          break;
        case 'BUTTON':
          tagDesc = '<button name="' + escapeAttrib(node.name)
              + '" type="' + escapeAttrib(node.type)
              + '" value="' + escapeAttrib(node.value) + '">';
          break;
        case 'OPTION':
          tagDesc = '<option '
              + (node.defaultSelected ? ' selected="selected">' : '>');
          break;
        case 'TEXTAREA':
          tagDesc = '<textarea value="'
              + escapeAttrib(node.defaultValue) + '">';
          break;
      }

      clone = document.createElement(tagDesc);

      var attrs = node.attributes;
      for (var i = 0, attr; (attr = attrs[i]); ++i) {
        if (attr.specified && !endsWithUnderbars.test(attr.name)) {
          setAttribute(clone, attr.nodeName, attr.nodeValue);
        }
      }
    } else {
      clone = node.cloneNode(false);
    }
    if (deep) {
      // TODO(mikesamuel): should we whitelist nodes here, to e.g. prevent
      // untrusted code from reloading an already loaded script by cloning
      // a script node that somehow exists in a tree accessible to it?
      for (var child = node.firstChild; child; child = child.nextSibling) {
        var cloneChild = constructClone(child, deep);
        clone.appendChild(cloneChild);
      }
    }
    return clone;
  }

  function fixupClone(node, clone) {
    for (var child = node.firstChild, cloneChild = clone.firstChild; cloneChild;
         child = child.nextSibling, cloneChild = cloneChild.nextSibling) {
      fixupClone(child, cloneChild);
    }
    if (node.nodeType === 1) {
      switch (node.tagName) {
        case 'INPUT':
          clone.value = node.value;
          clone.checked = node.checked;
          break;
        case 'OPTION':
          clone.selected = node.selected;
          clone.value = node.value;
          break;
        case 'TEXTAREA':
          clone.value = node.value;
          break;
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // Public section
  ////////////////////////////////////////////////////////////////////////////

  function untameEventType(type) {
    var suffix = CUSTOM_EVENT_TYPE_SUFFIX;
    var tlen = type.length, slen = suffix.length;
    var end = tlen - slen;
    if (end >= 0 && suffix === type.substring(end)) {
      type = type.substring(0, end);
    }
    return type;
  }

  function initEvent(event, methodName, type, bubbles, cancelable, args, notCustom) {
    methodName = String(methodName);
    type = tameEventType(type, !notCustom);
    bubbles = Boolean(bubbles);
    cancelable = Boolean(cancelable);

    if (methodName in event) { // Non-IE, specialized init such as initMouseEvent
      var method = event[methodName];
      if (typeof method !== 'function') {
        // we don't expect this to happen, but if it does, explain
        throw new Error('Domado internal error: event.' + methodName +
            ' exists but is a ' + typeof method + ', not a function');
      }
      method.apply(event, [type, bubbles, cancelable].concat(args));
    } else if (event.initEvent) {  // Non-IE
      event.initEvent(type, bubbles, cancelable);
    } else if (bubbles && cancelable) {  // IE
      // TODO(kpreid): How do we handle args?
      if (!hiddenEventTypes) {
        hiddenEventTypes = new WeakMap();
      }
      hiddenEventTypes.set(event, type);
    } else {
      // TODO(mikesamuel): can bubbling and cancelable on events be simulated
      // via http://msdn.microsoft.com/en-us/library/ms533545(VS.85).aspx
      throw new Error(
          'Browser does not support non-bubbling/uncanceleable events');
    }
  }

  function dispatchEvent(element, event) {
    // TODO(mikesamuel): when we change event dispatching to happen
    // asynchronously, we should exempt custom events since those
    // need to return a useful value, and there may be code bracketing
    // them which could observe asynchronous dispatch.

    // "The return value of dispatchEvent indicates whether any of
    //  the listeners which handled the event called
    //  preventDefault. If preventDefault was called the value is
    //  false, else the value is true."
    if (element.dispatchEvent) {
      return Boolean(element.dispatchEvent(event));
    } else {
      // Only dispatches custom events as when tameEventType(t) !== t.
      element.fireEvent('ondataavailable', event);
      return Boolean(event.returnValue);
    }
  }

  /**
   * Add an event listener function to an element.
   *
   * <p>Replaces
   * W3C <code>Element::addEventListener</code> and
   * IE <code>Element::attachEvent</code>, as well as the corresponding remove
   * operations (see return value).
   *
   * @param {HTMLElement} element a native DOM element.
   * @param {string} type a string identifying the event type.
   * @param {boolean Element::function (event)} handler an event handler.
   * @param {boolean} useCapture whether the user wishes to initiate capture.
   * @return {function} A function which performs the corresponding
   *         removeEventListener. Due to wrappers, removeEventListener cannot
   *         be used directly.
   */
  function addEventListener(element, type, handler, useCapture) {
    type = String(type);
    var tameType = tameEventType(type, false, element.tagName);
    var isNowCustom = type !== tameType;
    var r1 = subAddEventListener(element, isNowCustom, tameType, handler,
        useCapture);
    var r2 = null;
    if (!isNowCustom) {
      r2 = subAddEventListener(element, true,
          tameEventType(type, true, element.tagName), handler, useCapture);
    }
    return r2 ? function removeBoth() { r1(); r2(); } : r1;
  }
  function subAddEventListener(
      element, isCustom, tameType, handler, useCapture) {
    if (featureAttachEvent) {
      // TODO(ihab.awad): How do we emulate 'useCapture' here?
      if (isCustom) {
        var wrapper = eventHandlerTypeFilter(handler, tameType);
        element.attachEvent('ondataavailable', wrapper);
        return function() {
          element.detachEvent('ondataavailable', wrapper);
        };
      } else {
        element.attachEvent('on' + tameType, handler);
        return function() {
          element.detachEvent('on' + tameType, handler);
        };
      }
    } else {
      // FF2 fails if useCapture not passed or is not a boolean.
      element.addEventListener(tameType, handler, useCapture);
      return function() {
        element.removeEventListener(tameType, handler, useCapture);
      };
    }
  }

  /**
   * Clones a node per {@code Node.clone()}.
   * <p>
   * Returns a duplicate of this node, i.e., serves as a generic copy
   * constructor for nodes. The duplicate node has no parent;
   * (parentNode is null.).
   * <p>
   * Cloning an Element copies all attributes and their values,
   * including those generated by the XML processor to represent
   * defaulted attributes, but this method does not copy any text it
   * contains unless it is a deep clone, since the text is contained
   * in a child Text node. Cloning an Attribute directly, as opposed
   * to be cloned as part of an Element cloning operation, returns a
   * specified attribute (specified is true). Cloning any other type
   * of node simply returns a copy of this node.
   * <p>
   * Note that cloning an immutable subtree results in a mutable copy,
   * but the children of an EntityReference clone are readonly. In
   * addition, clones of unspecified Attr nodes are specified. And,
   * cloning Document, DocumentType, Entity, and Notation nodes is
   * implementation dependent.
   *
   * @param {boolean} deep If true, recursively clone the subtree
   * under the specified node; if false, clone only the node itself
   * (and its attributes, if it is an Element).
   *
   * @return {Node} The duplicate node.
   */
  function cloneNode(node, deep) {
    var clone;
    if (!document.all) {  // Not IE 6 or IE 7
      clone = node.cloneNode(deep);
    } else {
      clone = constructClone(node, deep);
    }
    fixupClone(node, clone);
    return clone;
  }

  function initCanvasElements(doc) {
    var els = doc.getElementsByTagName('canvas');
    for (var i = 0; i < els.length; i++) {
      initCanvasElement(els[i]);
    }
  }

  function initCanvasElement(el) {
    // TODO(felix8a): need to whitelist G_vmlCanvasManager
    if (window.G_vmlCanvasManager) {
      window.G_vmlCanvasManager.initElement(el);
    }
  }

  function createElement(tagName, attribs) {
    if (featureExtendedCreateElement) {
      var tag = ['<', tagName];
      for (var i = 0, n = attribs.length; i < n; i += 2) {
        tag.push(' ', attribs[i], '="', escapeAttrib(attribs[i + 1]), '"');
      }
      tag.push('>');
      return document.createElement(tag.join(''));
    } else {
      var el = document.createElement(tagName);
      for (var i = 0, n = attribs.length; i < n; i += 2) {
        setAttribute(el, attribs[i], attribs[i + 1]);
      }
      return el;
    }
  }

  /**
   * Create a <code>style</code> element for a document containing some
   * specified CSS text. Does not add the element to the document: the client
   * may do this separately if desired.
   *
   * <p>Replaces directly creating the <code>style</code> element and
   * populating its contents.
   *
   * @param document a DOM document.
   * @param cssText a string containing a well-formed stylesheet production.
   * @return a <code>style</code> element for the specified document.
   */
  function createStylesheet(document, cssText) {
    // Courtesy Stoyan Stefanov who documents the derivation of this at
    // http://www.phpied.com/dynamic-script-and-style-elements-in-ie/ and
    // http://yuiblog.com/blog/2007/06/07/style/
    var styleSheet = document.createElement('style');
    styleSheet.setAttribute('type', 'text/css');
    var ssss = styleSheet.styleSheet;
    if (ssss) {   // IE
      ssss.cssText = cssText;
    } else {                // the world
      styleSheet.appendChild(document.createTextNode(cssText));
    }
    return styleSheet;
  }

  var hiddenStoredTarget;

  /**
   * Set an attribute on a DOM node.
   *
   * <p>Replaces DOM <code>Node::setAttribute</code>.
   *
   * @param {HTMLElement} element a DOM element.
   * @param {string} name the name of an attribute.
   * @param {string} value the value of an attribute.
   */
  function setAttribute(element, name, value) {
    /*
      Hazards:

        - In IE[67], el.setAttribute doesn't work for attributes like
          'class' or 'for'.  IE[67] expects you to set 'className' or
          'htmlFor'.  Using setAttributeNode solves this problem.

        - In IE[67], <input> elements can shadow attributes.  If el is a
          form that contains an <input> named x, then el.setAttribute(x, y)
          will set x's value rather than setting el's attribute.  Using
          setAttributeNode solves this problem.

        - In IE[67], the style attribute can only be modified by setting
          el.style.cssText.  Neither setAttribute nor setAttributeNode will
          work.  el.style.cssText isn't bullet-proof, since it can be
          shadowed by <input> elements.

        - In IE[67], you can never change the type of an <button> element.
          setAttribute('type') silently fails, but setAttributeNode
          throws an exception.  We want the silent failure.

        - In IE[67], you can never change the type of an <input> element.
          setAttribute('type') throws an exception.  We want the exception.

        - In IE[67], setAttribute is case-sensitive, unless you pass 0 as a
          3rd argument.  setAttributeNode is case-insensitive.

        - Trying to set an invalid name like ":" is supposed to throw an
          error.  In IE[678] and Opera 10, it fails without an error.
    */
    switch (name) {
      case 'style':
        element.style.cssText = value;
        return value;
      // Firefox will run javascript: URLs in the frame specified by target.
      // This can cause things to run in an unintended frame, so we make sure
      // that the target is effectively _self whenever a javascript: URL appears
      // on a node.
      case 'href':
        if (/^javascript:/i.test(value)) {
          if (!hiddenStoredTarget) {
            hiddenStoredTarget = new WeakMap();
          }
          hiddenStoredTarget.set(element, element.target);
          element.target = '';
        } else if (hiddenStoredTarget && hiddenStoredTarget.has(element)) {
          element.target = hiddenStoredTarget.get(element);
          hiddenStoredTarget["delete"](element); //delete kw rej. by Safari5.0.5
        }
        break;
      case 'target':
        if (element.href && /^javascript:/i.test(element.href)) {
          if (!hiddenStoredTarget) {
            hiddenStoredTarget = new WeakMap();
          }
          hiddenStoredTarget.set(element, value);
          return value;
        }
        break;
    }
    if (featureExtendedCreateElement /* old IE, need workarounds */) {
      try {
        var attr = element.ownerDocument.createAttribute(name);
        attr.value = value;
        element.setAttributeNode(attr);
      } catch (e) {
        // It's a real failure only if setAttribute also fails.
        return element.setAttribute(name, value, 0);
      }
    } else {
      return element.setAttribute(name, value, 0);
    }
    return value;
  }

  /**
   * See <a href="http://www.w3.org/TR/cssom-view/#the-getclientrects"
   *      >ElementView.getBoundingClientRect()</a>.
   * @param {Node} el An element or document.
   * @return {Object} duck types as a TextRectangle with numeric fields
   *    {@code left}, {@code right}, {@code top}, and {@code bottom}.
   */
  function getBoundingClientRect(el) {
    if (el.nodeType === 9 /* Document */) {
      el = el.documentElement;
    }
    var doc = el.ownerDocument;
    // Use the native method if present.
    if (el.getBoundingClientRect) {
      var cRect = el.getBoundingClientRect();
      if (isIE) {
        // IE has an unnecessary border, which can be mucked with by styles, so
        // the amount of border is not predictable.
        // Depending on whether the document is in quirks or standards mode,
        // the border will be present on either the HTML or BODY elements.
        var fixupLeft = doc.documentElement.clientLeft + doc.body.clientLeft;
        cRect.left -= fixupLeft;
        cRect.right -= fixupLeft;
        var fixupTop = doc.documentElement.clientTop + doc.body.clientTop;
        cRect.top -= fixupTop;
        cRect.bottom -= fixupTop;
      }
      return ({
                top: +cRect.top,
                left: +cRect.left,
                right: +cRect.right,
                bottom: +cRect.bottom
              });
    }

    // Otherwise, try using the deprecated gecko method, or emulate it in
    // horribly inefficient ways.

    // http://code.google.com/p/doctype/wiki/ArticleClientViewportElement
    var viewport = (isIE && doc.compatMode === 'CSS1Compat')
        ? doc.body : doc.documentElement;

    // Figure out the position relative to the viewport.
    // From http://code.google.com/p/doctype/wiki/ArticlePageOffset
    var pageX = 0, pageY = 0;
    if (el === viewport) {
      // The viewport is the origin.
    } else if (doc.getBoxObjectFor) {  // Handles Firefox < 3
      var elBoxObject = doc.getBoxObjectFor(el);
      var viewPortBoxObject = doc.getBoxObjectFor(viewport);
      pageX = elBoxObject.screenX - viewPortBoxObject.screenX;
      pageY = elBoxObject.screenY - viewPortBoxObject.screenY;
    } else {
      // Walk the offsetParent chain adding up offsets.
      for (var op = el; (op && op !== el); op = op.offsetParent) {
        pageX += op.offsetLeft;
        pageY += op.offsetTop;
        if (op !== el) {
          pageX += op.clientLeft || 0;
          pageY += op.clientTop || 0;
        }
        if (isWebkit) {
          // On webkit the offsets for position:fixed elements are off by the
          // scroll offset.
          var opPosition = doc.defaultView.getComputedStyle(op, 'position');
          if (opPosition === 'fixed') {
            pageX += doc.body.scrollLeft;
            pageY += doc.body.scrollTop;
          }
          break;
        }
      }

      // Opera & (safari absolute) incorrectly account for body offsetTop
      if ((isWebkit
           && doc.defaultView.getComputedStyle(el, 'position') === 'absolute')
          || isOpera) {
        pageY -= doc.body.offsetTop;
      }

      // Accumulate the scroll positions for everything but the body element
      for (var op = el; (op = op.offsetParent) && op !== doc.body;) {
        pageX -= op.scrollLeft;
        // see https://bugs.opera.com/show_bug.cgi?id=249965
        if (!isOpera || op.tagName !== 'TR') {
          pageY -= op.scrollTop;
        }
      }
    }

    // Figure out the viewport container so we can subtract the window's
    // scroll offsets.
    var scrollEl = !isWebkit && doc.compatMode === 'CSS1Compat'
        ? doc.documentElement
        : doc.body;

    var left = pageX - scrollEl.scrollLeft, top = pageY - scrollEl.scrollTop;
    return ({
              top: top,
              left: left,
              right: left + el.clientWidth,
              bottom: top + el.clientHeight
            });
  }

  /**
   * Returns the value of the named attribute on element.
   *
   * <p> In IE[67], if you have
   * <pre>
   *    <form id="f" foo="x"><input name="foo"></form>
   * </pre>
   * then f.foo is the input node,
   * and f.getAttribute('foo') is also the input node,
   * which is contrary to the DOM spec and the behavior of other browsers.
   *
   * <p> This function tries to get a reliable value.
   *
   * <p> In IE[67], getting 'style' may be unreliable for form elements.
   *
   * @param {HTMLElement} element a DOM element.
   * @param {string} name the name of an attribute.
   */
  function getAttribute(element, name) {
    // In IE[67], element.style.cssText seems to be the only way to get the
    // value string.  This unfortunately fails when element.style is an
    // input element instead of a style object.
    if (name === 'style') {
      var style = element.style;
      if (typeof style.cssText === 'string') {
        return style.cssText;
      }
    }
    var attr = element.getAttributeNode(name);
    if (attr && attr.specified) {
      return attr.value;
    } else {
      return null;
    }
  }

  function hasAttribute(element, name) {
    if (element.hasAttribute) {  // Non IE
      return element.hasAttribute(name);
    } else {
      var attr = element.getAttributeNode(name);
      return attr !== null && attr.specified;
    }
  }

  /**
   * Returns a "computed style" object for a DOM node.
   *
   * @param {HTMLElement element a DOM element.
   * @param {string} pseudoElement an optional pseudo-element selector,
   * such as ":first-child".
   */
  function getComputedStyle(element, pseudoElement) {
    if (element.currentStyle && pseudoElement === void 0) {
      return element.currentStyle;
    } else if (window.getComputedStyle) {
      return window.getComputedStyle(element, pseudoElement);
    } else {
      throw new Error(
          'Computed style not available for pseudo element '
          + pseudoElement);
    }
  }

  /**
   * Returns a new XMLHttpRequest object, hiding browser differences in the
   * method of construction.
   */
  function makeXhr() {
    if (typeof XMLHttpRequest === 'undefined') {
      var activeXClassIds = [
          'MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0',
          'MSXML2.XMLHTTP', 'MICROSOFT.XMLHTTP.1.0', 'MICROSOFT.XMLHTTP.1',
          'MICROSOFT.XMLHTTP'];
      for (var i = 0, n = activeXClassIds.length; i < n; i++) {
        var candidate = activeXClassIds[i];
        try {
          return new ActiveXObject(candidate);
        } catch (e) {}
      }
    }
    return new XMLHttpRequest;
  }

  return {
    addEventListener: addEventListener,
    initEvent: initEvent,
    dispatchEvent: dispatchEvent,
    cloneNode: cloneNode,
    createElement: createElement,
    createStylesheet: createStylesheet,
    setAttribute: setAttribute,
    getAttribute: getAttribute,
    hasAttribute: hasAttribute,
    getBoundingClientRect: getBoundingClientRect,
    untameEventType: untameEventType,
    extendedCreateElementFeature: featureExtendedCreateElement,
    getComputedStyle: getComputedStyle,
    makeXhr: makeXhr,
    initCanvasElement: initCanvasElement,
    initCanvasElements: initCanvasElements
  };
};

// TODO(kpreid): Kludge. Old Domita used global bridal.getWindow, but global
// bridal no longer exists since it used ambient authority. We should have a
// proper object to stick this on.
/**
 * Returns the window containing this element.
 */
bridalMaker.getWindow = function(node) {
  var doc = node.nodeType === 9  // Document node
      ? node
      : node.ownerDocument;
  // IE
  if (doc.parentWindow) { return doc.parentWindow; }
  // Everything else
  // TODO: Safari 2's defaultView wasn't a window object :(
  // Safari 2 is not A-grade, though.
  if (doc.defaultView) { return doc.defaultView; }
  // Just in case
  var s = doc.createElement('script');
  s.innerHTML = "document.parentWindow = window;";
  var body = doc.body;
  body.appendChild(s);
  body.removeChild(s);
  return doc.parentWindow;
};

// Exports for closure compiler.
// TODO(felix8a): reduce internal linkage exposed as globals
if (typeof window !== 'undefined') {
  window['bridalMaker'] = bridalMaker;
}
;
// Copyright (C) 2008-2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * A partially tamed browser object model based on
 * <a href="http://www.w3.org/TR/DOM-Level-2-HTML/Overview.html"
 * >DOM-Level-2-HTML</a> and specifically, the
 * <a href="http://www.w3.org/TR/DOM-Level-2-HTML/ecma-script-binding.html"
 * >ECMAScript Language Bindings</a>.
 *
 * Caveats:<ul>
 * <li>Security Review is pending.
 * <li><code>===</code> and <code>!==</code> on node lists will not
 *   behave the same as with untamed node lists.  Specifically, it is
 *   not always true that {@code nodeA.childNodes === nodeA.childNodes}.
 * </ul>
 *
 * <p>
 * TODO(ihab.awad): Our implementation of getAttribute (and friends)
 * is such that standard DOM attributes which we disallow for security
 * reasons (like 'form:enctype') are placed in the "virtual" attributes
 * map (the data-caja-* namespace). They appear to be settable and gettable,
 * but their values are ignored and do not have the expected semantics
 * per the DOM API. This is because we do not have a column in
 * html4-defs.js stating that an attribute is valid but explicitly
 * blacklisted. Alternatives would be to always throw upon access to
 * these attributes; to make them always appear to be null; etc. Revisit
 * this decision if needed.
 *
 * @author mikesamuel@gmail.com (original Domita)
 * @author kpreid@switchb.org (port to ES5)
 * @requires console, Uint8ClampedArray
 * @requires bridalMaker, cajaVM, cssSchema, lexCss, URI, unicode
 * @requires parseCssDeclarations, sanitizeCssProperty, sanitizeCssSelectorList
 * @requires html, html4, htmlSchema
 * @requires WeakMap, Proxy
 * @requires HtmlEmitter
 * @provides Domado
 * @overrides window
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

var Domado = (function() {
  'use strict';

  var isVirtualizedElementName = htmlSchema.isVirtualizedElementName;
  var realToVirtualElementName = htmlSchema.realToVirtualElementName;
  var virtualToRealElementName = htmlSchema.virtualToRealElementName;

  var cajaPrefix = 'data-caja-';
  var cajaPrefRe = new RegExp('^' + cajaPrefix);

  // From RFC3986
  var URI_SCHEME_RE = new RegExp(
      '^' +
      '(?:' +
        '([^:\/?# ]+)' +         // scheme
      ':)?'
  );

  var ALLOWED_URI_SCHEMES = /^(?:https?|mailto)$/i;

  /**
   * Tests if the given uri has an allowed scheme.
   * This matches the logic in UriPolicyNanny#apply
   */
  function allowedUriScheme(uri) {
    return (uri.hasScheme() && ALLOWED_URI_SCHEMES.test(uri.getScheme()));
  }

  function uriFetch(naiveUriPolicy, uri, mime, callback) {
    uri = '' + uri;
    var parsed = URI.parse(uri);
    try {
      if (!naiveUriPolicy || 'function' !== typeof naiveUriPolicy.fetch) {
        window.setTimeout(function() { callback({}); }, 0);
      } else if (allowedUriScheme(parsed)) {
        naiveUriPolicy.fetch(parsed, mime, callback);
      } else {
        naiveUriPolicy.fetch(undefined, mime, callback);
      }
    } catch (e) {
      console.log('Rejecting url ' + uri + ' because ' + e);
      window.setTimeout(function() { callback({}); }, 0);
    }
  }

  function uriRewrite(naiveUriPolicy, uri, effects, ltype, hints) {
    if (!naiveUriPolicy || 'function' !== typeof naiveUriPolicy.rewrite) {
      return null;
    }
    uri = '' + uri;
    var parsed = URI.parse(uri);
    try {
      if (allowedUriScheme(parsed)) {
        var safeUri = naiveUriPolicy.rewrite(parsed, effects, ltype, hints);
        return safeUri ? safeUri.toString() : null;
      } else {
        return null;
      }
    } catch (e) {
      console.log('Rejecting url ' + uri + ' because ' + e);
      return null;
    }
  }

  var proxiesAvailable = typeof Proxy !== 'undefined';
  var proxiesInterceptNumeric = proxiesAvailable && (function() {
    var handler = {
      toString: function() { return 'proxiesInterceptNumeric test handler'; },
      getOwnPropertyDescriptor: function(name) {
        return {value: name === '1' ? 'ok' : 'other'};
      }
    };
    handler.getPropertyDescriptor = handler.getOwnPropertyDescriptor;
    var proxy = Proxy.create(handler);
    return proxy[1] === 'ok';
  }());

  var canHaveEnumerableAccessors = (function() {
    // Firefox bug causes enumerable accessor properties to appear as own
    // properties of children. SES patches this by prohibiting enumerable
    // accessor properties. We work despite the bug by making all such
    // properties non-enumerable using this flag.
    try {
      Object.defineProperty({}, "foo", {
        enumerable: true,
        configurable: false,
        get: function () {}
      });
      return true;
    } catch (e) {
      return false;
    }
  })();

  function getPropertyDescriptor(o, n) {
    if (o === null || o === undefined) {
      return undefined;
    } else {
      return Object.getOwnPropertyDescriptor(o, n)
          || getPropertyDescriptor(Object.getPrototypeOf(o), n);
    }
  }

  /**
   * This is a simple forwarding proxy handler. Code copied 2011-05-24 from
   * <http://wiki.ecmascript.org/doku.php?id=harmony:proxy_defaulthandler>
   * with modifications to make it work on ES5-not-Harmony-but-with-proxies as
   * provided by Firefox 4.0.1 and to be compatible with SES's WeakMap
   * emulation.
   */
  function ProxyHandler(target) {
    this.target = target;
  };
  ProxyHandler.prototype = {
    constructor: ProxyHandler,

    // == fundamental traps ==

    // Object.getOwnPropertyDescriptor(proxy, name) -> pd | undefined
    getOwnPropertyDescriptor: function(name) {
      var desc = Object.getOwnPropertyDescriptor(this.target, name);
      if (desc !== undefined) { desc.configurable = true; }
      return desc;
    },

    // Object.getPropertyDescriptor(proxy, name) -> pd | undefined
    getPropertyDescriptor: function(name) {
      var desc = Object.getPropertyDescriptor(this.target, name);
      if (desc !== undefined) { desc.configurable = true; }
      return desc;
    },

    // Object.getOwnPropertyNames(proxy) -> [ string ]
    getOwnPropertyNames: function() {
      return Object.getOwnPropertyNames(this.target);
    },

    // Object.getPropertyNames(proxy) -> [ string ]
    getPropertyNames: function() {
      return Object.getPropertyNames(this.target);
    },

    // Object.defineProperty(proxy, name, pd) -> undefined
    defineProperty: function(name, desc) {
      Object.defineProperty(this.target, name, desc);
      return true;
    },

    // delete proxy[name] -> boolean
    'delete': function(name) {
      return delete this.target[name];
    },

    // Object.{freeze|seal|preventExtensions}(proxy) -> proxy
    fix: function() {
      // As long as target is not frozen,
      // the proxy won't allow itself to be fixed
      if (!Object.isFrozen(this.target)) {
        return undefined;
      }
      var props = {};
      for (var name in this.target) {
        props[name] = Object.getOwnPropertyDescriptor(this.target, name);
      }
      return props;
    },

    // == derived traps ==

    // name in proxy -> boolean
    has: function(name) { return name in this.target; },

    // ({}).hasOwnProperty.call(proxy, name) -> boolean
    hasOwn: function(name) {
      return ({}).hasOwnProperty.call(this.target, name);
    },

    // proxy[name] -> any
    get: function(proxy, name) {
      return this.target[name];
    },

    // proxy[name] = value
    set: function(proxy, name, value) {
      this.target[name] = value;
      return true;
    },

    // for (var name in proxy) { ... }
    enumerate: function() {
      var result = [];
      for (var name in this.target) { result.push(name); };
      return result;
    },

    /*
    // if iterators would be supported:
    // for (var name in proxy) { ... }
    iterate: function() {
      var props = this.enumerate();
      var i = 0;
      return {
        next: function() {
          if (i === props.length) throw StopIteration;
          return props[i++];
        }
      };
    },*/

    // Object.keys(proxy) -> [ string ]
    keys: function() { return Object.keys(this.target); }
  };
  cajaVM.def(ProxyHandler);

  function makeOverrideSetter(object, prop) {
    return innocuous(function overrideSetter(newValue) {
      if (object === this) {
        throw new TypeError('Cannot set virtually frozen property: ' + prop);
      }
      if (!!Object.getOwnPropertyDescriptor(this, prop)) {
        this[prop] = newValue;
      }
      // TODO(erights): Do all the inherited property checks
      Object.defineProperty(this, prop, {
        value: newValue,
        writable: true,
        enumerable: true,
        configurable: true
      });
    });
  }

  /**
   * Takes a property descriptor and, if it is a non-writable data property or
   * an accessor with only a getter, returns a replacement descriptor which
   * allows the property to be overridden by assignment.
   *
   * Note that the override behavior is only of value when the object is
   * inherited from, so properties defined on "instances" should not use this as
   * it is unnecessarily expensive.
   */
  function allowNonWritableOverride(object, prop, desc) {
    if (!('value' in desc && !desc.writable)) {
      return desc;
    }
    var value = desc.value;
    // TODO(kpreid): Duplicate of tamperProof() from repairES5.js.
    // We should extract that getter/setter pattern as a separate routine; but
    // note that we need to make the same API available from ES5/3 (though not
    // the same behavior, since ES5/3 rejects the 'override mistake',
    // ASSIGN_CAN_OVERRIDE_FROZEN in repairES5 terms) available from ES5/3.
    return {
      configurable: desc.configurable,
      enumerable: desc.enumerable,
      get: innocuous(function overrideGetter() { return value; }),
      set: makeOverrideSetter(object, prop)
    };
  }

  /**
   * Alias for a common pattern: non-enumerable toString method.
   */
  function setToString(obj, fn) {
    Object.defineProperty(obj, 'toString',
        allowNonWritableOverride(obj, 'toString', {value: fn}));
  }

  /**
   * Shortcut for a single unmodifiable property. No provision for override.
   */
  function setFinal(object, prop, value) {
    Object.defineProperty(object, prop, {
      enumerable: true,
      value: value
    });
  }

  /**
   * Given that n is a string, is n an "array element" property name?
   */
  function isNumericName(n) {
    return ('' + (+n)) === n;
  }

  function inherit(subCtor, superCtor, opt_writableProto) {
    var inheritingProto = Object.create(superCtor.prototype);
    // TODO(kpreid): The following should work but is a no-op on Chrome
    // 24.0.1312.56, which breaks everything. Enable it when possible.
    //Object.defineProperty(subCtor, 'prototype', {
    //  value: inheritingProto,
    //  writable: Boolean(opt_writableProto),
    //  enumerable: false,
    //  configurable: false
    //});
    // Workaround:
    if (opt_writableProto) {
      subCtor.prototype = inheritingProto;
    } else {
      Object.defineProperty(subCtor, 'prototype', {
        enumerable: false,
        value: inheritingProto
      });
    }

    Object.defineProperty(subCtor.prototype, 'constructor', {
      value: subCtor,
      writable: true,
      enumerable: false,
      configurable: true
    });
  }

  /**
   * Checks that a user-supplied callback is a function. Return silently if the
   * callback is valid; throw an exception if it is not valid.
   *
   * TODO(kpreid): Is this conversion to ES5-world OK?
   *
   * @param aCallback some user-supplied "function-like" callback.
   */
  function ensureValidCallback(aCallback) {

    if ('function' !== typeof aCallback) {
      throw new Error('Expected function not ' + typeof aCallback);
    }
  }

  /**
   * This combines trademarks with amplification, and is really a thin wrapper
   * on WeakMap. It allows objects to have an arbitrary collection of private
   * properties, which can only be accessed by those holding the amplifier 'p'
   * (which, in most cases, should be only a particular prototype's methods.)
   *
   * Unlike trademarks, this does not freeze the object. It is assumed that the
   * caller makes the object sufficiently frozen for its purposes and/or that
   * the private properties are all that needs protection.
   *
   * This is designed to be more efficient and straightforward than using both
   * trademarks and per-private-property sealed boxes or weak maps.
   *
   * Capability design note: This facility provides sibling amplification (the
   * ability for one object to access the private state of other similar
   * objects).
   */
  var Confidence = (function () {
    // superTable, superTypename are undefined if there is no supertype
    function _SubConfidence(typename, superTable, superTypename) {
      var table = new WeakMap();

      /**
       * Add an object to the confidence. This permits it to pass the
       * guard and provides a private-properties record for it.
       *
       * @param {Object} object The object to add.
       * @param {Object} taming The taming membrane which the object is on the
       *     tame side of.
       * @param {Object} opt_sameAs If provided, an existing object whose
       *     private state will be reused for {@code object}.
       */
      this.confide = cajaVM.constFunc(function(object, taming, opt_sameAs) {
        //console.debug("Confiding:", object);
        if (table.get(object) !== undefined) {
          if (table.get(object)._obj !== object) {
            throw new Error("WeakMap broke! " + object + " vs. " +
                table.get(object)._obj);
          }
          throw new Error(typename + " has already confided in " + object);
        }

        var privates;
        if (superTable !== undefined) {
          privates = superTable.get(object);
          if (!privates) {
            throw new Error(typename + ': object must already be a ' +
                superTypename);
          }
          // TODO(kpreid): validate taming, opt_sameAs
        } else if (opt_sameAs !== undefined) {
          privates = table.get(opt_sameAs);
          if (!privates) {
            throw new Error(typename + ': opt_sameAs not confided');
          }
        } else {
          privates = {_obj: object, _taming: taming};
        }

        table.set(object, privates);
      });

      var guard = this.guard = cajaVM.makeTableGuard(table, typename,
          'This operation requires a ' + typename);

      /**
       * Wrap a method or other function so as to ensure that:
       *   * 'this' is a confidant,
       *   * the first parameter of the original function is the private state,
       *   * the wrapper is frozen,
       *   * and any exceptions thrown from host-side code are wrapped.
       */
      this.amplifying = function(method) {
        if (typeof method !== 'function') {
          throw new Error(typename + ': amplifying(non-function): ' + method);
        }
        function amplifierMethod(var_args) {
          var privates = table.get(this);
          if (privates) {
            var ampargs = [privates];
            ampargs.push.apply(ampargs, arguments);
            try {
              return method.apply(this, ampargs);
            } catch (e) {
              throw privates._taming.tameException(e);
            }
          } else {
            guard.coerce(this);  // borrow exception
            throw 'can\'t happen';
          }
        }
        amplifierMethod.toString = innocuous(function() {
          return '[' + typename + ']' + method.toString();
        });
        return cajaVM.constFunc(amplifierMethod);
      };

      /**
       * 'amplify(o, f)' is identical to 'amplifying(f).call(o)' but
       * significantly more efficient.
       */
      this.amplify = function(object, method) {
        var privates = table.get(object);
        if (privates) {
          var ampargs = [privates];
          ampargs.push.apply(ampargs, arguments);
          try {
            return method.apply(object, ampargs);
          } catch (e) {
            throw privates._taming.tameException(e);
          }
        } else {
          guard.coerce(object);  // borrow exception
          throw 'can\'t happen';
        }
      };

      this.subtype = function(subtypeName) {
        return new _SubConfidence(subtypeName, table, typename);
      }.bind(this);

      this.typename = typename;
    }

    function Confidence(typename) {
      return new _SubConfidence(typename, undefined, undefined);
    }
    Confidence.prototype.toString = cajaVM.constFunc(function() {
      return this.typename + 'Confidence';
    });

    _SubConfidence.prototype = Confidence.prototype;

    return cajaVM.def(Confidence);
  })();

  /**
   * Explicit marker that this is a function intended to be exported that needs
   * no other wrapping. Also, remove the function's .prototype object.
   *
   * As a matter of style, fn should always be a function literal; think of this
   * as a modifier to function literal syntax. This ensures that it is not
   * misapplied to functions which have more complex circumstances.
   */
  // TODO(kpreid): Verify this in tests, e.g. by adding a property and checking
  function innocuous(f) {
    return cajaVM.constFunc(f);
  }

  var PROPERTY_DESCRIPTOR_KEYS = {
    configurable: 0,
    enumerable: 0,
    writable: 0,
    value: 0,
    get: 0,
    set: 0
  };

  /**
   * Utilities for defining properties.
   */
  var Props = (function() {
    var NO_PROPERTY = null;

    /**
     * Return a function returning an environment. Environments are context
     * implicitly available to our extended property descriptors ('property
     * specifiers') such as the name of the property being defined (so that a
     * single spec can express "forward this property to the same-named property
     * on another object", for example).
     */
    function makeEnvOuter(object, opt_confidence) {
      // TODO(kpreid): confidence typename is not actually currently specific
      // enough for debugging (node subclasses, in particular) but it's the
      // only formal name we have right now.
      var typename = opt_confidence ? opt_confidence.typename : String(object);
      var amplifying = opt_confidence
          ? opt_confidence.amplifying.bind(opt_confidence)
          : function(fn) {
              throw new Error('Props.define: no confidence, no amplifying');
            };
      return function(prop) {
        var msgPrefix = 'Props.define: ' + typename + '.' + prop;
        return {
          object: object,
          prop: prop,
          msgPrefix: msgPrefix,
          amplifying: amplifying
        };
      };
    }

    /**
     * Convert a property spec (our notion) to a property descriptor (ES5
     * notion) and validate/repair/kludge it.
     *
     * The returned property descriptor is fresh.
     */
    function specToDesc(env, propSpec) {
      if (propSpec === NO_PROPERTY) { return propSpec; }
      switch (typeof propSpec) {
        case 'function':
          if (!propSpec.isPropMaker) {
            // TODO(kpreid): Temporary check for refactoring.
            throw new TypeError(env.msgPrefix +
                ' defined with a function not a prop maker');
          }
          return specToDesc(env, propSpec(env));

        case 'object':
          // Make a copy so that we can mutate desc, and validate.
          var desc = copyAndValidateDesc(env, propSpec);

          if ('get' in desc || 'set' in desc) {
            // Firefox bug workaround; see canHaveEnumerableAccessors.
            desc.enumerable = desc.enumerable && canHaveEnumerableAccessors;
          }

          if (desc.get && !Object.isFrozen(desc.get)) {
            if (typeof console !== 'undefined') {
              console.warn(env.msgPrefix + ' getter is not frozen; fixing.');
            }
            cajaVM.constFunc(desc.get);
          }
          if (desc.set && !Object.isFrozen(desc.set)) {
            if (typeof console !== 'undefined') {
              console.warn(env.msgPrefix + ' setter is not frozen; fixing.');
            }
            cajaVM.constFunc(desc.set);
          }

          return desc;

        default:
          throw new TypeError(env.msgPrefix +
              ' spec not a function or descriptor (' + propSpec + ')');
      }
    }

    function copyAndValidateDesc(env, inDesc) {
      var desc = {};
      for (var k in inDesc) {
        if (PROPERTY_DESCRIPTOR_KEYS.hasOwnProperty(k)) {
          // Could imagine doing a type-check here, but not bothering.
          desc[k] = inDesc[k];
        } else {
          throw new TypeError(env.msgPrefix +
              ': Unexpected key in property descriptor: ' + k);
        }
      }
      return desc;
    }

    /**
     * For each enumerable p: s in propSpecs, do
     *
     *   Object.defineProperty(object, p, specToDesc(..., s))
     *
     * where specToDesc() passes plain property descriptors through and can
     * also construct property descriptors based on the specified 'p' or
     * 'confidence' if s is one of the property-maker functions provided by
     * Props.
     *
     * Additionally, getters and setters are checked for being frozen, and the
     * syntax of the descriptor is checked.
     */
    function define(object, opt_confidence, propSpecs) {
      var makeEnv = makeEnvOuter(object, opt_confidence);
      for (var prop in propSpecs) {
        var desc = specToDesc(makeEnv(prop), propSpecs[prop]);
        if (desc !== NO_PROPERTY) {
          Object.defineProperty(object, prop, desc);
        }
      }
    }

    /**
     * A property which behaves as if as it was named the mapName.
     */
    function actAs(mapName, propSpec) {
      return markPropMaker(function(env) {
        return specToDesc(
          Object.create(env, {
            prop: {value: mapName}
          }),
          propSpec);
      });
    }

    /**
     * A getter which forwards to the other-named property of this
     * object.
     *
     * (This does not also forward a setter so as to avoid producing a visible
     * but useless setter if the other property is read-only. If that is needed,
     * we'll define aliasRW. Unfortunately there's no way to 'statically'
     * determine which behavior to use.)
     *
     * Remember that the other property could have been overridden by the caller
     * if it is inherited!
     */
    function aliasRO(enumerable, otherProp) {
      return {
        enumerable: enumerable,
        get: innocuous(function aliasGetter() { return this[otherProp]; })
      };
    }

    /**
     * A non-writable, possibly enumerable, overridable constant-valued
     * property.
     */
    function overridable(enumerable, value) {
      return markPropMaker(function overridablePropMaker(env) {
        return allowNonWritableOverride(env.object, env.prop, {
          enumerable: enumerable,
          value: value
        });
      });
    }

    /**
     * Add override to an accessor property.
     */
    function addOverride(spec) {
      return markPropMaker(function overridablePropMaker(env) {
        var desc = specToDesc(env, spec);
        if ('set' in desc || 'value' in desc) {
          throw new Error('bad addOverride');
        } else {
          desc.set = makeOverrideSetter(env.object, env.prop);
        }
        return desc;
      });
    }

    /**
     * An overridable, enumerable method.
     *
     * fn will have innocuous() applied to it (thus ending up with its
     * .prototype removed).
     *
     * As a matter of style, fn should always be a function literal; think of
     * this as a modifier to function literal syntax. This ensures that it is
     * not misapplied to functions which have more complex circumstances.
     */
    function plainMethod(fn) {
      return overridable(true, innocuous(fn));
    }

    /**
     * An overridable, enumerable, amplifying (as in confidence.amplifying)
     * method.
     *
     * The function should be a function literal.
     */
    function ampMethod(fn) {
      return markPropMaker(function(env) {
        return overridable(true, env.amplifying(fn));
      });
    }

    /**
     * A non-overridable, enumerable, amplifying (as in confidence.amplifying)
     * getter.
     *
     * The function should be a function literal.
     */
    function ampGetter(fn) {
      return markPropMaker(function(env) {
        return {
          enumerable: true,
          get: env.amplifying(fn)
        };
      });
    }

    /**
     * A non-overridable, enumerable, amplifying (as in confidence.amplifying)
     * getter and setter.
     *
     * The functions should be function literals.
     */
    function ampAccessor(getter, setter) {
      return markPropMaker(function(env) {
        return {
          enumerable: true,
          get: env.amplifying(getter),
          set: env.amplifying(setter)
        };
      });
    }

    /**
     * Checkable label for all property specs implemented functions.
     * TODO(kpreid): Have fewer custom property makers outside of Props itself;
     * provide tools to build them instead.
     */
    function markPropMaker(fn) {
      fn.isPropMaker = true;
      // causes a TypeError inside ToPropertyDescriptor
      fn.get = '<PropMaker used as propdesc canary>';
      return fn;
    }

    /**
     * Only define the property if the condition is true.
     *
     * For more complex cases use regular conditionals and NO_PROPERTY.
     */
    function cond(condition, specThen) {
      return condition ? specThen : NO_PROPERTY;
    }

    return {
      define: define,
      actAs: actAs,
      aliasRO: aliasRO,
      overridable: overridable,
      addOverride: addOverride,
      plainMethod: plainMethod,
      ampMethod: ampMethod,
      ampGetter: ampGetter,
      ampAccessor: ampAccessor,
      cond: cond,
      NO_PROPERTY: NO_PROPERTY,
      markPropMaker: markPropMaker
    };
  })();

  var CollectionProxyHandler = (function() {
    /**
     * Handler for a proxy which presents value properties derived from an
     * external data source.
     *
     * The subclass should implement .col_lookup(name) -> internalvalue,
     * .col_evaluate(internalvalue) -> value, and .col_names() -> array.
     */
    function CollectionProxyHandler(target) {
      ProxyHandler.call(this, target);
    }
    inherit(CollectionProxyHandler, ProxyHandler);
    CollectionProxyHandler.prototype.toString = function() {
      return '[CollectionProxyHandler]';
    };
    CollectionProxyHandler.prototype.getOwnPropertyDescriptor =
        function (name) {
      var lookup;
      if ((lookup = this.col_lookup(name))) {
        return {
          configurable: true,  // proxy invariant check
          enumerable: true,  // TODO(kpreid): may vary
          writable: false,
          value: this.col_evaluate(lookup)
        };
      } else {
        return ProxyHandler.prototype.getOwnPropertyDescriptor.call(this, name);
      }
    };
    CollectionProxyHandler.prototype.get = function(receiver, name) {
      var lookup;
      if ((lookup = this.col_lookup(name))) {
        return this.col_evaluate(lookup);
      } else {
        return ProxyHandler.prototype.get.call(this, receiver, name);
      }
    };
    CollectionProxyHandler.prototype.getOwnPropertyNames = function() {
      var names = ProxyHandler.prototype.getOwnPropertyNames.call(this);
      names.push.apply(names, this.col_names());
      return names;
    };
    CollectionProxyHandler.prototype['delete'] = function(name) {
      var lookup;
      if ((lookup = this.col_lookup(name))) {
        return false;
      } else {
        return ProxyHandler.prototype['delete'].call(this, name);
      }
    };
    return cajaVM.def(CollectionProxyHandler);
  }());

  /** XMLHttpRequest or an equivalent on IE 6. */
  function XMLHttpRequestCtor(XMLHttpRequest, ActiveXObject, XDomainRequest) {
    if (XMLHttpRequest &&
      new XMLHttpRequest().withCredentials !== undefined) {
      return XMLHttpRequest;
    } else if (XDomainRequest) {
      return function XDomainRequestObjectForIE() {
        var xdr = new XDomainRequest();
        xdr.onload = function () {
          if ('function' === typeof xdr.onreadystatechange) {
            xdr.status = 200;
            xdr.readyState = 4;
            xdr.onreadystatechange.call(xdr, null, false);
          }
        };
        var errorHandler = function () {
          if ('function' === typeof xdr.onreadystatechange) {
            xdr.status = 500;
            xdr.readyState = 4;
            xdr.onreadystatechange.call(xdr, null, false);
          }
        };
        xdr.onerror = errorHandler;
        xdr.ontimeout = errorHandler;
        return xdr;
      };
    } else if (ActiveXObject) {
     // The first time the ctor is called, find an ActiveX class supported by
     // this version of IE.
      var activeXClassId;
      return function ActiveXObjectForIE() {
        if (activeXClassId === void 0) {
          activeXClassId = null;
          /** Candidate Active X types. */
          var activeXClassIds = [
              'MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0',
              'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP',
              'MICROSOFT.XMLHTTP.1.0', 'MICROSOFT.XMLHTTP.1',
              'MICROSOFT.XMLHTTP'];
          for (var i = 0, n = activeXClassIds.length; i < n; i++) {
            var candidate = activeXClassIds[+i];
            try {
              void new ActiveXObject(candidate);
              activeXClassId = candidate;
              break;
            } catch (e) {
              // do nothing; try next choice
            }
          }
          activeXClassIds = null;
        }
        return new ActiveXObject(activeXClassId);
      };
    } else {
      throw new Error('ActiveXObject not available');
    }
  }

  function TameXMLHttpRequest(
      taming,
      xmlHttpRequestMaker,
      naiveUriPolicy,
      getBaseURL) {
    // See http://www.w3.org/TR/XMLHttpRequest/

    // TODO(ihab.awad): Improve implementation (interleaving, memory leaks)
    // per http://www.ilinsky.com/articles/XMLHttpRequest/

    var TameXHRConf = new Confidence('TameXMLHttpRequest');
    var amplifying = TameXHRConf.amplifying;
    var amplify = TameXHRConf.amplify;

    // Note: Since there is exactly one TameXMLHttpRequest per feral XHR, we do
    // not use an expando proxy and always let clients set expando properties
    // directly on this. This simplifies implementing onreadystatechange.
    function TameXMLHttpRequest() {
      TameXHRConf.confide(this, taming);
      amplify(this, function(privates) {
        var xhr = privates.feral = new xmlHttpRequestMaker();
        taming.tamesTo(xhr, this);

        privates.async = undefined;
        privates.handler = undefined;

        Object.preventExtensions(privates);
      });
    }
    Props.define(TameXMLHttpRequest.prototype, TameXHRConf, {
      onreadystatechange: {
        enumerable: true,
        set: amplifying(function(privates, handler) {
          // TODO(ihab.awad): Do we need more attributes of the event than
          // 'target'? May need to implement full "tame event" wrapper similar
          // to DOM events.
          var self = this;
          privates.feral.onreadystatechange = function(event) {
            var evt = { target: self };
            return handler.call(void 0, evt);
          };
          // Store for later direct invocation if need be
          privates.handler = handler;
        })
      },
      // TODO(kpreid): This are PT.ROView properties but our layering does not
      // offer that here.
      readyState: Props.ampGetter(function(privates) {
        // The ready state should be a number
        return Number(privates.feral.readyState);
      }),
      responseText: Props.ampGetter(function(privates) {
        var result = privates.feral.responseText;
        return (result === undefined || result === null)
            ? result : String(result);
      }),
      responseXML: Props.ampGetter(function(privates) {
        var feralXml = privates.feral.responseXML;
        if (feralXml === null || feralXml === undefined) {
          // null = 'The response did not parse as XML.'
          return null;
        } else {
          // TODO(ihab.awad): Implement a taming layer for XML. Requires
          // generalizing the HTML node hierarchy as well so we have a unified
          // implementation.

          // This kludge is just enough to keep the jQuery tests from freezing.
          var node = {nodeName: '#document'};
          node.cloneNode = function () { return node; };
          node.toString = function () {
            return 'Caja does not support XML.';
          };
          return {documentElement: node};
        }
      }),
      status: Props.ampGetter(function(privates) {
        var result = privates.feral.status;
        return (result === undefined || result === null) ?
          result : Number(result);
      }),
      statusText: Props.ampGetter(function(privates) {
        var result = privates.feral.statusText;
        return (result === undefined || result === null) ?
          result : String(result);
      }),
      open: Props.ampMethod(function(
          privates, method, URL, opt_async, opt_userName, opt_password) {
        method = String(method);
        URL = URI.utils.resolve(getBaseURL(), String(URL));
        // The XHR interface does not tell us the MIME type in advance, so we
        // must assume the broadest possible.
        var safeUri = uriRewrite(
            naiveUriPolicy,
            URL, html4.ueffects.SAME_DOCUMENT, html4.ltypes.DATA,
            {
              "TYPE": "XHR",
              "XHR_METHOD": method,
              "XHR": true  // Note: this hint is deprecated
            });
        // If the uriPolicy rejects the URL, we throw an exception, but we do
        // not put the URI in the exception so as not to put the caller at risk
        // of some code in its stack sniffing the URI.
        if ('string' !== typeof safeUri) {
          throw 'URI violates security policy';
        }
        switch (arguments.length) {
        case 2:
          privates.async = true;
          privates.feral.open(method, safeUri);
          break;
        case 3:
          privates.async = opt_async;
          privates.feral.open(method, safeUri, Boolean(opt_async));
          break;
        case 4:
          privates.async = opt_async;
          privates.feral.open(
              method, safeUri, Boolean(opt_async), String(opt_userName));
          break;
        case 5:
          privates.async = opt_async;
          privates.feral.open(
              method, safeUri, Boolean(opt_async), String(opt_userName),
              String(opt_password));
          break;
        default:
          throw 'XMLHttpRequest cannot accept ' + arguments.length +
              ' arguments';
          break;
        }
      }),
      setRequestHeader: Props.ampMethod(function(privates, label, value) {
        privates.feral.setRequestHeader(String(label), String(value));
      }),
      send: Props.ampMethod(function(privates, opt_data) {
        if (arguments.length === 0) {
          // TODO(ihab.awad): send()-ing an empty string because send() with no
          // args does not work on FF3, others?
          privates.feral.send('');
        } else if (typeof opt_data === 'string') {
          privates.feral.send(opt_data);
        } else /* if XML document */ {
          // TODO(ihab.awad): Expect tamed XML document; unwrap and send
          privates.feral.send('');
        }

        // Firefox does not call the 'onreadystatechange' handler in
        // the case of a synchronous XHR. We simulate this behavior by
        // calling the handler explicitly.
        if (privates.feral.overrideMimeType) {
          // This is Firefox
          if (!privates.async && privates.handler) {
            var evt = { target: this };
            privates.handler.call(void 0, evt);
          }
        }
      }),
      abort: Props.ampMethod(function(privates) {
        privates.feral.abort();
      }),
      getAllResponseHeaders: Props.ampMethod(function(privates) {
        var result = privates.feral.getAllResponseHeaders();
        return (result === undefined || result === null) ?
          result : String(result);
      }),
      getResponseHeader: Props.ampMethod(function(privates, headerName) {
        var result = privates.feral.getResponseHeader(String(headerName));
        return (result === undefined || result === null) ?
          result : String(result);
      }),
      toString: Props.overridable(false, innocuous(function() {
        return 'Not a real XMLHttpRequest';
      }))
    });
    return cajaVM.def(TameXMLHttpRequest);
  }

  function CssPropertiesCollection() {
    var cssToDom = {};
    var domToCss = {};
    for (var cssName in cssSchema) {
      // Don't create properties for CSS functions like "rgb()".
      if (cssName.indexOf('(') >= 0) { continue; }
      var domName =
          cssName === 'float'
            ? 'cssFloat'
            : cssName.replace(
                /-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      cssToDom[cssName] = domName;
      domToCss[domName] = cssName;
    }

    return {
      isDomName: function (p) {
        return domToCss.hasOwnProperty(p);
      },
      isCssName: function (p) {
        return cssToDom.hasOwnProperty(p);
      },
      domToCss: function (p) {
        return domToCss[p];
      },
      cssToDom: function(p) {
        return cssToDom[p];
      },
      forEachDomName: function (f) {
        for (var p in domToCss) {
          if (domToCss.hasOwnProperty(p)) {
            f(p);
          }
        }
      }
    };
  }

  function TamingClassTable() {
    var self = this;

    var hop = Object.prototype.hasOwnProperty;

    // TODO(kpreid): When ES5/3 and the relevant Chrome bug are dead, make this
    // Object.create(null).
    var thunks = {};

    var prototypeNames = new WeakMap();

    /**
     * Register a lazy-initialized taming ctor. The builder function should
     * return the taming ctor.
     */
    this.registerLazy = function registerLazy(name, builder) {
      if (Object.prototype.hasOwnProperty.call(thunks, name)) {
        throw new Error('TamingClassTable: duplicate registration of ' + name);
      }
      var result = undefined;
      thunks[name] = function tamingClassMemoThunk() {
        if (!result) {
          var tamingCtor = builder();
          var inert = tamingCtor.prototype.constructor;
          // TODO(kpreid): Validate that the inert ctor is in fact inert
          result = {
            tamingCtor: tamingCtor,  // special applications need lack of def
                // here
            guestCtor: cajaVM.def(inert)
          };

          // Registering multiple names is allowed. However, if we ever stop
          // having multiple names (HTMLElement vs. Element, HTMLDocument vs.
          // Document), which would be technically correct, this should become a
          // failure case.
          if (!prototypeNames.has(inert.prototype)) {
            prototypeNames.set(inert.prototype, name);
          }
        }
        return result;
      };
    };

    /**
     * This does three things:
     *
     * Replace tamingCtor's prototype with one whose prototype is someSuper.
     *
     * Hide the constructor of the products of tamingCtor, replacing it with a
     * function which just throws (but can still be used for instanceof
     * checks).
     *
     * Register the inert ctor under the given name if not undefined.
     * TODO(kpreid): Review deprecating that entirely in favor of laziness.
     */
    this.inertCtor = function inertCtor(
        tamingCtor, someSuper, opt_name, opt_writableProto) {
      inherit(tamingCtor, someSuper, opt_writableProto);

      var inert = function domadoInertConstructor() {
        throw new TypeError('This constructor cannot be called directly.');
      };
      var string = opt_name ? '[domado inert constructor ' + opt_name + ']'
                            : '[domado inert constructor]';
      inert.toString = cajaVM.constFunc(function inertCtorToString() {
        return string;
      });
      inert.prototype = tamingCtor.prototype;
      Object.freeze(inert);  // not def, because inert.prototype must remain
      Object.defineProperty(tamingCtor.prototype, 'constructor', {
        value: inert
      });

      if (opt_name !== undefined) {
        self.registerLazy(opt_name, function() { return tamingCtor; });
      }

      return inert;
    };

    // TODO(kpreid): Remove uses of this -- all for the wrong multiple names.
    this.registerSafeCtor = function registerSafeCtor(name, safeCtor) {
      self.registerLazy(name, function() {
        function stubTamingCtor() {
          throw new Error('Should not have been called');
        }
        stubTamingCtor.prototype = { constructor: safeCtor };
        return stubTamingCtor;
      });
    };

    this.finish = function finish() {
      Object.freeze(thunks);
    };

    this.exportTo = function exportTo(imports) {
      if (Object.isExtensible(thunks)) {
        throw new Error(
            'TamingClassTable: exportTo called before defAllAndFinish');
      }
      Object.getOwnPropertyNames(thunks).forEach(function(name) {
        var thunk = thunks[name];
        Object.defineProperty(imports, name, {
          enumerable: true,
          configurable: true,
          get: cajaVM.constFunc(function tamingClassGetter() {
            return thunk().guestCtor;
          }),
          set: cajaVM.constFunc(function tamingClassSetter(newValue) {
            // This differs from the makeOverrideSetter setter in that it allows
            // override on the object itself, not just objects inheriting this
            // descriptor.
            Object.defineProperty(this, name, {
              value: newValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          })
        });
      });
    };

    this.getTamingCtor = function(name) {
      // TODO(kpreid): When we no longer need to support platforms without
      // Object.create(null) (ES5/3, some Chrome), we should throw out this
      // hasOwnProperty.
      return hop.call(thunks, name) ? thunks[name]().tamingCtor : undefined;
    };

    this.getNameOfPrototype = function(prototype) {
      return prototypeNames.get(prototype);
    };
  }

  var NOT_EDITABLE = "Node not editable.";
  var UNSAFE_TAGNAME = "Unsafe tag name.";
  var UNKNOWN_TAGNAME = "Unknown tag name.";
  var INDEX_SIZE_ERROR = "Index size error.";

  /**
   * Authorize the Domado library.
   *
   * The result of this constructor is almost stateless. The exceptions are
   * that each instance has unique trademarks for certain types of tamed
   * objects, and a shared map allowing separate virtual documents to dispatch
   * events across them. (TODO(kpreid): Confirm this explanation is good.)
   *
   * TODO(kpreid): Revisit whether this stage should exist, now that rulebreaker
   * is gone.
   *
   * @return A record of functions attachDocument, dispatchEvent, and
   *     dispatchToHandler.
   */
  return cajaVM.constFunc(function Domado_() {
    // Everything in this scope but not in function attachDocument() below
    // does not contain lexical references to a particular DOM instance, but
    // may have some kind of privileged access to Domado internals.

    // TODO(kpreid): This ID management should probably be handled by
    // ses-single-frame.js instead.
    var importsToId = new WeakMap(true);
    var idToImports = [];
    var nextPluginId = 0;
    function getId(imports) {
      if (importsToId.has(imports)) {
        return importsToId.get(imports);
      } else {
        var id = nextPluginId++;
        importsToId.set(imports, id);
        idToImports[id] = imports;
        return id;
      }
    }
    function getImports(id) {
      var imports = idToImports[id];
      if (imports === undefined) {
        throw new Error('Internal: imports#', id, ' unregistered');
      }
      return imports;
    }

    // value transforming/trivial functions
    function noop() { return undefined; }
    function identity(x) { return x; }
    function defaultToEmptyStr(x) { return x || ''; }

    // Array Remove - By John Resig (MIT Licensed)
    function arrayRemove(array, from, to) {
      var rest = array.slice((to || from) + 1 || array.length);
      array.length = from < 0 ? array.length + from : from;
      return array.push.apply(array, rest);
    }

    // It is tempting to name this table "burglar".
    var windowToDomicile = new WeakMap();

    var TameEventConf = new Confidence('TameEvent');
    var TameEventT = TameEventConf.guard;
    var eventAmplify = TameEventConf.amplify;
    var TameImageDataConf = new Confidence('TameImageData');
    var TameImageDataT = TameImageDataConf.guard;
    var TameGradientConf = new Confidence('TameGradient');
    var TameGradientT = TameGradientConf.guard;

    var XML_SPACE = '\t\n\r ';

    var JS_SPACE = '\t\n\r ';
    // An identifier that does not end with __.
    var JS_IDENT = '(?:[a-zA-Z_][a-zA-Z0-9$_]*[a-zA-Z0-9$]|[a-zA-Z])_?';

    // These id patterns match the ones in HtmlAttributeRewriter.

    var VALID_ID_CHAR =
        unicode.LETTER + unicode.DIGIT + '_'
        + '$\\-.:;=()\\[\\]'
        + unicode.COMBINING_CHAR + unicode.EXTENDER;

    var VALID_ID_PATTERN = new RegExp(
        '^[' + VALID_ID_CHAR + ']+$');

    var VALID_ID_LIST_PATTERN = new RegExp(
        '^[' + XML_SPACE + VALID_ID_CHAR + ']*$');

    var FORBIDDEN_ID_PATTERN = new RegExp('__\\s*$');

    var FORBIDDEN_ID_LIST_PATTERN = new RegExp('__(?:\\s|$)');

    function isValidId(s) {
      return !FORBIDDEN_ID_PATTERN.test(s)
          && VALID_ID_PATTERN.test(s);
    }

    function isValidFragment(s) {
      var idValue = s.substring(1);
      return s.charAt(0) === '#' && ('' === idValue || isValidId(idValue));
    }

    function isValidIdList(s) {
      return !FORBIDDEN_ID_LIST_PATTERN.test(s)
          && VALID_ID_LIST_PATTERN.test(s);
    }

    // Trim whitespace from the beginning and end of a string, using this
    // definition of whitespace:
    // per http://www.whatwg.org/specs/web-apps/current-work/multipage/common-microsyntaxes.html#space-character
    function trimHTML5Spaces(input) {
      return input.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
    }

    function mimeTypeForAttr(tagName, attribName) {
      if (attribName === 'src') {
        if (tagName === 'img') { return 'image/*'; }
        if (tagName === 'script') { return 'text/javascript'; }
      }
      return '*/*';
    }

    // TODO(ihab.awad): Does this work on IE, where console output
    // goes to a DOM node?
    function assert(cond) {
      if (!cond) {
        if (typeof console !== 'undefined') {
          console.error('Domado: assertion failed');
          console.trace();
        }
        throw new Error('Domado: assertion failed');
      }
    }

    /*
     * Generic wrapper for the timing APIs
     *   setTimeout/clearTimeout
     *   setInterval/clearInterval
     *   requestAnimationFrame/cancelAnimationFrame
     * which treats timeout IDs as capabilities so that the guest cannot clear
     * a timeout it didn't set, and prevents the callback from being a string
     * value which would be evaluated outside the sandbox.
     */
    function tameSetAndClear(target, set, clear, setName, clearName, passArg,
        evalStrings, environment) {
      var ids = new WeakMap();
      function tameSet(action, delayMillis) {
        // Existing browsers treat a timeout/interval of null or undefined as a
        // noop.
        var id;
        if (action) {
          if (typeof action === 'function') {
            // OK
          } else if (evalStrings) {
            // Note specific ordering: coercion to string occurs at time of
            // call, syntax errors occur async.
            var code = '' + action;
            action = function callbackStringWrapper() {
              cajaVM.compileModule(code)(environment);
            };
          } else {
            // Early error for usability -- we also defend below.
            // This check is not *necessary* for security.
            throw new TypeError(
                setName + ' called with a ' + typeof action + '.'
                + '  Please pass a function instead of a string of JavaScript');
          }
          // actionWrapper defends against:
          //   * Passing a string-like object which gets taken as code.
          //   * Non-standard arguments to the callback.
          //   * Non-standard effects of callback's return value.
          var actionWrapper = passArg
            ? function(time) { action(+time); }  // requestAnimationFrame
            : function() { action(); };  // setTimeout, setInterval
          id = set(actionWrapper, delayMillis | 0);
        } else {
          id = undefined;
        }
        var tamed = {};
        ids.set(tamed, id);
        // Freezing is not *necessary*, but it makes testing/reasoning simpler
        // and removes a degree of freedom actual browsers don't provide (they
        // return numbers).
        return Object.freeze(tamed);
      }
      function tameClear(id) {
        // From https://developer.mozilla.org/en/DOM/window.clearTimeout says:
        //   Notes:
        //   Passing an invalid ID to clearTimeout does not have any effect
        //   (and doesn't throw an exception).

        // WeakMap will throw on these, so early exit.
        if (typeof id !== 'object' || id == null) { return; }

        var feral = ids.get(id);
        if (feral !== undefined) clear(feral);  // noop if not found
      }
      target[setName] = cajaVM.def(tameSet);
      target[clearName] = cajaVM.def(tameClear);
      return target;
    }

    function makeScrollable(bridal, element) {
      var overflow = bridal.getComputedStyle(element, void 0).overflow;
      switch (overflow && overflow.toLowerCase()) {
        case 'visible':
        case 'hidden':
          element.style.overflow = 'auto';
          break;
      }
    }

    /**
     * Moves the given pixel within the element's frame of reference as close to
     * the top-left-most pixel of the element's viewport as possible without
     * moving the viewport beyond the bounds of the content.
     * @param {number} x x-coord of a pixel in the element's frame of reference.
     * @param {number} y y-coord of a pixel in the element's frame of reference.
     */
    function tameScrollTo(element, x, y) {
      if (x !== +x || y !== +y || x < 0 || y < 0) {
        throw new Error('Cannot scroll to ' + x + ':' + typeof x + ','
                        + y + ' : ' + typeof y);
      }
      element.scrollLeft = x;
      element.scrollTop = y;
    }

    /**
     * Moves the origin of the given element's view-port by the given offset.
     * @param {number} dx a delta in pixels.
     * @param {number} dy a delta in pixels.
     */
    function tameScrollBy(element, dx, dy) {
      if (dx !== +dx || dy !== +dy) {
        throw new Error('Cannot scroll by ' + dx + ':' + typeof dx + ', '
                        + dy + ':' + typeof dy);
      }
      element.scrollLeft += dx;
      element.scrollTop += dy;
    }

    function guessPixelsFromCss(cssStr) {
      if (!cssStr) { return 0; }
      var m = cssStr.match(/^([0-9]+)/);
      return m ? +m[1] : 0;
    }

    function tameResizeTo(element, w, h) {
      if (w !== +w || h !== +h) {
        throw new Error('Cannot resize to ' + w + ':' + typeof w + ', '
                        + h + ':' + typeof h);
      }
      element.style.width = w + 'px';
      element.style.height = h + 'px';
    }

    function tameResizeBy(element, dw, dh) {
      if (dw !== +dw || dh !== +dh) {
        throw new Error('Cannot resize by ' + dw + ':' + typeof dw + ', '
                        + dh + ':' + typeof dh);
      }
      if (!dw && !dh) { return; }

      // scrollWidth is width + padding + border.
      // offsetWidth is width + padding + border, but excluding the non-visible
      // area.
      // clientWidth iw width + padding, and like offsetWidth, clips to the
      // viewport.
      // margin does not count in any of these calculations.
      //
      // scrollWidth/offsetWidth
      //   +------------+
      //   |            |
      //
      // +----------------+
      // |                | Margin-top
      // | +------------+ |
      // | |############| | Border-top
      // | |#+--------+#| |
      // | |#|        |#| | Padding-top
      // | |#| +----+ |#| |
      // | |#| |    | |#| | Height
      // | |#| |    | |#| |
      // | |#| +----+ |#| |
      // | |#|        |#| |
      // | |#+--------+#| |
      // | |############| |
      // | +------------+ |
      // |                |
      // +----------------+
      //
      //     |        |
      //     +--------+
      //     clientWidth (but excludes content outside viewport)

      var style = element.currentStyle;
      if (!style) {
        style = bridalMaker.getWindow(element)
            .getComputedStyle(element, void 0);
      }

      // We guess the padding since it's not always expressed in px on IE
      var extraHeight = guessPixelsFromCss(style.paddingBottom)
          + guessPixelsFromCss(style.paddingTop);
      var extraWidth = guessPixelsFromCss(style.paddingLeft)
          + guessPixelsFromCss(style.paddingRight);

      var goalHeight = element.clientHeight + dh;
      var goalWidth = element.clientWidth + dw;

      var h = goalHeight - extraHeight;
      var w = goalWidth - extraWidth;

      if (dh) { element.style.height = Math.max(0, h) + 'px'; }
      if (dw) { element.style.width = Math.max(0, w) + 'px'; }

      // Correct if our guesses re padding and borders were wrong.
      // We may still not be able to resize if e.g. the deltas would take
      // a dimension negative.
      if (dh && element.clientHeight !== goalHeight) {
        var hError = element.clientHeight - goalHeight;
        element.style.height = Math.max(0, h - hError) + 'px';
      }
      if (dw && element.clientWidth !== goalWidth) {
        var wError = element.clientWidth - goalWidth;
        element.style.width = Math.max(0, w - wError) + 'px';
      }
    }

    /**
     * Access policies
     *
     * Each of these objects is a policy for what type of access (read/write,
     * read-only, or none) is permitted to a Node or NodeList. Each policy
     * object determines the access for the associated node and its children.
     * The childPolicy may be overridden if the node is an opaque or foreign
     * node.
     *
     * Definitions:
     *    childrenVisible:
     *      This node appears to have the children it actually does; otherwise,
     *      appears to have no children.
     *    attributesVisible:
     *      This node appears to have the attributes it actually does;
     *      otherwise, appears to have no attributes.
     *    editable:
     *      This node's attributes and properties (other than children) may be
     *      modified.
     *    childrenEditable:
     *      This node's childNodes list may be modified, and its children are
     *      both editable and childrenEditable.
     *
     * These flags can express several meaningless cases; in particular, the
     * 'editable but not visible' cases do not occur.
     */
    var protoNodePolicy = {
      requireEditable: function () {
        if (!this.editable) {
          throw new Error(NOT_EDITABLE);
        }
      },
      requireChildrenEditable: function () {
        if (!this.childrenEditable) {
          throw new Error(NOT_EDITABLE);
        }
      },
      requireUnrestricted: function () {
        if (!this.unrestricted) {
          throw new Error("Node is restricted");
        }
      },
      assertRestrictedBy: function (policy) {
        if (!this.childrenVisible   && policy.childrenVisible ||
            !this.attributesVisible && policy.attributesVisible ||
            !this.editable          && policy.editable ||
            !this.childrenEditable  && policy.childrenEditable ||
            !this.upwardNavigation  && policy.upwardNavigation ||
            !this.unrestricted      && policy.unrestricted) {
          throw new Error("Domado internal error: non-monotonic node policy");
        }
      }
    };
    // We eagerly await ES6 offering some kind of literal-with-prototype...
    var nodePolicyEditable = Object.create(protoNodePolicy);
    nodePolicyEditable.toString = function () { return "nodePolicyEditable"; };
    nodePolicyEditable.childrenVisible = true;
    nodePolicyEditable.attributesVisible = true;
    nodePolicyEditable.editable = true;
    nodePolicyEditable.childrenEditable = true;
    nodePolicyEditable.upwardNavigation = true;
    nodePolicyEditable.unrestricted = true;
    nodePolicyEditable.childPolicy = nodePolicyEditable;

    var nodePolicyReadOnly = Object.create(protoNodePolicy);
    nodePolicyReadOnly.toString = function () { return "nodePolicyReadOnly"; };
    nodePolicyReadOnly.childrenVisible = true;
    nodePolicyReadOnly.attributesVisible = true;
    nodePolicyReadOnly.editable = false;
    nodePolicyReadOnly.childrenEditable = false;
    nodePolicyReadOnly.upwardNavigation = true;
    nodePolicyReadOnly.unrestricted = true;
    nodePolicyReadOnly.childPolicy = nodePolicyReadOnly;

    var nodePolicyReadOnlyChildren = Object.create(protoNodePolicy);
    nodePolicyReadOnlyChildren.toString =
        function () { return "nodePolicyReadOnlyChildren"; };
    nodePolicyReadOnlyChildren.childrenVisible = true;
    nodePolicyReadOnlyChildren.attributesVisible = true;
    nodePolicyReadOnlyChildren.editable = true;
    nodePolicyReadOnlyChildren.childrenEditable = false;
    nodePolicyReadOnlyChildren.upwardNavigation = true;
    nodePolicyReadOnlyChildren.unrestricted = true;
    nodePolicyReadOnlyChildren.childPolicy = nodePolicyReadOnly;

    var nodePolicyOpaque = Object.create(protoNodePolicy);
    nodePolicyOpaque.toString = function () { return "nodePolicyOpaque"; };
    nodePolicyOpaque.childrenVisible = true;
    nodePolicyOpaque.attributesVisible = false;
    nodePolicyOpaque.editable = false;
    nodePolicyOpaque.childrenEditable = false;
    nodePolicyOpaque.upwardNavigation = true;
    nodePolicyOpaque.unrestricted = false;
    nodePolicyOpaque.childPolicy = nodePolicyReadOnly;

    var nodePolicyForeign = Object.create(protoNodePolicy);
    nodePolicyForeign.toString = function () { return "nodePolicyForeign"; };
    nodePolicyForeign.childrenVisible = false;
    nodePolicyForeign.attributesVisible = false;
    nodePolicyForeign.editable = false;
    nodePolicyForeign.childrenEditable = false;
    nodePolicyForeign.upwardNavigation = false;
    nodePolicyForeign.unrestricted = false;
    Object.defineProperty(nodePolicyForeign, "childPolicy", {
      get: function () {
        throw new Error("Foreign node childPolicy should never be consulted");
      }
    });
    cajaVM.def([
      nodePolicyEditable,
      nodePolicyReadOnly,
      nodePolicyReadOnlyChildren,
      nodePolicyOpaque,
      nodePolicyForeign
    ]);

    // Used for debugging policy decisions; see calls in TameBackedNode.
    //function TracedNodePolicy(policy, note, source) {
    //  var wrap = Object.create(policy);
    //  wrap.trace = [note, source].concat(source && source.trace || []);
    //  wrap.toString = function() {
    //    return policy.toString() + "<<" + wrap.trace + ">>";
    //  });
    //  return wrap;
    //}

    /**
     * Add a tamed document implementation to a Gadget's global scope.
     *
     * @param {string} idSuffix a string suffix appended to all node IDs.
     *     It should begin with "-" and end with "___".
     * @param {Object} uriPolicy an object like <pre>{
     *   rewrite: function (uri, uriEffect, loaderType, hints) {
     *      return safeUri
     *   }
     * }</pre>.
     *       * uri: the uri to be rewritten
     *       * uriEffect: the effect that allowing a URI to load has (@see
     *         UriEffect.java).
     *       * loaderType: type of loader that would load the URI or the
     *         rewritten
     *         version.
     *       * hints: record that describes the context in which the URI
     *         appears.
     *         If a hint is not present it should not be relied upon.
     *     The rewrite function should be idempotent to allow rewritten HTML
     *     to be reinjected. The policy must be a tamed object.
     * @param {Node} outerContainerNode an HTML node to contain the virtual DOM
     *     structure, either an Element or Document node.
     * @param {Object} optTargetAttributePresets a record containing the presets
     *     (default and whitelist) for the HTML "target" attribute.
     * @param {Object} taming. An interface to a taming membrane.
     * @param {function} addImports. A function which adds any additional
     *     imports/global variables which should exist on Window instances.
     * @return {Object} A collection of privileged access tools, plus the tamed
     *     {@code document} and {@code window} objects under those names. This
     *     object is known as a "domicile".
     */
    function attachDocument(
      idSuffix, naiveUriPolicy, outerContainerNode, optTargetAttributePresets,
        taming, addImports) {

      if (arguments.length < 3) {
        throw new Error(
            'attachDocument arity mismatch: ' + arguments.length);
      }
      if (!optTargetAttributePresets) {
        optTargetAttributePresets = {
          'default': '_blank',
          whitelist: [ '_blank', '_self' ]
        };
      }
      // Force naiveUriPolicy to be a tamed object to avoid hazards; this will
      // throw 'host object leaked' otherwise. TODO(kpreid): Be more explicit
      // about intent to enforce (unfortunately, isDefinedInCajaFrame is not
      // directly available to us here).
      taming.untame(naiveUriPolicy);

      if (!/^-/.test(idSuffix)) {
        throw new Error('id suffix "' + idSuffix + '" must start with "-"');
      }
      if (!/___$/.test(idSuffix)) {
        throw new Error('id suffix "' + idSuffix + '" must end with "___"');
      }
      var idClass = idSuffix.substring(1);

      var domicile = {
        // True when we're executing a handler for events like click
        handlingUserAction: false
      };
      var pluginId;

      var vdocContainsForeignNodes = false;

      var document = outerContainerNode.nodeType === 9  // Document node
          ? outerContainerNode
          : outerContainerNode.ownerDocument;
      var bridal = bridalMaker(document);
      var elementForFeatureTests = document.createElement('div');

      var window = bridalMaker.getWindow(outerContainerNode);

      // Note that feralPseudoWindow may be an Element or a Window depending.
      var feralPseudoDocument, feralPseudoWindow;
      if (outerContainerNode.nodeType === 9) { // Document node
        feralPseudoWindow = window;
        feralPseudoDocument = outerContainerNode;
      } else {
        // Construct wrappers for visual isolation and for feral nodes
        // corresponding to tame nodes.
        //
        // * outerIsolator and feralPseudoWindow (the two outermost wrappers)
        //   together provide visual isolation.
        // * feralPseudoWindow is the feral node used for event dispatch on
        //   tameWindow. feralPseudoDocument is the same for tameDocument.
        //
        // The reason we do not use feralPseudoDocument as the inner isolator
        // is that feral nodes which are the feral-twin of some tame node are
        // at higher risk of being mutated by the guest, or by tamed host APIs
        // on behalf of the guest. This way, a visual isolation break would
        // require modifying untame(tameWindow).style, which is less likely to
        // be accidentally permitted.
        var outerIsolator = document.createElement('div');
        feralPseudoDocument = document.createElement('div');
        feralPseudoWindow = document.createElement('div');
        outerIsolator.appendChild(feralPseudoWindow);
        feralPseudoWindow.appendChild(feralPseudoDocument);
        // Class-name hooks: The host page can
        // * match all elements between its content and the guest content as
        //   .caja-vdoc-wrapper
        // * match the outermost such element using .caja-vdoc-outer
        // * match the innermost such element using .caja-vdoc-inner
        // This scheme has been chosen to be forward-compatible in the
        // event that we change the number of wrappers in use.
        outerIsolator.className = 'caja-vdoc-wrapper caja-vdoc-outer';
        feralPseudoWindow.className = 'caja-vdoc-wrapper';
        feralPseudoDocument.className = 'caja-vdoc-wrapper caja-vdoc-inner ' +
            'vdoc-container___ ' + idClass;
        // Visual isolation and formatting. We use inline styles because they
        // cannot be overridden by any stylesheet.
        // TODO(kpreid): Add explanation of how these style rules produce the
        // needed effects.
        [outerIsolator, feralPseudoWindow, feralPseudoDocument].forEach(
            function(el) {
          // Ensure block display and no additional borders/gaps.
          el.style.display = 'block';
          el.style.margin = '0';
          el.style.border = 'none';
          el.style.padding = '0';
        });
        // Establish a new coordinate system for absolutely-positioned elements.
        // TODO(kpreid): Explain why it is necessary to have two nested.
        outerIsolator.style.position = 'relative';
        feralPseudoWindow.style.position = 'relative';
        // Clip content to bounds of container.
        outerIsolator.style.overflow = 'hidden';
        // Final hookup; move existing children (like static HTML produced by
        // the cajoler) into the virtual document.
        while (outerContainerNode.firstChild) {
          feralPseudoDocument.appendChild(outerContainerNode.firstChild);
        }
        outerContainerNode.appendChild(outerIsolator);
      }

      var elementPolicies = {};
      elementPolicies.form = function (attribs) {
        // Forms must have a gated onsubmit handler or they must have an
        // external target.
        var sawHandler = false;
        for (var i = 0, n = attribs.length; i < n; i += 2) {
          if (attribs[+i] === 'onsubmit') {
            sawHandler = true;
          }
        }
        if (!sawHandler) {
          attribs.push('onsubmit', 'return false');
        }
        return forceAutocompleteOff(attribs);
      };
      elementPolicies.input = function (attribs) {
        return forceAutocompleteOff(attribs);
      };

      function forceAutocompleteOff(attribs) {
        var a = [];
        for (var i = 0, n = attribs.length; i < n; i += 2) {
          if (attribs[+i] !== 'autocomplete') {
            a.push(attribs[+i], attribs[+i+1]);
          }
        }
        a.push('autocomplete', 'off');
        return a;
      }

      // TODO(kpreid): should elementPolicies be exported in domicile?

      // On IE, turn <canvas> tags into canvas elements that explorercanvas
      // will recognize
      bridal.initCanvasElements(outerContainerNode);

      var tamingClassTable = new TamingClassTable();
      var inertCtor = tamingClassTable.inertCtor.bind(tamingClassTable);

      // Table of functions which are what WebIDL calls [NamedConstructor]
      // (Caveat: In actual browsers, e.g. new Image().constructor === Image !==
      // HTMLImageElement. We don't implement that.)
      var namedConstructors = {};

      // The private properties used in TameNodeConf are:
      //    feral (feral node)
      //    policy (access policy)
      //    Several specifically for TameHTMLDocument.
      // Furthermore, by virtual of being scoped inside attachDocument,
      // TameNodeT also indicates that the object is a node from the *same*
      // virtual document.
      // TODO(kpreid): Review how necessary it is to scope this inside
      // attachDocument. The issues are:
      //   * Using authority or types from a different virtual document (check
      //     the things that used to be TameHTMLDocument.doc___ in particular)
      //   * Using nodes from a different real document (Domita would seem to
      //     be vulnerable to this?)
      var TameNodeConf = new Confidence('TameNode');
      var TameNodeT = TameNodeConf.guard;

      var tameException = taming.tameException;

      /**
       * Call this on every TameNode after it is constructed, and use its return
       * value instead of the node.
       *
       * TODO(kpreid): Is this the best way to handle things which need to be
       * done after the outermost constructor?
       */
      function finishNode(node) {
        TameNodeConf.amplify(node, function(privates) {
          if (proxiesAvailable && privates.proxyHandler) {
            // The proxy construction is deferred until now because the ES5/3
            // implementation of proxies requires that the proxy's prototype is
            // frozen.
            var proxiedNode = Proxy.create(privates.proxyHandler,
                Object.getPrototypeOf(node));
            privates.proxyInit(proxiedNode, privates.proxyHandler);
            // no longer needed
            delete privates.proxyHandler;
            delete privates.proxyInit;

            node = proxiedNode;
          }

          // Require all properties of the private state record to have already
          // been created (presumably in the constructor). This is so that the
          // use of the namespace can be more easily audited.
          Object.preventExtensions(privates);
        });

        return node;
      }

      var uriRewriterForCss = !naiveUriPolicy ? null :
          function uriRewriterForCss_(url, prop) {
            return uriRewrite(
                    naiveUriPolicy,
                    url, html4.ueffects.SAME_DOCUMENT,
                    html4.ltypes.SANDBOXED,
                    {
                      "TYPE": "CSS",
                      "CSS_PROP": prop
                    });
          };

      /**
       * Sanitizes the value of a CSS property, the {@code red} in
       * {@code color:red}.
       * @param cssPropertyName a canonical CSS property name
       *    {@code "font-family"} not {@code "fontFamily"}.
       */
      function sanitizeStyleProperty(cssPropertyName, tokens) {
        sanitizeCssProperty(
            cssPropertyName,
            tokens,
            uriRewriterForCss,
            domicile.pseudoLocation.href,
            idSuffix);
        return tokens.length !== 0;
      }

      /**
       * Sanitize the 'style' attribute value of an HTML element.
       *
       * @param styleAttrValue the value of a 'style' attribute, which we
       * assume has already been checked by the caller to be a plain String.
       *
       * @return a sanitized version of the attribute value.
       */
      function sanitizeStyleAttrValue(styleAttrValue) {
        var sanitizedDeclarations = [];
        parseCssDeclarations(
            String(styleAttrValue),
            {
              declaration: function (property, value) {
                property = property.toLowerCase();
                sanitizeStyleProperty(property, value);
                sanitizedDeclarations.push(property + ': ' + value.join(' '));
              }
            });
        return sanitizedDeclarations.join(' ; ');
      }

      /** Sanitize HTML applying the appropriate transformations. */
      function sanitizeHtml(htmlText) {
        var out = [];
        htmlSanitizer(htmlText, out);
        return out.join('');
      }
      /** Sanitize the array of attributes (side effect) */
      function sanitizeAttrs(tagName, attribs) {
        var n = attribs.length;
        var needsTargetAttrib =
            html4.ATTRIBS.hasOwnProperty(tagName + '::target');
        for (var i = 0; i < n; i += 2) {
          var attribName = attribs[+i];
          if ('target' === attribName) { needsTargetAttrib = false; }
          var value = attribs[+i + 1];
          var atype = null, attribKey;
          if ((attribKey = tagName + '::' + attribName,
               html4.ATTRIBS.hasOwnProperty(attribKey)) ||
              (attribKey = '*::' + attribName,
               html4.ATTRIBS.hasOwnProperty(attribKey))) {
            atype = html4.ATTRIBS[attribKey];
            value = rewriteAttribute(tagName, attribName, atype, value);
            if (atype === html4.atype.URI &&
              !!value && value.charAt(0) === '#') {
              needsTargetAttrib = false;
            }
          } else if (!/__$/.test(attribKey)) {
            attribName = attribs[+i] = cajaPrefix + attribs[+i];
          } else {
            value = null;
          }
          if (value !== null && value !== void 0) {
            attribs[+i + 1] = value;
          } else {
            // Swap last attribute name/value pair in place, and reprocess here.
            // This could affect how user-agents deal with duplicate attributes.
            attribs[+i + 1] = attribs[--n];
            attribs[+i] = attribs[--n];
            i -= 2;
          }
        }
        attribs.length = n;
        if (needsTargetAttrib) {
          attribs.push('target', optTargetAttributePresets['default']);
        }
        var policy = elementPolicies[tagName];
        if (policy && elementPolicies.hasOwnProperty(tagName)) {
          return policy(attribs);
        }
        return attribs;
      }
      function sanitizeOneAttr(tagName, attribName) {
        // Should be consistent with sanitizeAttrs
        // TODO(kpreid): Factor out duplicate code, also use htmlSchema
        var attribKey;
        if ((attribKey = tagName + '::' + attribName,
             html4.ATTRIBS.hasOwnProperty(attribKey)) ||
            (attribKey = '*::' + attribName,
             html4.ATTRIBS.hasOwnProperty(attribKey))) {
          var atype = html4.ATTRIBS[attribKey];
          // Use rewriteAttribute to implement policy
          // TODO(kpreid): This is wrong, because rewriteAttribute might reject
          // an attr with an empty string value. We need a value-less code path.
          var dummyValue = rewriteAttribute(tagName, attribName, atype, '');
          if (dummyValue === null) {
            // rejected
            return null;
          } else {
            // permitted
            return attribName;
          }
        } else if (/__$/.test(attribName)) {
          // prohibited
          return null;
        } else {
          // virtualized attribute
          return cajaPrefix + attribName;
        }
      }
      function tagPolicy(tagName, attrs) {
        var schemaElem = htmlSchema.element(tagName);
        if (!schemaElem.allowed) {
          if (schemaElem.shouldVirtualize) {
            return {
              tagName: htmlSchema.virtualToRealElementName(tagName),
              attribs: sanitizeAttrs(tagName, attrs)
            };
          } else {
            return null;
          }
        } else {
          return {
            attribs: sanitizeAttrs(tagName, attrs)
          };
        }
      }
      var htmlSanitizer = html.makeHtmlSanitizer(tagPolicy);

      // needed by HtmlEmitter for stylesheet processing
      domicile.virtualization = cajaVM.def({
        // Class name matching the virtual document container. May be null (not
        // undefined) if we are taming a complete document and there is no
        // container (note: this case is not yet fully implemented).
        containerClass: outerContainerNode === document ? null : idClass,

        // Suffix to append to all IDs and ID references.
        idSuffix: idSuffix,

        // Element/attribute rewriter
        tagPolicy: tagPolicy,

        // Attribute-name-only rewriter
        virtualizeAttrName: sanitizeOneAttr
      });

      // needed by querySelectorAll, which is always scoped to a tame node,
      // so we don't want the containerClass prepended to the selector.
      var qsaVirtualization = cajaVM.def({
        containerClass: null,
        idSuffix: idSuffix,
        tagPolicy: tagPolicy
      });

      /**
       * If str ends with suffix,
       * and str is not identical to suffix,
       * then return the part of str before suffix.
       * Otherwise return fail.
       */
      function unsuffix(str, suffix, fail) {
        if (typeof str !== 'string') return fail;
        var n = str.length - suffix.length;
        if (0 < n && str.substring(n) === suffix) {
          return str.substring(0, n);
        } else {
          return fail;
        }
      }

      /** Split a URI reference into URI and fragment (still escaped). */
      function splitURIFragment(uriString) {
        var parsed = URI.parse(uriString);
        var frag = parsed.getRawFragment();
        parsed.setRawFragment('');
        return {frag: frag, uri: parsed.toString()};
      }

      var ID_LIST_PARTS_PATTERN = new RegExp(
        '([^' + XML_SPACE + ']+)([' + XML_SPACE + ']+|$)', 'g');

      /** Convert a real attribute value to the value seen in a sandbox. */
      function virtualizeAttributeValue(attrType, realValue) {
        realValue = String(realValue);
        switch (attrType) {
          case html4.atype.GLOBAL_NAME:
          case html4.atype.ID:
          case html4.atype.IDREF:
            return unsuffix(realValue, idSuffix, null);
          case html4.atype.IDREFS:
            return realValue.replace(ID_LIST_PARTS_PATTERN,
                function(_, id, spaces) {
                  return unsuffix(id, idSuffix, '') + (spaces ? ' ' : '');
                });
          case html4.atype.URI:
            if (realValue && '#' === realValue.charAt(0)) {
              return unsuffix(realValue, idSuffix, realValue);
            } else {
              // convert "http://hostpage#fragment-suffix___" into
              // "http://guestpage#fragment"
              var valueSplit = splitURIFragment(realValue);
              var baseSplit = splitURIFragment(
                    // .baseURI not available on IE
                    document.baseURI || document.location.href);
              // compare against document's base URL
              if (valueSplit.uri === baseSplit.uri) {
                valueSplit.uri = domicile.pseudoLocation.href;
              }
              return valueSplit.uri +
                  (valueSplit.frag === null ? '' : '#' +
                      unsuffix(valueSplit.frag, idSuffix, valueSplit.frag));
            }
          case html4.atype.URI_FRAGMENT:
            if (realValue && '#' === realValue.charAt(0)) {
              return unsuffix(realValue, idSuffix, null);
            } else {
              return null;
            }
          default:
            return realValue;
        }
      }

      function getSafeTargetAttribute(tagName, attribName, value) {
        if (value !== null) {
          value = String(value);
          for (var i = 0; i < optTargetAttributePresets.whitelist.length; ++i) {
            if (optTargetAttributePresets.whitelist[i] === value) {
              return value;
            }
          }
        }
        return optTargetAttributePresets['default'];
      }

      /**
       * Returns a normalized attribute value, or null if the attribute should
       * be omitted.
       * <p>This function satisfies the attribute rewriter interface defined in
       * {@link html-sanitizer.js}.  As such, the parameters are keys into
       * data structures defined in {@link html4-defs.js}.
       *
       * @param {string} tagName a canonical tag name.
       * @param {string} attribName a canonical tag name.
       * @param type as defined in html4-defs.js.
       *
       * @return {string|null} null to indicate that the attribute should not
       *   be set.
       */
      function rewriteAttribute(tagName, attribName, type, value) {
        switch (type) {
          case html4.atype.NONE:
            // TODO(felix8a): annoying that this has to be in two places
            if (attribName === 'autocomplete'
                && (tagName === 'input' || tagName === 'form')) {
              return 'off';
            }
            return String(value);
          case html4.atype.CLASSES:
            // note, className is arbitrary CDATA.
            value = String(value);
            if (!FORBIDDEN_ID_LIST_PATTERN.test(value)) {
              return value;
            }
            return null;
          case html4.atype.GLOBAL_NAME:
          case html4.atype.ID:
          case html4.atype.IDREF:
            value = String(value);
            if (value && isValidId(value)) {
              return value + idSuffix;
            }
            return null;
          case html4.atype.IDREFS:
            value = String(value);
            if (value && isValidIdList(value)) {
              return value.replace(ID_LIST_PARTS_PATTERN,
                  function(_, id, spaces) {
                    return id + idSuffix + (spaces ? ' ' : '');
                  });
            }
            return null;
          case html4.atype.LOCAL_NAME:
            value = String(value);
            if (value && isValidId(value)) {
              return value;
            }
            return null;
          case html4.atype.SCRIPT:
            value = String(value);

            var handlerFn = cajaVM.compileExpr(
              '(function(event) { ' + value + ' })'
            )(tameWindow);
            var fnNameExpr = domicile.handlers.push(handlerFn) - 1;

            var trustedHandler = '___.plugin_dispatchEvent___(this, event, ' +
                pluginId + ', ' + fnNameExpr + ');';
            if (attribName === 'onsubmit') {
              trustedHandler =
                'try { ' + trustedHandler + ' } finally { return false; }';
            } else {
              trustedHandler = 'return ' + trustedHandler;
            }
            return trustedHandler;
          case html4.atype.URI:
            value = String(value);
            // URI fragments reference contents within the document and
            // aren't subject to the URI policy
            if (isValidFragment(value)) {
              return value + idSuffix;
            }
            value = URI.utils.resolve(domicile.pseudoLocation.href, value);
            if (!naiveUriPolicy) { return null; }
            var schemaAttr = htmlSchema.attribute(tagName, attribName);
            return uriRewrite(
                naiveUriPolicy,
                value,
                schemaAttr.uriEffect,
                schemaAttr.loaderType,
                {
                  "TYPE": "MARKUP",
                  "XML_ATTR": attribName,
                  "XML_TAG": tagName
                }) || null;
          case html4.atype.URI_FRAGMENT:
            value = String(value);
            if (isValidFragment(value)) {
              return value + idSuffix;
            }
            return null;
          case html4.atype.STYLE:
            return sanitizeStyleAttrValue(String(value));
          case html4.atype.FRAME_TARGET:
            return getSafeTargetAttribute(tagName, attribName, value);
          default:
            return null;
        }
      }

      /**
       * Given a guest-provided attribute name, produce the corresponding
       * name to use in the actual DOM. Note that in the general case,
       * attributes' values are also to be rewritten, so this should only be
       * used for obtaining attribute <em>nodes<em>.
       */
      function rewriteAttributeName(feralElement, attribName) {
        attribName = attribName.toLowerCase();
        if (/__$/.test(attribName)) {
          throw new TypeError('Attributes may not end with __');
        }
        var tagName = feralElement.tagName.toLowerCase();
        var atype = htmlSchema.attribute(tagName, attribName).type;
        if (atype === void 0) {
          return cajaPrefix + attribName;
        } else {
          return attribName;
        }
      }

      // Implementation of HTML5 "HTML fragment serialization algorithm"
      // per http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#html-fragment-serialization-algorithm
      // as of 2012-09-11.
      //
      // Per HTML5: "Warning! It is possible that the output of this algorithm,
      // if parsed with an HTML parser, will not return the original tree
      // structure." Therefore, an innerHTML round-trip on a safe (from Caja's
      // perspective) but malicious DOM may be able to attack guest code.
      // TODO(kpreid): Evaluate desirability of prohibiting the worst cases of
      // this in our DOM mutators.
      function htmlFragmentSerialization(tameRoot) {
        tameRoot = TameNodeT.coerce(tameRoot);
        var sl = [];

        // Note: This algorithm is implemented in terms of tame nodes, not
        // feral nodes; therefore, it requires no access checks as it yields
        // only information which clients can obtain by object access.
        function recur(tameParent) {
          var nodes = tameParent.childNodes;
          var nNodes = nodes.length;
          for (var i = 0; i < nNodes; i++) {
            var tameCurrent = nodes.item(i);
            switch (tameCurrent.nodeType) {
              case 1:  // Element
                // TODO(kpreid): namespace issues
                var tagName = tameCurrent.tagName;
                if (tagName === undefined) {
                  // foreign node case
                  continue;
                }
                tagName = tagName.toLowerCase();
                    // TODO(kpreid): not conformant
                sl.push('<', tagName);
                var attrs = tameCurrent.attributes;
                var nAttrs = attrs.length;
                for (var j = 0; j < nAttrs; j++) {
                  var attr = attrs.item(j);
                  var aName = attr.name;
                  if (aName === 'target') {
                    // hide Caja-added link target attributes
                    // TODO(kpreid): Shouldn't these be hidden in the attributes
                    // list? This special case (and the one below) is emulating
                    // tested-for behavior in a previous .innerHTML
                    // implementation, not written from first principles.
                    continue;
                  }
                  var aValue = attr.value;
                  if (aValue === null) {
                    // rejected by virtualizeAttributeValue
                    // TODO(kpreid): Shouldn't these be hidden in the attributes
                    // list?
                    continue;
                  }
                  // TODO(kpreid): check escapeAttrib conformance
                  sl.push(' ', attr.name, '="', html.escapeAttrib(aValue), '"');
                }
                sl.push('>');
                switch (tagName) {
                  case 'area':
                  case 'base':
                  case 'basefont':
                  case 'bgsound':
                  case 'br':
                  case 'col':
                  case 'command':
                  case 'embed':
                  case 'frame':
                  case 'hr':
                  case 'img':
                  case 'input':
                  case 'keygen':
                  case 'link':
                  case 'meta':
                  case 'param':
                  case 'source':
                  case 'track':
                  case 'wbr':
                    // do nothing
                    break;
                  case 'pre':
                  case 'textarea':
                  case 'listing':
                    if (tameCurrent.firstChild &&
                        tameCurrent.firstChild.nodeType === 3 &&
                        tameCurrent.firstChild.data[0] === '\n') {
                      sl.push('\n');
                    }
                    // fallthrough
                  default:
                    recur(tameCurrent);
                    sl.push('</', tagName, '>');
                }
                break;
              case 3:  // Text
                switch (tameCurrent.parentNode.tagName.toLowerCase()) {
                    // TODO(kpreid): namespace
                  case 'style':
                  case 'script':
                  case 'xmp':
                  case 'iframe':
                  case 'noembed':
                  case 'noframes':
                  case 'plaintext':
                  case 'noscript':
                    sl.push(tameCurrent.data);
                    break;
                  default:
                    sl.push(html.escapeAttrib(tameCurrent.data));
                    break;
                }
                break;
              case 8:  // Comment
                sl.push('<', '!--', tameCurrent.data, '-->');
                break;
              case 7:  // ProcessingInstruction
                sl.push('<?', tameCurrent.target, ' ', tameCurrent.data, '>');
                break;
              case 10:  // DocumentType
                sl.push('<', '!DOCTYPE ', tameCurrent.name, '>');
                break;
              default:
                if (typeof console !== 'undefined') {
                  console.error('Domado internal: HTML fragment serialization '
                      + 'algorithm met unexpected node type '
                      + tameCurrent.nodeType);
                }
                break;
            }
          }
        }
        recur(tameRoot);

        return sl.join('');
      }

      // Property descriptors which are independent of any feral object.
      /**
       * Property descriptor which throws on access.
       */
      var P_UNIMPLEMENTED = {
        enumerable: true,
        get: cajaVM.constFunc(function () {
          throw new Error('Not implemented');
        })
      };
      /**
       * Property descriptor for an unsettable constant attribute (like DOM
       * attributes such as nodeType).
       */
      function P_constant(value) {
        return { enumerable: true, value: value };
      }

      /**
       * Property specs (as for Props.define) suitable for taming wrappers where
       * confidence.p(obj).feral is the feral object to forward to and
       * confidence.p(obj).policy is a node policy object for writability
       * decisions.
       *
       * Lowercase properties are property descriptors; uppercase ones are
       * constructors for parameterized property descriptors.
       *
       * The taming membrane is applied to values. This should not actually
       * matter because these are intended to be used for primitive-valued
       * properties; we tame as a shortcut to protect against unexpected
       * behavior (or misuse) causing breaches.
       */
      var PT = cajaVM.def({
        /**
         * Ensure that a taming wrapper for the feral property's value is
         * memoized via the taming membrane, but only if 'memo' is true.
         *
         * @param {boolean} memo Memoize if true, construct every time if false.
         * @param {function} tamer function(privates, feralValue) -> tamedValue
         */
        TameMemoIf: function(memo, tamer) {
          assert(typeof memo === 'boolean');  // in case of bad data
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              get: memo ? env.amplifying(function(privates) {
                var feral = privates.feral[prop];
                if (feral !== Object(feral)) {
                  // not an object, membrane does not apply
                  return tamer.call(this, privates, feral);
                }
                if (!taming.hasTameTwin(feral)) {
                  taming.tamesTo(feral, tamer.call(this, privates, feral));
                }
                return taming.tame(feral);
              }) : env.amplifying(function(privates) {
                return tamer.call(this, privates, privates.feral[prop]);
              })
            };
          });
        },

        /**
         * Property descriptor for properties which have the value the feral
         * object does and are not assignable.
         */
        ro: Props.markPropMaker(function(env) {
          var prop = env.prop;
          return {
            enumerable: true,
            get: env.amplifying(function(privates) {
              return taming.tame(privates.feral[prop]);
            })
          };
        }),

        /**
         * Property descriptor for properties which have a transformed view of
         * the value the feral object does and are not assignable.
         */
        ROView: function(transform) {
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              get: env.amplifying(function(privates) {
                return transform(privates.feral[prop]);
              })
            };
          });
        },

        /**
         * Property descriptor for properties which have the value the feral
         * object does, and are assignable if the wrapper is editable.
         */
        rw: Props.markPropMaker(function(env) {
          var prop = env.prop;
          return {
            enumerable: true,
            get: env.amplifying(function(privates) {
              return taming.tame(privates.feral[prop]);
            }),
            set: env.amplifying(function(privates, value) {
              privates.policy.requireEditable();
              privates.feral[prop] = taming.untame(value);
            })
          };
        }),

        /**
         * Property descriptor for properties which have the value the feral
         * object does, and are assignable (with a predicate restricting the
         * values which may be assigned) if the wrapper is editable.
         * TODO(kpreid): Use guards instead of predicates.
         */
        RWCond: function(predicate) {
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              get: env.amplifying(function(privates) {
                return taming.tame(privates.feral[prop]);
              }),
              set: env.amplifying(function(privates, value) {
                privates.policy.requireEditable();
                if (predicate(value)) {
                  privates.feral[prop] = taming.untame(value);
                }
              })
            };
          });
        },

        /**
         * Property descriptor for forwarded properties which have node values
         * which may be nodes that might be outside of the virtual document.
         */
        related: Props.markPropMaker(function(env) {
          var prop = env.prop;
          return {
            enumerable: true,
            get: env.amplifying(function(privates) {
              if (privates.policy.upwardNavigation) {
                // TODO(kpreid): Can we move this check *into*
                // tameRelatedNode?
                return tameRelatedNode(privates.feral[prop]);
              } else {
                return null;
              }
            })
          };
        }),

        /**
         * Property descriptor which maps to an attribute or property, is
         * assignable, and has the value transformed in some way.
         * @param {boolean} useAttrGetter true if the getter should delegate
         *     to {@code this.getAttribute}.  That method is assumed to
         *     already be trusted though {@code toValue} is still called on
         *     the result.
         *     If false, then {@code toValue} is called on the result of
         *     accessing the name property on the underlying element, a
         *     possibly untrusted value.
         * @param {Function} toValue transforms the attribute or underlying
         *     property value retrieved according to the useAttrGetter flag
         *     above to the value of the defined property.
         * @param {boolean} useAttrSetter like useAttrGetter but for a setter.
         *     Switches between the name property on the underlying node
         *     (the false case) or using this's {@code setAttribute} method
         *     (the true case).
         * @param {Function} fromValue called on the input before it is passed
         *     through according to the flag above.  This receives untrusted
         *     values, and can do any vetting or transformation.  If
         *     {@code useAttrSetter} is true then it need not do much value
         *     vetting since the {@code setAttribute} method must do its own
         *     vetting.
         */
        filter: function(useAttrGetter, toValue, useAttrSetter, fromValue) {
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            var desc = {
              enumerable: true,
              get: useAttrGetter
                  ? innocuous(function() {
                      return toValue.call(this, this.getAttribute(prop));
                    })
                  : env.amplifying(function(privates) {
                      return toValue.call(this,
                          taming.tame(privates.feral[prop]));
                    })
            };
            if (fromValue) {
              desc.set = useAttrSetter
                  ? innocuous(function(value) {
                      this.setAttribute(prop, fromValue.call(this, value));
                    })
                  : env.amplifying(function(privates, value) {
                      privates.policy.requireEditable();
                      privates.feral[prop] =
                          taming.untame(fromValue.call(this, value));
                    });
            }
            return desc;
          });
        },
        filterAttr: function(toValue, fromValue) {
          return PT.filter(true, toValue, true, fromValue);
        },
        filterProp: function(toValue, fromValue) {
          return PT.filter(false, toValue, false, fromValue);
        }
      });

      // Node-specific property accessors:
      /**
       * Property descriptor for forwarded properties which have node values
       * and are descendants of this node.
       */
      var NP_tameDescendant = Props.markPropMaker(function(env) {
        var prop = env.prop;
        return {
          enumerable: true,
          get: env.amplifying(function(privates) {
            if (privates.policy.childrenVisible) {
              return defaultTameNode(privates.feral[prop]);
            } else {
              return null;
            }
          })
        };
      });
      function NP_NoArgEditMethod(transform) {
        // TODO(kpreid): Make this into a more general simple-method-taming.
        return Props.markPropMaker(function(env) {
          var prop = env.prop;
          return Props.ampMethod(function noArgEditMethodWrapper(privates) {
            privates.policy.requireEditable();
            return transform(privates.feral[prop]());
          });
        });
      }
      var NP_noArgEditVoidMethod = NP_NoArgEditMethod(noop);
      var NP_noArgEditMethodReturningNode = NP_NoArgEditMethod(defaultTameNode);
      /**
       * Reflect a boolean attribute, in the HTML5 sense. Respects schema for
       * writes, forwards for reads.
       *
       * http://www.whatwg.org/specs/web-apps/current-work/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes
       */
      var NP_reflectBoolean = Props.markPropMaker(function(env) {
        var prop = env.prop;
        return {
          enumerable: true,
          get: env.amplifying(function(privates) {
            return privates.policy.attributesVisible &&
                Boolean(privates.feral[prop]);
          }),
          set: innocuous(function(value) {
            // "On setting, the content attribute must be removed if the IDL
            // attribute is set to false, and must be set to the empty string if
            // the IDL attribute is set to true."
            if (value) {
              // TODO(kpreid): markup whitelist rejects '' for boolean attrs but
              // should accept it
              this.setAttribute(prop, prop /* should be '' */);
            } else {
              this.removeAttribute(prop);
            }
          })
        };
      });

      /**
       * Property spec for properties which reflect attributes whose values are
       * not rewritten (so we can use the underlying property on getting) but
       * should, on setting, be restricted by the attribute whitelist.
       */
      // This alias exists so as to document *why* we're doing this particular
      // configuration.
      var NP_writePolicyOnly = PT.filter(false, identity, true, identity);

      function NP_UriValuedProperty(schemaEl, schemaAttr) {
        return Props.markPropMaker(function(env) {
          var prop = env.prop;
          return {
            // this is not just an attribute wrapper because the .href is
            // expected to be absolute even if the attribute is not.
            // But we can still use the same virt logic.
            get: env.amplifying(function(privates) {
              return virtualizeAttributeValue(
                  html4.atype.URI, privates.feral[prop]);
            }),
            set: env.amplifying(function(privates, value) {
              privates.feral.href = rewriteAttribute(
                  schemaEl, schemaAttr, html4.atype.URI, value);
            })
          };
        });
      }

      var nodeClassNoImplWarnings = {};
      var elementTamerCache = {};
      function makeTameNodeByType(node) {
        switch (node.nodeType) {
          case 1:  // Element
            var rawTagName = node.tagName;
            if (Object.prototype.hasOwnProperty.call(
                elementTamerCache, rawTagName)) {
              return new elementTamerCache[rawTagName](node);
            }
            var tamer;
            var tagName = rawTagName.toLowerCase();
            var schemaElem = htmlSchema.element(tagName);
            if (schemaElem.allowed || tagName === 'script' ||
                tagName === 'style') {
              // <script> and <style> are specifically allowed because we make
              // provisions for controlling their content and script src=.
              var domInterfaceName = schemaElem.domInterface;
              tamer = tamingClassTable.getTamingCtor(domInterfaceName);
              if (!tamer) {
                if (!nodeClassNoImplWarnings[domInterfaceName]) {
                  nodeClassNoImplWarnings[domInterfaceName] = true;
                  if (typeof console !== 'undefined') {
                    console.warn("Domado: " + domInterfaceName + " is not " +
                        "tamed; its specific properties/methods will not be " +
                        "available on <" +
                        htmlSchema.realToVirtualElementName(tagName) + ">.");
                  }
                }
                tamer = TameElement;
              }
            } else {
              // If an unrecognized or unsafe node, return a
              // placeholder that doesn't prevent tree navigation,
              // but that doesn't allow mutation or leak attribute
              // information.
              tamer = TameOpaqueNode;
            }
            elementTamerCache[rawTagName] = tamer;
            return new tamer(node);
          case 2:  // Attr
            // Cannot generically wrap since we must have access to the
            // owner element
            throw 'Internal: Attr nodes cannot be generically wrapped';
          case 3:  // Text
          case 4:  // CDATA Section Node
            return new (tamingClassTable.getTamingCtor('Text'))(node);
          case 8:  // Comment
            return new (tamingClassTable.getTamingCtor('Comment'))(node);
          case 9: // Document (not well supported)
            return new TameBackedNode(node);
          case 11: // Document Fragment
            return new TameBackedNode(node);
          default:
            return new TameOpaqueNode(node);
        }
      }

      /**
       * returns a tame DOM node.
       * @param {Node} node
       * @param {boolean} foreign
       * @see <a href="http://www.w3.org/TR/DOM-Level-2-HTML/html.html"
       *       >DOM Level 2</a>
       */
      function defaultTameNode(node, foreign) {
        if (node === null || node === void 0) { return null; }
        // TODO(mikesamuel): make sure it really is a DOM node

        if (taming.hasTameTwin(node)) {
          return taming.tame(node);
        }

        if (foreign) {
          vdocContainsForeignNodes = true;
        }

        var tamed = foreign
            ? new TameForeignNode(node)
            : makeTameNodeByType(node);
        tamed = finishNode(tamed);

        taming.tamesTo(node, tamed);

        return tamed;
      }

      /**
       * Tame a reference to a feral node which might turn out to be outside the
       * virtual document, inside a foreign node, etc. (in which case it is
       * replaced with null).
       */
      function tameRelatedNode(node) {
        if (node === null || node === void 0) { return null; }
        if (node === feralPseudoDocument) {
          return tameDocument;
        }

        // Catch errors because node might be from a different domain.
        try {
          var doc = node.ownerDocument;
          for (var ancestor = node;
              ancestor;
              ancestor = ancestor.parentNode) {
            if (isContainerNode(ancestor)) {
              // is within the virtual document
              return defaultTameNode(node);
            } else if (ancestor === doc) {
              // didn't find evidence of being within the virtual document
              return null;
            }
          }
          // permit orphaned nodes
          return defaultTameNode(node);
        } catch (e) {}
        return null;
      }

      /**
       * Like tameRelatedNode but includes the window (which is an EventTarget,
       * but not a Node).
       */
      function tameEventTarget(nodeOrWindow) {
        if (nodeOrWindow === feralPseudoWindow || nodeOrWindow === window) {
          return tameWindow;
        } else if (nodeOrWindow && nodeOrWindow.nodeType === 1) {
          return tameRelatedNode(nodeOrWindow);
        } else {
          // Wasn't an element and wasn't the particular window.
          return null;
        }
      }

      /**
       * Is this node a descendant of a foreign node, and therefore to be
       * omitted from node lists?
       */
      function isNodeToBeHidden(feralNode) {
        if (!feralNode) return false;
        for (
            var ancestor = feralNode.parentNode;
            ancestor !== null;
            ancestor = ancestor.parentNode) {
          if (taming.hasTameTwin(ancestor)) {
            if (taming.tame(ancestor) instanceof TameForeignNode) {
              // Every foreign node is already tamed as foreign, by
              // definition.
              return true;
            } else {
              // Reached a node known to be non-foreign.
              return false;
            }
          }
        }
        return false;
      }

      domicile.tameNodeAsForeign = function(node) {
        return defaultTameNode(node, true);
      };

      /**
       * Returns the length of a raw DOM Nodelist object, working around
       * NamedNodeMap bugs in IE, Opera, and Safari as discussed at
       * http://code.google.com/p/google-caja/issues/detail?id=935
       *
       * @param nodeList a DOM NodeList.
       *
       * @return the number of nodes in the NodeList.
       */
      function getNodeListLength(nodeList) {
        var limit = nodeList.length;
        if (limit !== +limit) { limit = 1/0; }
        return limit;
      }

      function nodeListEqualsArray(nodeList, array) {
        var nll = getNodeListLength(nodeList);
        if (nll !== array.length) {
          return false;
        } else {
          for (var i = 0; i < nll; i++) {
            if (nodeList[i] !== array[i]) {
              return false;
            }
          }
          return true;
        }
      }

      // Commentary on foreign node children in NodeLists:
      //
      // The children of a foreign node are an implementation detail which
      // guest code should not be permitted to see. Therefore, we must hide them
      // from appearing in NodeLists. This would be a straightforward matter of
      // filtering, except that NodeLists are "live", reflecting DOM changes
      // immediately; and DOM changes change the membership and numeric indexes
      // of the NodeList.
      //
      // One could imagine caching the outcomes: given an index, scan the host
      // list until the required number of visible-to-guest nodes have been
      // found, cache the indexes and node, and then validate the cache entry
      // later by comparing indexes, but that is not sufficient; consider if a
      // foreign child is deleted, and at the same time a guest-visible node
      // is added in a similar document position; then the index of a guest node
      // which is after that position *should* increase, but this cache cannot
      // tell.
      //
      // Therefore, we do cache the list, but we must re-validate the cache
      // from 0 up to the desired index on every access.
      /**
       * This is NOT a node list taming. This is a component for performing
       * foreign node filtering, and host-exception wrapping, only.
       */
      function NodeListFilter(feralNodeList) {
        var expectation = [];
        var filteredCache = [];

        function calcUpTo(index) {
          var feralLength = getNodeListLength(feralNodeList);
          var feralIndex = 0;

          // Validate cache
          if (feralLength < expectation.length) {
            expectation = [];
            filteredCache = [];
            feralIndex = 0;
          } else {
            for (
                ;
                feralIndex < expectation.length && feralIndex < feralLength;
                feralIndex++) {
              if (feralNodeList[feralIndex] !== expectation[feralIndex]) {
                expectation = [];
                filteredCache = [];
                feralIndex = 0;
                break;
              }
            }
          }

          // Extend cache
          nodeListScan: for (
              ;
              feralIndex < feralLength && filteredCache.length <= index;
              feralIndex++) {
            var node = feralNodeList[feralIndex];
            expectation.push(node);
            if (!isNodeToBeHidden(node)) {
              filteredCache.push(node);
            }
          }
        }
        // result is not defended, for performance; used only internally.
        return {
          getLength: function() {
            try {
              if (vdocContainsForeignNodes) {
                calcUpTo(Infinity);
                return filteredCache.length;
              } else {
                return getNodeListLength(feralNodeList);
              }
            } catch (e) {
              throw tameException(e);
            }
          },
          item: function(i) {
            try {
              if (vdocContainsForeignNodes) {
                calcUpTo(i);
                return filteredCache[i];
              } else {
                return feralNodeList[i];
              }
            } catch (e) {
              throw tameException(e);
            }
          }
        };
      }

      /**
       * Constructs a NodeList-like object.
       *
       * @param tamed a JavaScript array that will be populated and decorated
       *     with the DOM NodeList API. If it has existing elements they will
       *     precede the actual NodeList elements.
       * @param nodeList an array-like object supporting a "length" property
       *     and "[]" numeric indexing, or a raw DOM NodeList;
       * @param opt_tameNodeCtor a function for constructing tame nodes
       *     out of raw DOM nodes.
       */
      function mixinNodeList(tamed, nodeList, opt_tameNodeCtor) {
        // TODO(kpreid): Under a true ES5 environment, node lists should be
        // proxies so that they preserve liveness of the original lists.
        // This should be controlled by an option.
        // UPDATE: We have live NodeLists as TameNodeList and TameOptionsList.
        // This is not live, but is used in less-mainstream cases.

        var visibleList = new NodeListFilter(nodeList);

        var limit = visibleList.getLength();
        if (limit > 0 && !opt_tameNodeCtor) {
          throw 'Internal: Nonempty mixinNodeList() without a tameNodeCtor';
        }

        for (var i = tamed.length, j = 0;
             j < limit && visibleList.item(j);
             ++i, ++j) {
          tamed[+i] = opt_tameNodeCtor(visibleList.item(+j));
        }

        // Guard against accidental leakage of untamed nodes
        nodeList = visibleList = null;

        tamed.item = cajaVM.constFunc(function(k) {
          k &= 0x7fffffff;
          if (k !== k) { throw new Error(); }
          return tamed[+k] || null;
        });

        return tamed;
      }

      // Used to decide whether to memoize TameNodeList etc. instances.
      var nodeListsAreLive = cajaVM.makeArrayLike.canBeFullyLive;

      // Implementation for DOM live lists (NodeList, etc).
      var arrayLikeCtorUpdaters = [];
      /**
       * @param opt_superCtor If provided, must be itself registered.
       */
      function registerArrayLikeClass(constructor, opt_superCtor) {
        inertCtor(constructor, opt_superCtor || cajaVM.makeArrayLike(0),
            undefined, true);
        var definedPrototype = constructor.prototype;
        // Caller will install properties on this prototype.

        function updater(ArrayLike) {
          // Replace prototype with one inheriting from new ArrayLike.
          inertCtor(constructor, opt_superCtor || ArrayLike, undefined, true);
          var newPrototype = constructor.prototype;
          // Copy properties from old prototype.
          assert(Object.isFrozen(definedPrototype));
          Object.getOwnPropertyNames(definedPrototype).forEach(function(name) {
            if (name === 'constructor') { return; }
            Object.defineProperty(newPrototype, name,
                Object.getOwnPropertyDescriptor(definedPrototype, name));
          });
          // and defend.
          cajaVM.def(newPrototype);
        }
        arrayLikeCtorUpdaters.push(updater);
      }
      function finishArrayLikeClass(constructor) {
        // Cannot def() the constructor because its .prototype is reassigned
        // (and browsers don't let us make it an accessor), so do only the
        // prototype.
        // Cannot def() the prototype because some ArrayLike impls can't be
        // frozen, so do its pieces (except for it's [[Prototype]]).
        var proto = constructor.prototype;
        cajaVM.tamperProof(proto);
        Object.getOwnPropertyNames(proto).forEach(function(prop) {
          if (prop !== 'constructor') {
            // transitively def the value or getter/setter, whichever exists
            cajaVM.def(Object.getOwnPropertyDescriptor(proto, prop));
          }
        });
      }
      function constructArrayLike(ctor, getItem, getLength) {
        var len = +getLength();
        var ArrayLike = cajaVM.makeArrayLike(len);
        if (!(ctor.prototype instanceof ArrayLike)) {
          arrayLikeCtorUpdaters.forEach(function(f) { f(ArrayLike); });
        }
        var instance = ArrayLike(ctor.prototype, getItem, getLength);
        Object.defineProperty(instance, 'item', {
          enumerable: true, // checked against browser
          value: cajaVM.constFunc(getItem)
        });
        return instance;
      }

      function TameNodeList(nodeList, tameNodeCtor, opt_leafCtor) {
        // NodeListFilter takes care of exception wrapping
        var visibleList = new NodeListFilter(nodeList);
        function getItem(i) {
          i = +i;
          if (i >= visibleList.getLength()) { return void 0; }
          return tameNodeCtor(visibleList.item(i));
        }
        var getLength = visibleList.getLength.bind(visibleList);
        var result = constructArrayLike(
            opt_leafCtor || TameNodeList,  // allow inheritance
            getItem, getLength);
        return result;
      }
      registerArrayLikeClass(TameNodeList);
      setToString(TameNodeList.prototype, innocuous(function() {
        return '[domado object NodeList]';
      }));
      finishArrayLikeClass(TameNodeList);

      // NamedNodeMap is a NodeList + live string-named properties; therefore we
      // can't just use ArrayLike.
      var TameNamedNodeMap, namedNodeMapsAreLive;
      if (proxiesAvailable && proxiesInterceptNumeric) {
        namedNodeMapsAreLive = true;
        /**
         * @param {NamedNodeMap} feral
         * @param {function} mapping.tame (feral node in map) -> tame node
         * @param {function} mapping.untameName (guest's view of name) -> host's
         *     view of name (i.e. virtualized)
         * @param {function} mapping.tameGetName (tame node in map) -> node's
         *     name in map
         */
        TameNamedNodeMap = function TameNamedNodeMap1_(feral, mapping) {
          var visibleList = new NodeListFilter(feral);
          Props.define(this, null, {
            length: {
              get: innocuous(visibleList.getLength.bind(visibleList))
            },
            item: {
              value: innocuous(function(i) {
                return mapping.tame(visibleList.item(i));
              })
            }
          });
          Object.freeze(this);
          var proxy = Proxy.create(
              new NamedNodeMapProxyHandler(feral, mapping, visibleList, this),
              Object.getPrototypeOf(this));
          return proxy;
        };
        // TODO(kpreid): Reorder code so exporting the name works
        inertCtor(TameNamedNodeMap, Object /*, 'NamedNodeMap' */);
        setToString(TameNamedNodeMap.prototype, innocuous(function() {
          return '[domado object NamedNodeMap]';
        }));
        cajaVM.def(TameNamedNodeMap);
        var NamedNodeMapProxyHandler = function NamedNodeMapProxyHandler_(
              feral, mapping, visibleList, target) {
          this.feral = feral;
          this.mapping = mapping;
          this.visibleList = visibleList;
          CollectionProxyHandler.call(this, target);
        };
        inherit(NamedNodeMapProxyHandler, CollectionProxyHandler);
        NamedNodeMapProxyHandler.prototype.toString = function() {
          return '[NamedNodeMapProxyHandler]';
        };
        NamedNodeMapProxyHandler.prototype.col_lookup = function(name) {
          if (isNumericName(name)) {
            return this.visibleList.item(+name);
          } else {
            var feral = this.feral.getNamedItem(this.mapping.untameName(name));
            if (!isNodeToBeHidden(feral)) {
              return feral;
            } else {
              return null;
            }
          }
        };
        NamedNodeMapProxyHandler.prototype.col_evaluate = function(feralNode) {
          return this.mapping.tame(feralNode);
        };
        NamedNodeMapProxyHandler.prototype.col_names = function() {
          // actual browsers don't expose the named properties here, so we don't
          var array = [];
          var n = this.visibleList.getLength();
          for (var i = 0; i < n; i++) {
            array.push(String(i));
          }
          return array;
        };
        cajaVM.def(NamedNodeMapProxyHandler);
      } else {
        namedNodeMapsAreLive = false;
        /**
         * See documentation for other implementation above.
         */
        TameNamedNodeMap = function TameNamedNodeMap2_(feral, mapping) {
          // TODO(kpreid): NamedNodeMap is not normally a subtype of NodeList.
          // I'm just reusing implementation here.
          var self = TameNodeList.call(this, feral, mapping.tame.bind(mapping),
              TameNamedNodeMap);
          for (var i = self.length - 1; i >= 0; i--) {
            var tameNode = self[i];
            Object.defineProperty(self, mapping.tameGetName(tameNode), {
              configurable: false,
              enumerable: false,  // per browser behavior
              writable: false,
              value: tameNode
            });
          }
          Object.freeze(self);
          return self;
        };
        registerArrayLikeClass(TameNamedNodeMap, TameNodeList);
        setToString(TameNamedNodeMap.prototype, innocuous(function() {
          return '[domado object NamedNodeMap]';
        }));
        finishArrayLikeClass(TameNamedNodeMap);
      }

      function TameOptionsList(nodeList, opt_tameNodeCtor) {
        // NodeListFilter takes care of exception wrapping
        var visibleList = new NodeListFilter(nodeList);
        function getItem(i) {
          i = +i;
          return opt_tameNodeCtor(visibleList.item(i));
        }
        var getLength = visibleList.getLength.bind(visibleList);
        var result = constructArrayLike(TameOptionsList, getItem, getLength);
        Object.defineProperty(result, 'selectedIndex', {
            get: innocuous(function() { return +nodeList.selectedIndex; })
          });
        return result;
      }
      registerArrayLikeClass(TameOptionsList);
      setToString(TameOptionsList.prototype, innocuous(function() {
        return '[domado object HTMLOptionsCollection]';
      }));
      finishArrayLikeClass(TameOptionsList);

      /**
       * Return a fake node list containing tamed nodes.
       * @param {Array.<TameNode>} array of tamed nodes.
       * @param {String} typename either 'NodeList' or 'HTMLCollection'
       * @return an array that duck types to a node list.
       */
      function fakeNodeList(array, typename) {
        array.item = innocuous(function(i) { return array[+i]; });
        array.toString = innocuous(
            function() { return '[domado object ' + typename + ']'; });
        return Object.freeze(array);
      }

      /**
       * Constructs an HTMLCollection-like object which indexes its elements
       * based on their NAME attribute.
       *
       * @param tamed a JavaScript array that will be populated and decorated
       *     with the DOM HTMLCollection API.
       * @param nodeList an array-like object supporting a "length" property
       *     and "[]" numeric indexing.
       * @param opt_tameNodeCtor a function for constructing tame nodes
       *     out of raw DOM nodes.
       *
       * TODO(kpreid): Per
       * <http://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-75708506>
       * this should be looking up ids as well as names. (And not returning
       * nodelists, but is that for compatibility?)
       */
      function mixinHTMLCollection(tamed, nodeList, opt_tameNodeCtor) {
        mixinNodeList(tamed, nodeList, opt_tameNodeCtor);

        var tameNodesByName = {};
        var tameNode;

        for (var i = 0; i < tamed.length && (tameNode = tamed[+i]); ++i) {
          var name = void 0;
          if (tameNode.getAttribute) { name = tameNode.getAttribute('name'); }
          if (name && !(name.charAt(name.length - 1) === '_' || (name in tamed)
                       || name === String(name & 0x7fffffff))) {
            if (!tameNodesByName[name]) { tameNodesByName[name] = []; }
            tameNodesByName[name].push(tameNode);
          }
        }

        for (var name in tameNodesByName) {
          var tameNodes = tameNodesByName[name];
          if (tameNodes.length > 1) {
            tamed[name] = fakeNodeList(tameNodes, 'NodeList');
          } else {
            tamed[name] = tameNodes[0];
          }
        }

        tamed.namedItem = cajaVM.constFunc(function(name) {
          name = String(name);
          if (name.charAt(name.length - 1) === '_') {
            return null;
          }
          if (Object.prototype.hasOwnProperty.call(tamed, name)) {
            return cajaVM.passesGuard(TameNodeT, tamed[name])
                ? tamed[name] : tamed[name][0];
          }
          return null;
        });

        return tamed;
      }

      function tameHTMLCollection(nodeList, opt_tameNodeCtor) {
        return Object.freeze(
            mixinHTMLCollection([], nodeList, opt_tameNodeCtor));
      }

      function tameGetElementsByTagName(rootNode, tagName) {
        tagName = String(tagName);
        var eflags = 0;
        if (tagName !== '*') {
          tagName = tagName.toLowerCase();
          tagName = virtualToRealElementName(tagName);
        }
        var feralList = rootNode.getElementsByTagName(tagName);
        if (!(nodeListsAreLive && taming.hasTameTwin(feralList))) {
          taming.reTamesTo(feralList,
              new TameNodeList(feralList, defaultTameNode));
        }
        return taming.tame(feralList);
      }

      /**
       * Implements http://www.whatwg.org/specs/web-apps/current-work/#dom-document-getelementsbyclassname
       * using an existing implementation on browsers that have one.
       */
      function tameGetElementsByClassName(rootNode, className) {
        className = String(className);

        // The quotes below are taken from the HTML5 draft referenced above.

        // "having obtained the classes by splitting a string on spaces"
        // Instead of using split, we use match with the global modifier so that
        // we don't have to remove leading and trailing spaces.
        var classes = className.match(/[^\t\n\f\r ]+/g);

        // Filter out classnames in the restricted namespace.
        for (var i = classes ? classes.length : 0; --i >= 0;) {
          var classi = classes[+i];
          if (FORBIDDEN_ID_PATTERN.test(classi)) {
            classes[+i] = classes[classes.length - 1];
            --classes.length;
          }
        }

        if (!classes || classes.length === 0) {
          // "If there are no tokens specified in the argument, then the method
          //  must return an empty NodeList" [instead of all elements]
          // This means that
          //     htmlEl.ownerDocument.getElementsByClassName(htmlEl.className)
          // will return an HtmlCollection containing htmlElement iff
          // htmlEl.className contains a non-space character.
          return fakeNodeList([], 'NodeList');
        }

        // "unordered set of unique space-separated tokens representing classes"
        if (typeof rootNode.getElementsByClassName === 'function') {
          var feralList = rootNode.getElementsByClassName(classes.join(' '));
          if (!(nodeListsAreLive && taming.hasTameTwin(feralList))) {
            taming.reTamesTo(feralList,
                new TameNodeList(feralList, defaultTameNode));
          }
          return taming.tame(feralList);
        } else {
          // Add spaces around each class so that we can use indexOf later to
          // find a match.
          // This use of indexOf is strictly incorrect since
          // http://www.whatwg.org/specs/web-apps/current-work/#reflecting-content-attributes-in-dom-attributes
          // does not normalize spaces in unordered sets of unique
          // space-separated tokens.  This is not a problem since HTML5
          // compliant implementations already have a getElementsByClassName
          // implementation, and legacy
          // implementations do normalize according to comments on issue 935.

          // We assume standards mode, so the HTML5 requirement that
          //   "If the document is in quirks mode, then the comparisons for the
          //    classes must be done in an ASCII case-insensitive  manner,"
          // is not operative.
          var nClasses = classes.length;
          for (var i = nClasses; --i >= 0;) {
            classes[+i] = ' ' + classes[+i] + ' ';
          }

          // We comply with the requirement that the result is a list
          //   "containing all the elements in the document, in tree order,"
          // since the spec for getElementsByTagName has the same language.
          var candidates = rootNode.getElementsByTagName('*');
          var matches = [];
          var limit = candidates.length;
          if (limit !== +limit) { limit = 1/0; }  // See issue 935
          candidate_loop:
          for (var j = 0, candidate, k = -1;
               j < limit && (candidate = candidates[+j]);
               ++j) {
            var candidateClass = ' ' + candidate.className + ' ';
            for (var i = nClasses; --i >= 0;) {
              if (-1 === candidateClass.indexOf(classes[+i])) {
                continue candidate_loop;
              }
            }
            var tamed = defaultTameNode(candidate);
            if (tamed) {
              matches[++k] = tamed;
            }
          }
          // "the method must return a live NodeList object"
          return fakeNodeList(matches, 'NodeList');
        }
      }

      function querySelectorFail(tokens) {
        var error = new Error('Erroneous or unsupported selector syntax: ' +
            tokens.join(''));
        error.name = 'SyntaxError';
        throw error;
      }
      function tameQuerySelector(rootFeralNode, guestSelector, returnAll) {
        var sanitizedSelectors = sanitizeCssSelectorList(
          lexCss(guestSelector), qsaVirtualization, querySelectorFail);
        sanitizedSelectors = sanitizedSelectors.join(',');
        if (returnAll) {
          // TODO(kpreid): Review whether significant performance improvements
          // could be obtained by *not* using our live NodeList emulation, since
          // querySelectorAll is explicitly not live.
          return new TameNodeList(
              rootFeralNode.querySelectorAll(sanitizedSelectors),
              defaultTameNode);
        } else {
          // May return null; defaultTameNode is OK with that.
          return defaultTameNode(
              rootFeralNode.querySelector(sanitizedSelectors));
        }
      }

      /**
       * DOMTokenList taming.
       */
      var TokenListConf = new Confidence('TameDOMTokenList');
      function TameDOMTokenList(feral, getTransform, setTransform) {
        function getItem(i) {
          return TameDOMTokenList.prototype.item.call(self, i);
        }
        function getLength() { return feral.length; }
        var self = constructArrayLike(this.constructor, getItem, getLength);
        TokenListConf.confide(self, taming);
        TokenListConf.amplify(self, function(privates) {
          privates.feral = feral;
          privates.getT = getTransform;
          privates.setT = setTransform;
        });
        return self;
      }
      registerArrayLikeClass(TameDOMTokenList);
      Props.define(TameDOMTokenList.prototype, TokenListConf, {
        length: PT.ro,
        item: Props.ampMethod(function(privates, i) {
          var ftoken = privates.feral.item(i);
          return ftoken === null ? null : privates.getT(ftoken);
        }),
        contains: Props.ampMethod(function(privates, ttoken) {
          var ftoken = privates.setT(String(ttoken));
          if (ftoken === null) { return false; }
          return !!privates.feral.contains(ftoken);
        }),
        add: Props.ampMethod(function(privates, ttoken) {
          var ftoken = privates.setT(String(ttoken));
          if (ftoken === null) { return; }
          privates.feral.add(ftoken);
        }),
        remove: Props.ampMethod(function(privates, ttoken) {
          var ftoken = privates.setT(String(ttoken));
          if (ftoken === null) { return; }
          privates.feral.remove(ftoken);
        }),
        toggle: Props.ampMethod(function(privates, ttoken) {
          var ftoken = privates.setT(String(ttoken));
          if (ftoken === null) { return false; }
          return !!privates.feral.toggle(ftoken);
        }),
        toString: Props.ampMethod(function(privates) {
          return privates.feral.toString().replace(/[^ \t\n\r\f]+/g,
              function(ftoken) {
            var ttoken = privates.getT(ftoken);
            if (ttoken === null) { return ''; }
            return ttoken;
          });
        })
      });
      finishArrayLikeClass(TameDOMTokenList);

      function TameDOMSettableTokenList(feral, getTransform, setTransform) {
        return TameDOMTokenList.call(this, feral, getTransform, setTransform);
      }
      registerArrayLikeClass(TameDOMSettableTokenList, TameDOMTokenList);
      if (elementForFeatureTests.classList &&
          elementForFeatureTests.classList.value !== undefined) {
        Props.define(TameDOMSettableTokenList.prototype, TokenListConf, {
          value: {
            get: TokenListConf.amplifying(function(privates) {
              return privates.feral.value.replace(/[^ \t\n\r\f]+/g,
                    function(s) {
                var ttoken = privates.getT(s);
                if (ttoken === null) { return ''; }
                return ttoken;
              });
            }),
            set: TokenListConf.amplifying(function(privates, val) {
              privates.feral.value = val.replace(/[^ \t\n\r\f]+/g, function(s) {
                var ftoken = privates.setT(s);
                if (ftoken === null) { return ''; }
                return ftoken;
              });
            })
          }
        });
      }
      finishArrayLikeClass(TameDOMSettableTokenList);

      function tameTokenList(feral, getTransform, setTransform) {
        if ('value' in feral) {
          return new TameDOMSettableTokenList(feral, getTransform,
              setTransform);
        } else {
          return new TameDOMTokenList(feral, getTransform, setTransform);
        }
      }

      function makeEventHandlerWrapper(thisNode, listener) {
        ensureValidCallback(listener);
        function wrapper(event) {
          return plugin_dispatchEvent(
              thisNode, event, getId(tameWindow), listener);
        }
        return wrapper;
      }

      /**
       * Catch all failures and pass to onerror, for when we _aren't_ wrapping
       * a native event handler/listener and must catch everything.
       */
      function callAsEventListener(func, thisArg, tameEventObj) {
        try {
          Function.prototype.call.call(func, thisArg, tameEventObj);
        } catch (e) {
          try {
            tameWindow.onerror(
                e.message,
                '<' + tameEventObj.type + ' handler>',  // better than nothing
                0);
          } catch (e2) {
            console.error('onerror handler failed\n', e, '\n', e2);
          }
        }
      }

      function getFeralEventTarget(privates) {
        return privates.feralEventTarget || privates.feral;
      }

      // Implementation of EventTarget::addEventListener
      var tameAddEventListenerProp =
          Props.ampMethod(function(privates, name, listener, useCapture) {
        name = String(name);
        useCapture = Boolean(useCapture);
        var feral = getFeralEventTarget(privates);
        privates.policy.requireEditable();
        var list = privates.wrappedListeners;
        if (!list) {
          list = privates.wrappedListeners = [];
        }
        if (searchForListener(list, name, listener, useCapture) === null) {
          var wrappedListener = makeEventHandlerWrapper(feral, listener);
          var remove = bridal.addEventListener(
              feral, name, wrappedListener, useCapture);
          list.push({
            n: name,
            l: listener,
            c: useCapture,
            remove: remove
          });
        }
      });

      // Implementation of EventTarget::removeEventListener
      var tameRemoveEventListenerProp =
          Props.ampMethod(function(privates, name, listener, useCapture) {
        name = String(name);
        useCapture = Boolean(useCapture);
        privates.policy.requireEditable();
        var list = privates.wrappedListeners;
        if (!list) { return; }
        var match = searchForListener(list, name, listener, useCapture);
        if (match !== null) {
          list[match].remove();
          arrayRemove(list, match, match);
        }
      });

      function searchForListener(list, name, listener, useCapture) {
        for (var i = list.length; --i >= 0;) {
          var record = list[+i];
          if (record.n === name &&
              record.l === listener &&
              record.c === useCapture) {
            return i;
          }
        }
        return null;
      }

      var tameDispatchEventProp = Props.ampMethod(function(privates, evt) {
        return Boolean(eventAmplify(evt, function(evtPriv) {
          return bridal.dispatchEvent(
              getFeralEventTarget(privates), evtPriv.feral);
        }));
      });


      // We have now set up most of the 'support' facilities and are starting to
      // define node taming classes.

      /**
       * Base class for a Node wrapper.  Do not create directly -- use the
       * tameNode factory instead.
       *
       * NOTE that all TameNodes should have the TameNodeT trademark, but it is
       * not applied here since that freezes the object, and also because of the
       * forwarding proxies used for catching expando properties.
       *
       * @param {policy} Mutability policy to apply.
       * @constructor
       */
      function TameNode(policy) {
        TameNodeConf.confide(this, taming);
        if (!policy || !policy.requireEditable) {
          throw new Error("Domado internal error: Policy missing or invalid");
        }
        TameNodeConf.amplify(this, function(privates) {
          privates.policy = policy;
        });
        return this;
      }
      inertCtor(TameNode, Object, 'Node');
      Props.define(TameNode.prototype, TameNodeConf, {
        toString: Props.overridable(false, innocuous(function() {
          return nodeToStringSearch(this, this);
        })),
        baseURI: {
          enumerable: true,
          get: innocuous(function() {
            return domicile.pseudoLocation.href;
          })
        },
        ownerDocument: {
          // tameDocument is not yet defined at this point so can't be a
          // constant
          enumerable: true,
          get: innocuous(function() { return tameDocument; })
        }
      });
      /**
       * Print this object according to its tamed class name; also note for
       * debugging purposes if it is actually the prototype instance.
       */
      function nodeToStringSearch(self, prototype) {
        // recursion base case
        if (typeof prototype !== 'object' || prototype === Object.prototype) {
          return Object.prototype.toString.call(self);
        }

        var name = tamingClassTable.getNameOfPrototype(prototype);
        if (!name) {
          // try next ancestor
          return nodeToStringSearch(self, Object.getPrototypeOf(prototype));
        } else if (prototype === self) {
          return '[domado PROTOTYPE OF ' + name + ']';
        } else {
          return '[domado object ' + name + ' ' + self.nodeName + ']';
        }
      }
      // abstract TameNode.prototype.nodeType
      // abstract TameNode.prototype.nodeName
      // abstract TameNode.prototype.nodeValue
      // abstract TameNode.prototype.cloneNode
      // abstract TameNode.prototype.appendChild
      // abstract TameNode.prototype.insertBefore
      // abstract TameNode.prototype.removeChild
      // abstract TameNode.prototype.replaceChild
      // abstract TameNode.prototype.firstChild
      // abstract TameNode.prototype.lastChild
      // abstract TameNode.prototype.nextSibling
      // abstract TameNode.prototype.previousSibling
      // abstract TameNode.prototype.parentNode
      // abstract TameNode.prototype.getElementsByTagName
      // abstract TameNode.prototype.getElementsByClassName
      // abstract TameNode.prototype.childNodes
      // abstract TameNode.prototype.attributes
      cajaVM.def(TameNode);  // and its prototype

      var TameBackedNodeConf = TameNodeConf.subtype('TameBackedNode');
      /**
       * A tame node that is backed by a real node.
       *
       * All results of this constructor should be finishNode()d before being
       * revealed.
       *
       * @param {Function} opt_proxyType The constructor of the proxy handler
       *     to use, defaulting to no proxy wrapper.
       * @constructor
       */
      function TameBackedNode(node, opt_policy, opt_proxyType) {
        if (!node) {
          throw new Error('Creating tame node with undefined native delegate');
        }

        // Determine access policy
        var parent = node.parentNode;
        var parentPolicy;
        if (!parent || isContainerNode(parent) || isContainerNode(node)) {
          parentPolicy = null;
        } else {
          // Parent is inside the vdoc.
          parentPolicy = TameBackedNodeConf.amplify(defaultTameNode(parent),
              function(parentPriv) {
            return parentPriv.policy;
          });
        }
        var policy;
        if (opt_policy) {
          if (parentPolicy) {
            parentPolicy.childPolicy.assertRestrictedBy(opt_policy);
          }
          policy = opt_policy;
          //policy = new TracedNodePolicy(policy, "explicit", null);
        } else if (isContainerNode(parent)) {
          // Virtual document root -- stop implicit recursion and define the
          // root policy. If we wanted to be able to define a "entire DOM
          // read-only" policy, this is where to hook it in.
          policy = nodePolicyEditable;
          //policy = new TracedNodePolicy(policy, "child-of-root", null);
        } else if (parentPolicy) {
          policy = parentPolicy.childPolicy;
          //policy = new TracedNodePolicy(policy,
          //    "childPolicy of " + parent.nodeName, parentPolicy);
        } else {
          policy = nodePolicyEditable;
          //policy = new TracedNodePolicy(policy, "isolated", null);
        }

        TameNode.call(this, policy);

        TameBackedNodeConf.confide(this, taming);
        TameBackedNodeConf.amplify(this, function(privates) {
          privates.feral = node;

          // protocol for EventTarget operations
          privates.wrappedListeners = [];
          // privates.feralEventTarget absent as default

          if (proxiesAvailable && opt_proxyType) {
            privates.proxyHandler = new opt_proxyType(this);
            privates.proxyInit = opt_proxyType.domadoProxyInit;
          }
        });
      }
      inertCtor(TameBackedNode, TameNode);
      var compareDocumentPositionAvailable =
          'function' === typeof elementForFeatureTests.compareDocumentPosition;
      var containsAvailable = elementForFeatureTests.contains;
          // typeof is 'object' on IE
      Props.define(TameBackedNode.prototype, TameBackedNodeConf, {
        nodeType: PT.ro,
        nodeName: PT.ro,
        nodeValue: PT.ro,
        firstChild: NP_tameDescendant, // TODO(kpreid): Must be disableable
        lastChild: NP_tameDescendant,
        nextSibling: PT.related,
        previousSibling: PT.related,
        parentNode: PT.related,
        childNodes: PT.TameMemoIf(nodeListsAreLive,
            function(privates, f) {
          if (privates.policy.childrenVisible) {
            return new TameNodeList(f, defaultTameNode);
          } else {
            return fakeNodeList([], 'NodeList');
          }
        }),
        attributes: PT.TameMemoIf(namedNodeMapsAreLive,
            function(privates, feralMap) {
          if (privates.policy.attributesVisible) {
            var feralOwnerElement = privates.feral;
            return new TameNamedNodeMap(feralMap, {
              tame: function(feralNode) {
                return tameAttributeNode(feralNode, feralOwnerElement);
              },
              tameGetName: function(tameNode) {
                return tameNode.name;
              },
              untameName: function(name) {
                return rewriteAttributeName(feralOwnerElement, name);
              }
            });
          } else {
            // TODO(kpreid): no namedItem interface
            return fakeNodeList([], 'HTMLCollection');
          }
        }),
        cloneNode: Props.ampMethod(function(privates, deep) {
          privates.policy.requireUnrestricted();
          var clone = bridal.cloneNode(privates.feral, Boolean(deep));
          // From http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-3A0ED0A4
          //   "Note that cloning an immutable subtree results in a mutable copy"
          return defaultTameNode(clone);
        }),
        appendChild: Props.ampMethod(function(privates, child) {
          child = child || {};
          return TameBackedNodeConf.amplify(child, function(childPriv) {
            checkAdoption(privates, childPriv);

            privates.feral.appendChild(childPriv.feral);
            return child;
          });
        }),
        insertBefore: Props.ampMethod(function(privates, toInsert, child) {
          if (child === void 0) { child = null; }

          TameBackedNodeConf.amplify(toInsert, function(iPriv) {
            checkAdoption(privates, iPriv);
            if (child === null) {
              privates.feral.insertBefore(iPriv.feral, null);
            } else {
              TameBackedNodeConf.amplify(child, function(childPriv) {
                privates.feral.insertBefore(iPriv.feral, childPriv.feral);
              });
            }
          });
          return toInsert;
        }),
        removeChild: Props.ampMethod(function(privates, child) {
          TameBackedNodeConf.amplify(child, function(childPriv) {
            privates.policy.requireChildrenEditable();
            privates.feral.removeChild(childPriv.feral);
          });
          return child;
        }),
        replaceChild: Props.ampMethod(function(privates, newChild, oldChild) {
          TameBackedNodeConf.amplify(newChild, function(newPriv) {
            TameBackedNodeConf.amplify(oldChild, function(oldPriv) {
              checkAdoption(privates, newPriv);

              privates.feral.replaceChild(newPriv.feral, oldPriv.feral);
            });
          });
          return oldChild;
        }),
        hasChildNodes: Props.ampMethod(function(privates) {
          if (privates.policy.childrenVisible) {
            return !!privates.feral.hasChildNodes();
          } else {
            return false;
          }
        }),
        // http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget
        // "The EventTarget interface is implemented by all Nodes"
        addEventListener: tameAddEventListenerProp,
        removeEventListener: tameRemoveEventListenerProp,
        dispatchEvent: tameDispatchEventProp,
        /**
         * Speced in <a href="http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-compareDocumentPosition">DOM-Level-3</a>.
         */
        compareDocumentPosition: Props.cond(
            compareDocumentPositionAvailable,
            Props.ampMethod(function(privates, other) {
          if (!other) { return 0; }
          return TameBackedNodeConf.amplify(other, function(otherPriv) {
            var otherNode = otherPriv.feral;
            var bitmask = +privates.feral.compareDocumentPosition(otherNode);
            // To avoid leaking information about the relative positioning of
            // different roots, if neither contains the other, then we mask out
            // the preceding/following bits.
            // 0x18 is (CONTAINS | CONTAINED)
            // 0x1f is all the bits documented at
            //   http://www.w3.org/TR/DOM-Level-3-Core/core.html#DocumentPosition
            //   except IMPLEMENTATION_SPECIFIC
            // 0x01 is DISCONNECTED
            /*
            if (!(bitmask & 0x18)) {
              // TODO: If they are not under the same virtual doc root, return
              // DOCUMENT_POSITION_DISCONNECTED instead of leaking information
              // about PRECEDING | FOLLOWING.
            }
            */
            // Firefox3 returns spurious PRECEDING and FOLLOWING bits for
            // disconnected trees.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=486002
            if (bitmask & 1) {
              bitmask &= ~6;
            }
            return bitmask & 0x1f;
          });
        })),
        contains:
            containsAvailable ?
                Props.ampMethod(function(privates, other) {
                  if (other === null || other === void 0) { return false; }
                  return TameBackedNodeConf.amplify(other, function(otherPriv) {
                    return privates.feral.contains(otherPriv.feral);
                  });
                }) :
            compareDocumentPositionAvailable ?
                Props.ampMethod(function(other) {
                  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
                  if (other === null || other === void 0) { return false; }
                  var docPos = this.compareDocumentPosition(other);
                  return !(!(docPos & 0x10) && docPos);
                }) :
            Props.NO_PROPERTY
      });
      /** Is it OK to make 'child' a child of 'parent'? */
      function checkAdoption(parentPriv, childPriv) {
        // Child must be editable since appendChild can remove it from its
        // parent.
        parentPriv.policy.requireChildrenEditable();
        childPriv.policy.requireEditable();
        // Sanity check: this cannot currently happen but if it does then we
        // need to rethink the calculation of policies.
        parentPriv.policy.childPolicy.assertRestrictedBy(childPriv.policy);
      }
      cajaVM.def(TameBackedNode);  // and its prototype

      // Restricted node types:

      // An opaque node is traversible but not manipulable by guest code. This
      // is the default taming for unrecognized nodes or nodes not explicitly
      // whitelisted.
      function TameOpaqueNode(node) {
        TameBackedNode.call(this, node, nodePolicyOpaque);
      }
      inertCtor(TameOpaqueNode, TameBackedNode);
      cajaVM.def(TameOpaqueNode);

      // A foreign node is one supplied by some external system to the guest
      // code, which the guest code may lay out within its own DOM tree but may
      // not traverse into in any way.
      function TameForeignNode(node) {
        TameBackedNode.call(this, node, nodePolicyForeign);
      }
      inertCtor(TameForeignNode, TameBackedNode);
      // no subtype defined as these methods are harmless
      Props.define(TameForeignNode.prototype, TameNodeConf, {
        // These methods are needed because TameForeignNode doesn't inherit
        // TameElement, but a foreign node (itself, not its children) can appear
        // in a node list.
        getElementsByTagName: Props.plainMethod(function(tagName) {
          // needed because TameForeignNode doesn't inherit TameElement
          return fakeNodeList([], 'NodeList');
        }),
        getElementsByClassName: Props.plainMethod(function(className) {
          return fakeNodeList([], 'HTMLCollection');
        })
      });
      cajaVM.def(TameForeignNode);

      // Non-element node types:

      tamingClassTable.registerLazy('Text', function() {
        function TameTextNode(node) {
          assert(node.nodeType === 3);
          TameBackedNode.call(this, node);
        }
        inertCtor(TameTextNode, TameBackedNode);
        var textAccessor = Props.actAs('nodeValue', PT.filterProp(identity,
            function(value) { return String(value || ''); }));
        // no subtype defined as nodeValue is generic
        Props.define(TameTextNode.prototype, TameNodeConf, {
          nodeValue: textAccessor,
          textContent: textAccessor,
          innerText: textAccessor,
          data: textAccessor
        });
        return cajaVM.def(TameTextNode);  // and defend its prototype
      });

      tamingClassTable.registerLazy('Comment', function() {
        function TameCommentNode(node) {
          assert(node.nodeType === 8);
          TameBackedNode.call(this, node);
        }
        inertCtor(TameCommentNode, TameBackedNode);
        return cajaVM.def(TameCommentNode);  // and defend its prototype
      });

      // Note that our tame attribute nodes bake in the notion of what element
      // they belong to (in order to implement virtualization policy).
      // Correspondingly, we do not implement createAttribute or
      // setAttributeNode, so it is not possible to associate an attribute with
      // a different element.
      //
      // In the event that we need to change this, note that not all browsers
      // implement .ownerElement on attribute nodes, and that there is currently
      // (2013-02-26) an effort to deprecate attributes-as-nodes, according to
      // MDN <https://developer.mozilla.org/en-US/docs/DOM/Attr>.
      function tameAttributeNode(node, ownerElement) {
        if (node === null || node === undefined) {
          return node;
        } else if (taming.hasTameTwin(node)) {
          return taming.tame(node);
        } else {
          var self = new (tamingClassTable.getTamingCtor('Attr'))(
              node, ownerElement);
          taming.tamesTo(node, self);
          return self;
        }
      }
      tamingClassTable.registerLazy('Attr', function() {
        var TameAttrConf = TameBackedNodeConf.subtype('TameAttr');
        function TameBackedAttributeNode(node, ownerElement) {
          if ('ownerElement' in node && node.ownerElement !== ownerElement) {
            throw new Error('Inconsistent ownerElement');
          }

          var ownerPolicy = TameElementConf.amplify(
            defaultTameNode(ownerElement),
            function(ownerPriv) { return ownerPriv.policy; });

          TameBackedNode.call(this, node, ownerPolicy);

          TameAttrConf.confide(this, taming);
          TameAttrConf.amplify(this, function(privates) {
            privates.ownerElement = ownerElement;
          });
        }
        inertCtor(TameBackedAttributeNode, TameBackedNode);
        var nameAccessor = PT.ROView(function(name) {
          if (cajaPrefRe.test(name)) {
            name = name.substring(cajaPrefix.length);
          }
          return name;
        });
        var valueAccessor = {
          enumerable: true,
          get: innocuous(function() {
             return this.ownerElement.getAttribute(this.name);
          }),
          set: innocuous(function(value) {
            return this.ownerElement.setAttribute(this.name, value);
          })
        };
        var notImplementedNodeMethod = {
          enumerable: true,
          value: innocuous(function() {
            throw new Error('Not implemented.');
          })
        };
        Props.define(TameBackedAttributeNode.prototype, TameAttrConf, {
          nodeName: nameAccessor,
          name: nameAccessor,
          specified: {
            enumerable: true,
            get: innocuous(function() {
              return this.ownerElement.hasAttribute(this.name);
            })
          },
          nodeValue: valueAccessor,
          value: valueAccessor,
          ownerElement: {
            enumerable: true,
            get: TameAttrConf.amplifying(function(privates) {
              return defaultTameNode(privates.ownerElement);
            })
          },
          nodeType: P_constant(2),
          firstChild:      P_UNIMPLEMENTED,
          lastChild:       P_UNIMPLEMENTED,
          nextSibling:     P_UNIMPLEMENTED,
          previousSibling: P_UNIMPLEMENTED,
          parentNode:      P_UNIMPLEMENTED,
          childNodes:      P_UNIMPLEMENTED,
          attributes:      P_UNIMPLEMENTED,
          cloneNode: Props.ampMethod(function(privates, deep) {
            var clone = bridal.cloneNode(privates.feral, Boolean(deep));
            // From http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-3A0ED0A4
            //   "Note that cloning an immutable subtree results in a mutable
            //    copy"
            return tameAttributeNode(clone, privates.ownerElement);
          }),
          appendChild: notImplementedNodeMethod,
          insertBefore: notImplementedNodeMethod,
          removeChild: notImplementedNodeMethod,
          replaceChild: notImplementedNodeMethod
        });
        return cajaVM.def(TameBackedAttributeNode);  // and defend its prototype
      });

      // Elements in general and specific elements:

      var TameElementConf = TameBackedNodeConf.subtype('TameElement');

      // Register set handlers for onclick, onmouseover, etc.
      function registerElementScriptAttributeHandlers(tameElementPrototype) {
        var seenAlready = {};
        var attrNameRe = /::(.*)/;
        for (var html4Attrib in html4.ATTRIBS) {
          if (html4.atype.SCRIPT === html4.ATTRIBS[html4Attrib]) {
            (function (attribName) {
              // Attribute names are defined per-element, so we will see
              // duplicates here.
              if (Object.prototype.hasOwnProperty.call(
                  seenAlready, attribName)) {
                return;
              }
              seenAlready[attribName] = true;

              Object.defineProperty(tameElementPrototype, attribName, {
                enumerable: canHaveEnumerableAccessors,
                configurable: false,
                set: TameElementConf.amplifying(
                    function eventHandlerSetter(privates, listener) {
                  privates.policy.requireEditable();
                  if (!listener) {  // Clear the current handler
                    privates.feral[attribName] = null;
                  } else {
                    // This handler cannot be copied from one node to another
                    // which is why getters are not yet supported.
                    privates.feral[attribName] = makeEventHandlerWrapper(
                        privates.feral, listener);
                  }
                  return listener;
                })
              });
            })(html4Attrib.match(attrNameRe)[1]);
          }
        }
      }

      // TODO(kpreid): See if it's feasible to make TameElement lazy constructed
      // for guests that don't do any DOM manipulation until after load. Will
      // require deferring the tameContainerNode.
      /**
       * @constructor
       */
      function TameElement(node, opt_policy, opt_proxyType) {
        assert(node.nodeType === 1);
        TameBackedNode.call(this, node, opt_policy, opt_proxyType);
        TameElementConf.confide(this);
        TameElementConf.amplify(this, function(privates) {
          privates.geometryDelegate = node;
        });
      }
      var defaultNodeClassCtor =
          tamingClassTable.registerSafeCtor('Element',
              inertCtor(TameElement, TameBackedNode, 'HTMLElement'));
      registerElementScriptAttributeHandlers(TameElement.prototype);
      function innerTextOf(rawNode, out) {
        switch (rawNode.nodeType) {
          case 1:  // Element
            if (htmlSchema.element(rawNode.tagName).allowed) {
              // Not an opaque node.
              for (var c = rawNode.firstChild; c; c = c.nextSibling) {
                innerTextOf(c, out);
              }
            }
            break;
          case 3:  // Text Node
          case 4:  // CDATA Section Node
            out[out.length] = rawNode.data;
            break;
          case 11:  // Document Fragment
            for (var c = rawNode.firstChild; c; c = c.nextSibling) {
              innerTextOf(c, out);
            }
            break;
        }
      }
      var geometryDelegateProperty = Props.markPropMaker(function(env) {
        var prop = env.prop;
        return {
          enumerable: true,
          get: env.amplifying(function(privates) {
            return +privates.geometryDelegate[prop];
          })
        };
      });
      var geometryDelegatePropertySettable = Props.markPropMaker(function(env) {
        var desc = geometryDelegateProperty(env);
        var prop = env.prop;
        desc.set = env.amplifying(function(privates, value) {
          privates.policy.requireEditable();
          privates.geometryDelegate[prop] = +value;
        });
        return desc;
      });
      var textContentProp = {
        enumerable: true,
        get: TameElementConf.amplifying(function(privates) {
          var text = [];
          innerTextOf(privates.feral, text);
          return text.join('');
        }),
        set: TameElementConf.amplifying(function(privates, newText) {
          // This operation changes the child node list (but not other
          // properties of the element) so it checks childrenEditable. Note that
          // this check is critical to security, as else a client can set the
          // textContent of a <script> element to execute scripts.
          privates.policy.requireChildrenEditable();
          var newTextStr = newText != null ? String(newText) : '';
          var el = privates.feral;
          for (var c; (c = el.firstChild);) { el.removeChild(c); }
          if (newTextStr) {
            el.appendChild(el.ownerDocument.createTextNode(newTextStr));
          }
        })
      };
      var tagNameAttr = PT.ROView(function(name) {
        return realToVirtualElementName(String(name));
      });
      Props.define(TameElement.prototype, TameElementConf, {
        id: PT.filterAttr(defaultToEmptyStr, identity),
        className: {
          enumerable: true,
          get: innocuous(function() {
            return this.getAttribute('class') || '';
          }),
          set: innocuous(function(classes) {
            return this.setAttribute('class', String(classes));
          })
        },
        title: PT.filterAttr(defaultToEmptyStr, String),
        dir: PT.filterAttr(defaultToEmptyStr, String),
        textContent: textContentProp,
        innerText: textContentProp,
        // Note: Per MDN, innerText is actually subtly different than
        // textContent, in that innerText does not include text hidden via
        // styles, per MDN. We do not implement this difference.
        nodeName: tagNameAttr,
        tagName: tagNameAttr,
        style: {
          enumerable: true,
          get: TameElementConf.amplifying(function(privates) {
            return new (tamingClassTable.getTamingCtor('CSSStyleDeclaration'))(
                privates.feral.style, privates.policy.editable, this);
          }),
          set: innocuous(function(value) {
            this.setAttribute('style', value);
          })
        },
        innerHTML: {
          enumerable: true,
          get: innocuous(function() {
            return htmlFragmentSerialization(this);
          }),
          set: TameElementConf.amplifying(function(privates, htmlFragment) {
            // This operation changes the child node list (but not other
            // properties of the element) so it checks childrenEditable. Note
            // that this check is critical to security, as else a client can set
            // the innerHTML of a <script> element to execute scripts.
            privates.policy.requireChildrenEditable();
            var node = privates.feral;
            var schemaElem = htmlSchema.element(node.tagName);
            if (!schemaElem.allowed) {
              throw new Error("Can't set .innerHTML of non-whitelisted <" +
                  node.tagName + ">");
            }
            var isRCDATA = schemaElem.contentIsRCDATA;
            var htmlFragmentString;
            if (htmlFragment === null) {
              htmlFragmentString = '';
            } else {
              htmlFragmentString = '' + htmlFragment;
            }
            var sanitizedHtml;
            if (isRCDATA) {
              sanitizedHtml = html.normalizeRCData(htmlFragmentString);
            } else {
              sanitizedHtml = sanitizeHtml(htmlFragmentString);
            }
            node.innerHTML = sanitizedHtml;
          })
        },
        offsetParent: {
          enumerable: true,
          get: TameElementConf.amplifying(function(privates) {
            var feralOffsetParent = privates.feral.offsetParent;
            if (!feralOffsetParent) {
              return feralOffsetParent;
            } else if (feralOffsetParent === feralPseudoDocument) {
              // Return the body if the node is contained in the body. This is
              // emulating how browsers treat offsetParent and the real <BODY>.
              return TameBackedNodeConf.amplify(tameDocument.body,
                  function(bodyPriv) {
                var feralBody = bodyPriv.feral;
                for (var ancestor = privates.feral.parentNode;
                     ancestor !== feralPseudoDocument;
                     ancestor = ancestor.parentNode) {
                  if (ancestor === feralBody) {
                    return defaultTameNode(feralBody);
                  }
                }
                return null;
              });
            } else {
              return tameRelatedNode(feralOffsetParent);
            }
          })
        },
        accessKey: PT.rw,
        tabIndex: PT.rw,
        clientLeft: geometryDelegateProperty,
        clientTop: geometryDelegateProperty,
        clientWidth: geometryDelegateProperty,
        clientHeight: geometryDelegateProperty,
        offsetLeft: geometryDelegateProperty,
        offsetTop: geometryDelegateProperty,
        offsetWidth: geometryDelegateProperty,
        offsetHeight: geometryDelegateProperty,
        scrollLeft: geometryDelegatePropertySettable,
        scrollTop: geometryDelegatePropertySettable,
        scrollWidth: geometryDelegateProperty,
        scrollHeight: geometryDelegateProperty,
        blur: NP_noArgEditVoidMethod,
        focus: Props.ampMethod(function(privates) {
          return domicile.handlingUserAction && privates.feral.focus();
        }),
        // IE-specific method.  Sets the element that will have focus when the
        // window has focus, without focusing the window.
        setActive: Props.cond(elementForFeatureTests.setActive,
            Props.ampMethod(function(privates) {
              return domicile.handlingUserAction && privates.feral.setActive();
            })),
        // IE-specific method.
        hasFocus: Props.cond(elementForFeatureTests.hasFocus,
            Props.ampMethod(function(privates) {
              return privates.feral.hasFocus();
            })),
        getAttribute: Props.ampMethod(function(privates, attribName) {
          if (!privates.policy.attributesVisible) { return null; }
          var feral = privates.feral;
          attribName = String(attribName).toLowerCase();
          if (/__$/.test(attribName)) {
            throw new TypeError('Attributes may not end with __');
          }
          var tagName = feral.tagName.toLowerCase();
          var atype = htmlSchema.attribute(tagName, attribName).type;
          if (atype === void 0) {
            return feral.getAttribute(cajaPrefix + attribName);
          }
          var value = bridal.getAttribute(feral, attribName);
          if ('string' !== typeof value) { return value; }
          return virtualizeAttributeValue(atype, value);
        }),
        getAttributeNode: Props.ampMethod(function(privates, name) {
          if (!privates.policy.attributesVisible) { return null; }
          var feral = privates.feral;
          return tameAttributeNode(
              feral.getAttributeNode(rewriteAttributeName(feral, name)),
              feral);
        }),
        hasAttribute: Props.ampMethod(function(privates, attribName) {
          var feral = privates.feral;
          return bridal.hasAttribute(feral,
              rewriteAttributeName(feral, attribName));
        }),
        setAttribute: Props.ampMethod(function(privates, attribName, value) {
          var feral = privates.feral;
          privates.policy.requireEditable();
          attribName = String(attribName).toLowerCase();
          if (/__$/.test(attribName)) {
            throw new TypeError('Attributes may not end with __');
          }
          if (!privates.policy.attributesVisible) { return null; }
          var tagName = feral.tagName.toLowerCase();
          var atype = htmlSchema.attribute(tagName, attribName).type;
          if (atype === void 0) {
            bridal.setAttribute(feral, cajaPrefix + attribName, value);
          } else {
            var sanitizedValue = rewriteAttribute(
                tagName, attribName, atype, value);
            if (sanitizedValue !== null) {
              bridal.setAttribute(feral, attribName, sanitizedValue);
              if (html4.ATTRIBS.hasOwnProperty(tagName + '::target') &&
                atype === html4.atype.URI) {
                if (sanitizedValue.charAt(0) === '#') {
                  feral.removeAttribute('target');
                } else {
                  bridal.setAttribute(feral, 'target',
                    getSafeTargetAttribute(tagName, 'target',
                      bridal.getAttribute(feral, 'target')));
                }
              }
            } else {
              if (typeof console !== 'undefined') {
                console.warn('Rejecting <' + tagName + '>.setAttribute(',
                    attribName, ',', value, ')');
              }
            }
          }
          return value;
        }),
        removeAttribute: Props.ampMethod(function(privates, attribName) {
          var feral = privates.feral;
          privates.policy.requireEditable();
          feral.removeAttribute(rewriteAttributeName(feral, attribName));
        }),
        getElementsByTagName: Props.ampMethod(function(privates, tagName) {
          return tameGetElementsByTagName(privates.feral, tagName);
        }),
        getElementsByClassName: Props.ampMethod(function(privates, className) {
          return tameGetElementsByClassName(privates.feral, className);
        }),
        querySelector: Props.cond(elementForFeatureTests.querySelector,
            Props.ampMethod(function(privates, selector) {
              return tameQuerySelector(privates.feral, selector, false);
            })),
        querySelectorAll: Props.cond(elementForFeatureTests.querySelectorAll,
            Props.ampMethod(function(privates, selector) {
              return tameQuerySelector(privates.feral, selector, true);
            })),
        getBoundingClientRect: Props.ampMethod(function(privates) {
          var elRect = bridal.getBoundingClientRect(privates.feral);
          return TameHTMLDocumentConf.amplify(this.ownerDocument,
              function(docPriv) {
            var vdoc = bridal.getBoundingClientRect(docPriv.feralContainerNode);
            var vdocLeft = vdoc.left, vdocTop = vdoc.top;
            return ({
                      top: elRect.top - vdocTop,
                      left: elRect.left - vdocLeft,
                      right: elRect.right - vdocLeft,
                      bottom: elRect.bottom - vdocTop
                    });
          });
        })
      });
      if ('classList' in elementForFeatureTests) {
        Props.define(TameElement.prototype, TameNodeConf, {
          classList: PT.TameMemoIf(true,
              function(privates, feralList) {
            var element = this;
            return new TameDOMSettableTokenList(feralList,
                function classListGetTransform(token) {
                  return virtualizeAttributeValue(html4.atype.CLASSES, token);
                },
                function classListSetTransform(token) {
                  return rewriteAttribute(element.tagName, 'class',
                      html4.atype.CLASSES, token);
                });
          })
        });
      }
      cajaVM.def(TameElement);  // and its prototype

      // Maps taming class ctors to their Confidences; used for establishing
      // subtype relationships and for non-method functions wishing to amplify
      // a particular subtype.
      // TODO(kpreid): Review whether this ought to be part of TamingClassTable.
      var elementCtorConfidences = new WeakMap();
      elementCtorConfidences.set(TameElement, TameElementConf);

      /**
       * Define a taming class for a subclass of HTMLElement.
       *
       * @param {function|string} record.superclass The tame superclass
       *     constructor (defaults to TameElement) with parameters (this, node,
       *     policy, opt_proxyType). May be specified as a string which will be
       *     looked up in the tamingClassTable.
       * @param {Array} record.names The element names which should be tamed
       *     using this class.
       * @param {string} record.domClass The DOM-specified class name.
       * @param {function} record.properties A function returning the custom
       *     properties this class should have (in the format accepted by
       *     Props.define). (Is a function for laziness.)
       * @param {function} record.construct Code to invoke at the end of
       *     construction; takes and returns self.
       * @param {?boolean} record.virtualized Whether it should be expected that
       *     elements tamed with this class should have virtualized names.
       *     If null, no restriction.
       * @param {boolean} record.forceChildrenNotEditable Whether to force the
       *     child node list and child nodes to not be mutable.
       */
      function defineElement(record) {
        var domClass = record.domClass;
        if (!domClass) {
          throw new Error('Anonymous element classes are useless');
        }
        var superclassRef = record.superclass || 'HTMLElement';
        var proxyType = record.proxyType;
        var construct = record.construct;
        var shouldBeVirtualized = "virtualized" in record
            ? record.virtualized : false;
        var opt_policy = record.forceChildrenNotEditable
            ? nodePolicyReadOnlyChildren : null;
        function defineElementThunk() {
          var superclass = typeof superclassRef === 'string'
              ? tamingClassTable.getTamingCtor(superclassRef)
              : superclassRef;
          var confidence = elementCtorConfidences.get(superclass)
              .subtype(domClass);
          function TameSpecificElement(node) {
            if (shouldBeVirtualized !== null) {
              var isVirtualized =
                  htmlSchema.isVirtualizedElementName(node.tagName);
              if (!isVirtualized !== !shouldBeVirtualized) {
                throw new Error('Domado internal inconsistency: ' + node.tagName
                    + ' has inconsistent virtualization state with class ' +
                    record.domClass);
              }
            }
            superclass.call(this, node, opt_policy, proxyType);
            confidence.confide(this, taming);
            if (construct) { confidence.amplify(this, construct); }
          }
          inertCtor(TameSpecificElement, superclass);
          if (record.properties) {
            Props.define(TameSpecificElement.prototype, confidence,
                (0,record.properties)());
          }
          elementCtorConfidences.set(TameSpecificElement, confidence);
          // Note: cajaVM.def will be applied to all registered node classes
          // later, so users of defineElement don't need to.
          return cajaVM.def(TameSpecificElement);
        }
        tamingClassTable.registerLazy(domClass, defineElementThunk);
      }
      cajaVM.def(defineElement);

      /**
       * For elements which have no properties at all, but we want to define in
       * in order to be explicitly complete (suppress the no-implementation
       * warning).
       */
      function defineTrivialElement(domClass) {
        defineElement({domClass: domClass});
      }

      defineElement({
        domClass: 'HTMLAnchorElement',
        properties: function() { return {
          hash: PT.filter(
            false,
            function (value) { return unsuffix(value, idSuffix, value); },
            false,
            // TODO(felix8a): add suffix if href is self
            identity),
          href: NP_UriValuedProperty('a', 'href')
        }; }
      });

      defineElement({
        superclass: 'HTMLMediaElement',
        domClass: 'HTMLAudioElement'
      });
      namedConstructors.Audio = innocuous(function AudioCtor(src) {
        var element = tameDocument.createElement('audio');
        element.preload = 'auto';
        if (src !== undefined) { element.src = src; }
        return element;
      });

      defineTrivialElement('HTMLBRElement');

      defineElement({
        virtualized: true,
        domClass: 'HTMLBodyElement',
        properties: function() { return {
          setAttribute: Props.overridable(true, innocuous(
              function(attrib, value) {
            TameElement.prototype.setAttribute.call(this, attrib, value);
            var attribName = String(attrib).toLowerCase();
            // Window event handlers are exposed as content attributes on <body>
            // and <frameset>
            // <http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#handler-window-onload>
            // as of 2012-09-14
            // Note: We only currently implement onload.
            if (attribName === 'onload') {
              // We do not use the main event-handler-attribute rewriter here
              // because it generates event-handler strings, not functions --
              // and for the TameWindow there is no real element to hang those
              // handler strings on. TODO(kpreid): refactor to fix that.

              // Per http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#event-handler-attributes
              tameWindow[attribName] = cajaVM.compileExpr(
                  'function cajaEventHandlerAttribFn_' + attribName +
                  '(event) {\n' + value + '\n}')(tameWindow);
            }
          }))
        }; }
      });

      // http://dev.w3.org/html5/spec/Overview.html#the-canvas-element
      (function() {
        // TODO(felix8a): need to call bridal.initCanvasElement
        var canvasTest = document.createElement('canvas');
        if (typeof canvasTest.getContext !== 'function') {
          // If the host browser does not have getContext, then it must not
          // usefully support canvas, so we don't either; skip registering the
          // canvas element class.
          return;
        }

        // TODO(kpreid): snitched from Caja runtime; review whether we actually
        // need this (the Canvas spec says that invalid values should be ignored
        // and we don't do that in a bunch of places);
        /**
         * Enforces <tt>typeOf(specimen) === typename</tt>, in which case
         * specimen is returned.
         * <p>
         * If not, throws an informative TypeError
         * <p>
         * opt_name, if provided, should be a name or description of the
         * specimen used only to generate friendlier error messages.
         */
        function enforceType(specimen, typename, opt_name) {
          if (typeof specimen !== typename) {
            throw new Error('expected ' + typename + ' instead of ' +
                typeof specimen + ': ' + (opt_name || specimen));
          }
          return specimen;
        }

        /** Returns '' if invalid, which native canvas will ignore. */
        function sanitizeCssValue(cssPropertyName, value) {
          if (typeof value !== 'string') { return ''; }
          var tokens = lexCss(value);
          sanitizeCssProperty(cssPropertyName, tokens);
          return tokens.join(' ');
        }
        function sanitizeFont(value) {
          return sanitizeCssValue('font', value);
        }
        function sanitizeColor(value) {
          // Note: we're sanitizing against the CSS "color:" property, but what
          // is actually referenced by the draft canvas spec is the CSS
          // syntactic element <color>, which is why we need to specifically
          // exclude "inherit".
          var style = sanitizeCssValue('color', value);
          if (/\binherit\b/.test(style)) { return ''; }
          return style;
        }
        var colorNameTable = {
          // http://dev.w3.org/csswg/css3-color/#html4 as cited by
          // http://dev.w3.org/html5/2dcontext/#dom-context-2d-fillstyle
          // TODO(kpreid): avoid duplication with table in CssRewriter.java
          " black":   "#000000",
          " silver":  "#c0c0c0",
          " gray":    "#808080",
          " white":   "#ffffff",
          " maroon":  "#800000",
          " red":     "#ff0000",
          " purple":  "#800080",
          " fuchsia": "#ff00ff",
          " green":   "#008000",
          " lime":    "#00ff00",
          " olive":   "#808000",
          " yellow":  "#ffff00",
          " navy":    "#000080",
          " blue":    "#0000ff",
          " teal":    "#008080",
          " aqua":    "#00ffff"
        };
        function StringTest(strings) {
          var table = {};
          // The table itself as a value is a marker to avoid running into
          // Object.prototype properties.
          for (var i = strings.length; --i >= 0;) {
            table[strings[+i]] = table;
          }
          return cajaVM.constFunc(function(string) {
            return typeof string === 'string' && table[string] === table;
          });
        }
        function canonColor(colorString) {
          // http://dev.w3.org/html5/2dcontext/ says the color shall be returned
          // only as #hhhhhh, not as names.
          return colorNameTable[" " + colorString] || colorString;
        }

        tamingClassTable.registerLazy('ImageData', function() {
          function TameImageData(imageData) {
            TameImageDataConf.confide(this, taming);
            taming.permitUntaming(this);

            this.width = Number(imageData.width);
            this.height = Number(imageData.height);

            TameImageDataConf.amplify(this, function(privates) {
              // used to unwrap for passing to putImageData
              privates.feral = imageData;

              // lazily constructed tame copy, backs .data accessor; also used
              // to test whether we need to write-back the copy before a
              // putImageData
              privates.tamePixelArray = undefined;

              privates.writeback = function() {
                // This is invoked just before each putImageData to copy pixels
                // back into the feral world
                if (privates.tamePixelArray) {
                  privates.feral.data.set(privates.tamePixelArray);
                }
              };

              Object.preventExtensions(privates);
            });
            Object.freeze(this);
          }
          inertCtor(TameImageData, Object);
          Props.define(TameImageData.prototype, TameImageDataConf, {
            toString: Props.overridable(false, innocuous(function() {
              return '[domado object ImageData]';
            })),
            // Accessor used so we don't need to copy if the client is
            // just blitting (getImageData -> putImageData) rather than
            // inspecting the pixels.
            data: Props.ampGetter(function(privates) {
              if (!privates.tamePixelArray) {
                // Creates copy containing no feral references
                privates.tamePixelArray =
                    new Uint8ClampedArray(privates.feral.data);
              }
              return privates.tamePixelArray;
            })
          });
          return cajaVM.def(TameImageData);
        });

        tamingClassTable.registerLazy('CanvasGradient', function() {
          function TameGradient(gradient) {
            TameGradientConf.confide(this, taming);
            TameGradientConf.amplify(this, function(privates) {
              privates.feral = gradient;
            });
            taming.tamesTo(gradient, this);
            Object.freeze(this);
          }
          inertCtor(TameGradient, Object);
          Props.define(TameGradient.prototype, TameGradientConf, {
            toString: Props.plainMethod(function() {
               return '[domado object CanvasGradient]';
            }),
            addColorStop: tameMethodCustom(function(privates, offset, color) {
              enforceType(offset, 'number', 'color stop offset');
              if (!(0 <= offset && offset <= 1)) {
                throw new Error(INDEX_SIZE_ERROR);
                // TODO(kpreid): should be a DOMException per spec
              }
              var sanColor = sanitizeColor(color);
              if (sanColor === '') {
                throw new Error('SYNTAX_ERR');
                // TODO(kpreid): should be a DOMException per spec
              }
              privates.feral.addColorStop(offset, sanColor);
            })
          });
          return cajaVM.def(TameGradient);
        });

        function enforceFinite(value, name) {
          enforceType(value, 'number', name);
          if (!isFinite(value)) {
            throw new Error("NOT_SUPPORTED_ERR");
            // TODO(kpreid): should be a DOMException per spec
          }
        }

        // Design note: We generally reject the wrong number of arguments,
        // unlike default JS behavior. This is because we are just passing data
        // through to the underlying implementation, but we don't want to pass
        // on anything which might be an extension we don't know about, and it
        // is better to fail explicitly than to leave the client wondering about
        // why their extension usage isn't working.
        //
        // TODO(kpreid): I no longer think this is a good idea; it deviates from
        // JavaScript conventions and increases code complexity, and requires
        // distinct taming wrappers from the rest of Domado. Remove all of the
        // argument length checking and simultaneously use conformant
        // coerce/ignore behavior for NaN and non-floats rather than strict
        // type checks.

        // TODO(kpreid): Consolidate this with tameNoArgEditMethod and friends.
        var tameNoArgOp = Props.markPropMaker(function (env) {
          var prop = env.prop;
          return {
            enumerable: true,
            value: env.amplifying(function(privates) {
              if (arguments.length !== 1) {
                throw new Error(prop + ' takes no args, not ' +
                    (arguments.length - 1));
              }
              privates.feral[prop]();
            })
          };
        });

        function tameFloatsOp(count) {
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              value: env.amplifying(function(privates) {
                if (arguments.length - 1 !== count) {
                  throw new Error(prop + ' takes ' + count +
                      ' args, not ' + (arguments.length - 1));
                }
                // In theory this could be type check plus Array.prototype.shift
                // -- but feeling a little paranoid, so let's construct a
                // separate arguments array.
                var args = new Array(count);
                for (var i = 0; i < count; i++) {
                  args[+i] = enforceType(arguments[+i + 1], 'number',
                      prop + ' argument ' + i);
                }
                var feral = privates.feral;
                feral[prop].apply(feral, args);
              })
            };
          });
        }

        function tameRectMethod(resultFn) {
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              value: env.amplifying(function(privates, x, y, w, h) {
                if (arguments.length !== 5) {
                  throw new Error(prop + ' takes 4 args, not ' +
                                  (arguments.length - 1));
                }
                enforceType(x, 'number', 'x');
                enforceType(y, 'number', 'y');
                enforceType(w, 'number', 'width');
                enforceType(h, 'number', 'height');
                return resultFn(privates.feral[prop](x, y, w, h));
              })
            };
          });
        }

        var tameDrawText = Props.markPropMaker(function(env) {
          var prop = env.prop;
          return {
            enumerable: true,
            value: env.amplifying(function(
                privates, text, x, y, maxWidth) {
              enforceType(text, 'string', 'text');
              enforceType(x, 'number', 'x');
              enforceType(y, 'number', 'y');
              switch (arguments.length - 1) {
              case 3:
                privates.feral[prop](text, x, y);
                return;
              case 4:
                enforceType(maxWidth, 'number', 'maxWidth');
                privates.feral[prop](text, x, y, maxWidth);
                return;
              default:
                throw new Error(prop + ' cannot accept ' +
                    (arguments.length - 1) + ' arguments');
              }
            })
          };
        });

        // TODO(kpreid): Consolidate this with tameNoArgEditMethod and friends.
        function tameMethodCustom(baseFunc, dontCheckLength) {
          var expectedLength = baseFunc.length - 1; // remove 'privates' arg
          return Props.markPropMaker(function(env) {
            var prop = env.prop;
            var ampFn = env.amplifying(baseFunc);
            function argCheckingWrapper() {
              if (arguments.length !== expectedLength) {
                throw new Error(env + ' takes ' + expectedLength +
                    ' args, not ' + arguments.length);
              }
              return ampFn.apply(this, arguments);
            }
            return {
              enumerable: true,
              value: dontCheckLength ? ampFn : argCheckingWrapper
            };
          });
        }

        tamingClassTable.registerLazy('TextMetrics', function() {
          function TameTextMetrics(feralMetrics) {
            // TextMetrics just acts as a record, so we don't need any forwarding
            // wrapper; copying the data is sufficient.
            [
              'actualBoundingBoxAscent',
              'actualBoundingBoxDescent',
              'actualBoundingBoxLeft',
              'actualBoundingBoxRight',
              'alphabeticBaseline',
              'emHeightAscent',
              'emHeightDescent',
              'fontBoundingBoxAscent',
              'fontBoundingBoxDescent',
              'hangingBaseline',
              'ideographicBaseline',
              'width'
            ].forEach(function(prop) {
              this[prop] = +feralMetrics[prop];
            }, this);
            Object.freeze(this);
          }
          inertCtor(TameTextMetrics, Object);
          return cajaVM.def(TameTextMetrics);
        });

        tamingClassTable.registerLazy('CanvasRenderingContext2D', function() {
          // http://dev.w3.org/html5/2dcontext/
          // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#2dcontext
          var TameContext2DConf = new Confidence('TameContext2D');
          function TameContext2D(feralContext, policy) {
            // policy is needed for the PropertyTaming accessors
            TameContext2DConf.confide(this, taming);
            TameContext2DConf.amplify(this, function(privates) {
              privates.feral = feralContext;
              privates.policy = policy;
              Object.preventExtensions(privates);
            });
          }
          inertCtor(TameContext2D, Object);
          // TODO(kpreid): have inertCtor automatically install an appropriate
          // toString method.
          TameContext2D.prototype.toString = cajaVM.constFunc(function() {
            return '[domado object CanvasRenderingContext2D]';
          });
          Props.define(TameContext2D.prototype, TameContext2DConf, {
            save: tameNoArgOp,
            restore: tameNoArgOp,

            scale: tameFloatsOp(2),
            rotate: tameFloatsOp(1),
            translate: tameFloatsOp(2),
            transform: tameFloatsOp(6),
            setTransform: tameFloatsOp(6),
            // TODO(kpreid): whatwg has resetTransform

            createLinearGradient: tameMethodCustom(
                function(privates, x0, y0, x1, y1) {
              enforceType(x0, 'number', 'x0');
              enforceType(y0, 'number', 'y0');
              enforceType(x1, 'number', 'x1');
              enforceType(y1, 'number', 'y1');
              return new (tamingClassTable.getTamingCtor('CanvasGradient'))(
                  privates.feral.createLinearGradient(x0, y0, x1, y1));
            }),

            createRadialGradient: tameMethodCustom(
                function(privates, x0, y0, r0, x1, y1, r1) {
              enforceType(x0, 'number', 'x0');
              enforceType(y0, 'number', 'y0');
              enforceType(r0, 'number', 'r0');
              enforceType(x1, 'number', 'x1');
              enforceType(y1, 'number', 'y1');
              enforceType(r1, 'number', 'r1');
              return new (tamingClassTable.getTamingCtor('CanvasGradient'))(
                privates.feral.createRadialGradient(x0, y0, r0, x1, y1, r1));
            }),

            createPattern: tameMethodCustom(
                function(privates, imageElement, repetition) {
              // Consider what policy to have wrt reading the pixels from image
              // elements before implementing this.
              throw new Error(
                  'Domado: canvas createPattern not yet implemented');
            }),

            clearRect:  tameRectMethod(function() {}),
            fillRect:   tameRectMethod(function() {}),
            strokeRect: tameRectMethod(function() {}),

            beginPath: tameNoArgOp,
            closePath: tameNoArgOp,
            moveTo: tameFloatsOp(2),
            lineTo: tameFloatsOp(2),
            quadraticCurveTo: tameFloatsOp(4),
            bezierCurveTo: tameFloatsOp(6),
            arcTo: tameFloatsOp(5),
            // TODO(kpreid): whatwg adds 2 optional args to arcTo
            rect: tameFloatsOp(4),
            arc: tameMethodCustom(function(
                privates, x, y, radius, startAngle, endAngle, anticlockwise) {
              enforceType(x, 'number', 'x');
              enforceType(y, 'number', 'y');
              enforceType(radius, 'number', 'radius');
              enforceType(startAngle, 'number', 'startAngle');
              enforceType(endAngle, 'number', 'endAngle');
              anticlockwise = anticlockwise || false;
              enforceType(anticlockwise, 'boolean', 'anticlockwise');
              privates.feral.arc(
                  x, y, radius, startAngle, endAngle, anticlockwise);
            }),

            // TODO(kpreid): Path objects for filling/stroking
            fill: tameNoArgOp,
            stroke: tameNoArgOp,
            clip: tameNoArgOp,

            // TODO(kpreid): Generic type-checking wrapper to eliminate the need
            // for this code
            // TODO(kpreid): implement spec'd optional args
            isPointInPath: tameMethodCustom(function(privates, x, y) {
              enforceType(x, 'number', 'x');
              enforceType(y, 'number', 'y');
              return enforceType(privates.feral.isPointInPath(x, y), 'boolean');
            }),

            fillText: tameDrawText,
            strokeText: tameDrawText,

            measureText: tameMethodCustom(function(privates, string) {
              enforceType(string, 'string', 'measureText argument');
              return new (tamingClassTable.getTamingCtor('TextMetrics'))(
                  privates.feral.measureText(string));
            }),

            drawImage: tameMethodCustom(function(privates, imageElement) {
              // TODO(kpreid): Implement. Original concern was reading image
              // data, but Caja's general policy is NOT to reimplement
              // same-origin restrictions.
              throw new Error('Domado: canvas drawImage not yet implemented');
            }),

            createImageData: tameMethodCustom(function(privates, sw, sh) {
              enforceType(sw, 'number', 'sw');
              enforceType(sh, 'number', 'sh');
              // TODO(kpreid): taming membrane? or is this best considered a
              // copy?
              return new (tamingClassTable.getTamingCtor('ImageData'))(
                  privates.feral.createImageData(sw, sh));
            }),
            getImageData: tameRectMethod(function(image) {
              return new (tamingClassTable.getTamingCtor('ImageData'))(image);
            }),
            putImageData: tameMethodCustom(function(privates,
                tameImageData, dx, dy, dirtyX, dirtyY, dirtyWidth,
                dirtyHeight) {
              tameImageData = TameImageDataT.coerce(tameImageData);
              enforceFinite(dx, 'dx');
              enforceFinite(dy, 'dy');
              switch (arguments.length - 1) {
              case 3:
                dirtyX = 0;
                dirtyY = 0;
                dirtyWidth = tameImageData.width;
                dirtyHeight = tameImageData.height;
                break;
              case 7:
                enforceFinite(dirtyX, 'dirtyX');
                enforceFinite(dirtyY, 'dirtyY');
                enforceFinite(dirtyWidth, 'dirtyWidth');
                enforceFinite(dirtyHeight, 'dirtyHeight');
                break;
              default:
                throw 'putImageData cannot accept ' + (arguments.length - 1) +
                    ' arguments';
              }
              TameImageDataConf.amplify(tameImageData, function(imageDataPriv) {
                imageDataPriv.writeback();
                privates.feral.putImageData(imageDataPriv.feral,
                    dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
              });
            }, true)
          });
          var CP_STYLE = Props.markPropMaker(function(env) {
            var prop = env.prop;
            return {
              enumerable: true,
              get: env.amplifying(function(privates) {
                var value = privates.feral[prop];
                if (typeof(value) === 'string') {
                  return canonColor(value);
                } else if (cajaVM.passesGuard(TameGradientT,
                                              taming.tame(value))) {
                  return taming.tame(value);
                } else {
                  throw new Error('Internal: Can\'t tame value ' + value +
                      ' of ' + prop);
                }
              }),
              set: env.amplifying(function(privates, newValue) {
                var safeColor = sanitizeColor(newValue);
                if (safeColor !== '') {
                  privates.feral[prop] = safeColor;
                } else if (typeof(newValue) === 'object' &&
                           cajaVM.passesGuard(TameGradientT, newValue)) {
                  privates.feral[prop] = taming.untame(newValue);
                } // else do nothing
                return newValue;
              })
            };
          });
          Props.define(TameContext2D.prototype, TameContext2DConf, {
            // We filter the values supplied to setters in case some browser
            // extension makes them more powerful, e.g. containing scripting or
            // a URL.
            // TODO(kpreid): Do we want to filter the *getters* as well?
            // Scenarios: (a) canvas shared with innocent code, (b) browser
            // quirks?? If we do, then what should be done with a bad value?
            globalAlpha: PT.RWCond(
                function (v) { return typeof v === 'number' &&
                                      0.0 <= v && v <= 1.0;     }),
            globalCompositeOperation: PT.RWCond(
                StringTest([
                  'source-atop',
                  'source-in',
                  'source-out',
                  'source-over',
                  'destination-atop',
                  'destination-in',
                  'destination-out',
                  'destination-over',
                  'lighter',
                  'copy',
                  'xor'
                ])),
            strokeStyle: CP_STYLE,
            fillStyle: CP_STYLE,
            lineWidth: PT.RWCond(
                function (v) { return typeof v === 'number' &&
                                      0.0 < v && v !== Infinity; }),
            lineCap: PT.RWCond(
                StringTest([
                  'butt',
                  'round',
                  'square'
                ])),
            lineJoin: PT.RWCond(
                StringTest([
                  'bevel',
                  'round',
                  'miter'
                ])),
            miterLimit: PT.RWCond(
                function (v) { return typeof v === 'number' &&
                                      0 < v && v !== Infinity; }),
            shadowOffsetX: PT.RWCond(
                function (v) {
                  return typeof v === 'number' && isFinite(v); }),
            shadowOffsetY: PT.RWCond(
                function (v) {
                  return typeof v === 'number' && isFinite(v); }),
            shadowBlur: PT.RWCond(
                function (v) { return typeof v === 'number' &&
                                      0.0 <= v && v !== Infinity; }),
            shadowColor: Props.markPropMaker(function(env) {
              return {
                enumerable: true,
                // TODO(kpreid): Better tools for deriving descriptors
                get: CP_STYLE(env).get,
                set: PT.filterProp(identity, sanitizeColor)(env).set
              };
            }),

            font: PT.filterProp(identity, sanitizeFont),
            textAlign: PT.RWCond(
                StringTest([
                  'start',
                  'end',
                  'left',
                  'right',
                  'center'
                ])),
            textBaseline: PT.RWCond(
                StringTest([
                  'top',
                  'hanging',
                  'middle',
                  'alphabetic',
                  'ideographic',
                  'bottom'
                ]))
          });
          return cajaVM.def(TameContext2D);
        });

        defineElement({
          domClass: 'HTMLCanvasElement',
          properties: function() { return {
            height: PT.filter(false, identity, false, Number),
            width: PT.filter(false, identity, false, Number),
            getContext: Props.ampMethod(function(privates, contextId) {
              // TODO(kpreid): We can refine this by adding policy checks to the
              // canvas taming, which allow getImageData and so on but not any
              // drawing. Not bothering to do that for now; if you have a use
              // for it let us know.
              privates.policy.requireEditable();

              enforceType(contextId, 'string', 'contextId');
              switch (contextId) {
                case '2d':
                  var feralContext = privates.feral.getContext('2d');
                  var TameContext = tamingClassTable.getTamingCtor(
                      'CanvasRenderingContext2D');
                  if (!taming.hasTameTwin(feralContext)) {
                    taming.tamesTo(feralContext, cajaVM.def(new TameContext(
                        feralContext, privates.policy)));
                  }
                  return taming.tame(feralContext);
                default:
                  // http://dev.w3.org/html5/spec/the-canvas-element.html#the-canvas-element
                  // "If contextId is not the name of a context supported by the
                  // user agent, return null and abort these steps."
                  return null;
              }
            }),
            toDataURL: Props.ampMethod(function(privates, opt_type, opt_arg) {
              if (opt_type !== undefined) {
                opt_type = String(opt_type).toLowerCase();
              }
              // Whitelist of types to be cautious, and because we need
              // to sanitize the varargs
              switch (opt_type) {
                case 'image/png':
                  return privates.feral.toDataURL('image/png');
                case 'image/jpeg':
                  return privates.feral.toDataURL('image/jpeg', +opt_arg);
                default:
                  console.warn('Domado: Discarding unrecognized MIME type ' +
                      opt_type + ' for canvas.toDataURL.');
                  /* fall through */
                case undefined:
                  return privates.feral.toDataURL();
              }
            })
          }; }
        });
      })();

      defineTrivialElement('HTMLDListElement');
      defineTrivialElement('HTMLDivElement');

      function FormElementProxyHandler(target) {
        CollectionProxyHandler.call(this, target);
      }
      FormElementProxyHandler.domadoProxyInit = cajaVM.constFunc(
          function(proxy, handler) {
        var TameFormElementConf = elementCtorConfidences.get(
            tamingClassTable.getTamingCtor('HTMLFormElement'));

        // TODO(kpreid): this is ugly
        [TameNodeConf, TameBackedNodeConf, TameElementConf, TameFormElementConf]
            .forEach(function(c) {
          c.confide(proxy, taming, handler.target);
        });
      });
      inherit(FormElementProxyHandler, CollectionProxyHandler);
      Props.define(FormElementProxyHandler.prototype, null, {
        toString: Props.overridable(false, function() {
          return '[FormElementProxyHandler]';
        }),
        col_lookup: Props.overridable(true, cajaVM.constFunc(function(name) {
          // using less specific but readily available TameElementConf because
          // this.target is reliably a form element
          return TameElementConf.amplify(this.target, function(privates) {
            return privates.feral.elements.namedItem(name);
          });
        })),
        col_evaluate: Props.overridable(true, cajaVM.constFunc(
            function(nodeOrList) {
          if (taming.hasTameTwin(nodeOrList)) {
            return taming.tame(nodeOrList);
          } else if ('nodeType' in nodeOrList) {
            return defaultTameNode(nodeOrList);
          } else if ('length' in nodeOrList) {
            var tameList = new TameNodeList(nodeOrList, defaultTameNode);
            taming.tamesTo(nodeOrList, tameList);
            return tameList;
          } else {
            throw new Error('could not interpret form.elements result');
          }
        })),
        col_names: Props.overridable(true, cajaVM.constFunc(function() {
          // TODO(kpreid): verify whether result set is appropriate
          // Note using keys rather than gOPN, because if we returned 'length'
          // here it would be a duplicate, but it's conveniently filtered out
          // by keys() because it is non-enumerable.
          return Object.keys(this.target.elements);
        }))
      });
      cajaVM.def(FormElementProxyHandler);

      defineElement({
        domClass: 'HTMLFormElement',
        proxyType: FormElementProxyHandler,
        construct: function(privates) {
          // Must be a value property because ES5/3 does not allow .length
          // accessors.
          // TODO(kpreid): Detect and use an accessor on ES5.
          // TODO(kpreid): Review whether this and .elements are doing the best
          // they can WRT liveness.
          Object.defineProperty(this, "length", {
            value: privates.feral.length
          });
        },
        properties: function() { return {
          action: PT.filterAttr(defaultToEmptyStr, String),
          elements: PT.TameMemoIf(false, function(privates, f) {
            // TODO(kpreid): make tameHTMLCollection live-capable
            return tameHTMLCollection(f, defaultTameNode);
          }),
          enctype: PT.filterAttr(defaultToEmptyStr, String),
          encoding: Props.actAs('enctype',
              PT.filterAttr(defaultToEmptyStr, String)),
          method: PT.filterAttr(defaultToEmptyStr, String),
          target: PT.filterAttr(defaultToEmptyStr, String),
          submit: Props.ampMethod(function(privates) {
            // TODO(felix8a): need to test handlingUserAction.
            privates.policy.requireEditable();
            return domicile.handlingUserAction && privates.feral.submit();
          }),
          reset: Props.ampMethod(function(privates) {
            privates.policy.requireEditable();
            return privates.feral.reset();
          })
        }; }
      });

      defineTrivialElement('HTMLHeadingElement');
      defineTrivialElement('HTMLHRElement');

      defineElement({
        virtualized: true,
        domClass: 'HTMLHeadElement'
      });

      defineElement({
        virtualized: true,
        domClass: 'HTMLHtmlElement'
      });

      defineElement({
        domClass: 'HTMLIFrameElement',
        construct: function(privates) {
          privates.contentDomicile = undefined;
          privates.seenContentDocument = undefined;
        },
        properties: function() { return {
          align: Props.ampAccessor(
            function(privates) {
              return privates.feral.align;
            },
            function(privates, alignment) {
              privates.policy.requireEditable();
              alignment = String(alignment);
              if (alignment === 'left' ||
                  alignment === 'right' ||
                  alignment === 'center') {
                privates.feral.align = alignment;
              }
            }
          ),
          frameBorder: Props.ampAccessor(
            function(privates) {
              return privates.feral.frameBorder;
            },
            function(privates, border) {
              privates.policy.requireEditable();
              border = String(border).toLowerCase();
              if (border === '0' || border === '1' ||
                  border === 'no' || border === 'yes') {
                privates.feral.frameBorder = border;
              }
            }
          ),
          height: PT.filterProp(identity, Number),
          width:  PT.filterProp(identity, Number),
          src: PT.filterAttr(identity, identity), // rewrite handled for attr
          name: PT.filterAttr(identity, identity), // rejection handled for attr
          contentDocument: {
            enumerable: true,
            get: cajaVM.constFunc(function() {
              return contentDomicile(this).document;
            })
          },
          contentWindow: {
            enumerable: true,
            get: cajaVM.constFunc(function() {
              return contentDomicile(this).window;
            })
          }
        }; }
      });
      function contentDomicile(tameIFrame) {
        // TODO(kpreid): Once we support loading content via src=, we will need
        // to consider whether this should always allow access to said content,
        // and probably other issues.

        // TODO(kpreid): memoize this lookup?
        var TameIFrameConf = elementCtorConfidences.get(
            tamingClassTable.getTamingCtor('HTMLIFrameElement'));
        return TameIFrameConf.amplify(tameIFrame, function(privates) {
          var frameFeralDoc = privates.feral.contentDocument;
          if (!privates.contentDomicile ||
              frameFeralDoc !== privates.seenContentDocument) {
            if (!frameFeralDoc) {
              return {document: null, window: null};
            }

            var subDomicile = privates.contentDomicile = attachDocument(
                '-caja-iframe___', naiveUriPolicy, frameFeralDoc,
                optTargetAttributePresets, taming, addImports);
            privates.seenContentDocument = frameFeralDoc;

            // Replace document structure with virtualized forms
            // TODO(kpreid): Use an alternate HTML schema (requires refactoring)
            // which makes <html> <head> <body> permitted (in particular,
            // non-opaque) so that this is unnecessary.
            var tdoc = subDomicile.document;
            var child;
            while ((child = tdoc.lastChild)) {
              tdoc.removeChild(child);
            }
            // Creating HtmlEmitter hooks up document.write, and finish() (i.e.
            // end-of-file, i.e. an empty-string input document) triggers
            // construction of the virtualized global structure.
            var emitter = new HtmlEmitter(subDomicile.htmlEmitterTarget,
                naiveUriPolicy.mitigate, subDomicile);
            emitter.finish();
          }
          return privates.contentDomicile;
        });
      }

      var featureTestImage = document.createElement('img');
      defineElement({
        domClass: 'HTMLImageElement',
        properties: function() { return {
          alt: PT.filterProp(String, String),
          height: PT.filterProp(Number, Number),
          src: PT.filter(false, String, true, identity),
          width: PT.filterProp(Number, Number),
          naturalHeight: Props.cond('naturalHeight' in featureTestImage,
              PT.filterProp(Number, Number)),
          naturalWidth: Props.cond('naturalWidth' in featureTestImage,
              PT.filterProp(Number, Number)),
          complete: Props.cond('complete' in featureTestImage,
              PT.filterProp(Boolean, Boolean))
        }; }
      });
      // Per https://developer.mozilla.org/en-US/docs/DOM/Image as of 2012-09-24
      namedConstructors.Image = innocuous(function ImageCtor(width, height) {
        var element = tameDocument.createElement('img');
        if (width !== undefined) { element.width = width; }
        if (height !== undefined) { element.height = height; }
        return element;
      });

      // Common supertype just to save some code -- does not correspond to real
      // HTML, but should be harmless. Ideally we wouldn't export this.
      function toInt(x) { return x | 0; }
      defineElement({
        domClass: 'CajaFormField',
        properties: function() { return {
          autofocus: NP_reflectBoolean,
          disabled: NP_reflectBoolean,
          form: PT.related,
          maxLength: PT.rw,
          name: PT.rw,
          value: PT.filter(
            false, function (x) { return x == null ? null : String(x); },
            false, function (x) { return x == null ? '' : '' + x; })
        }; }
      });

      defineElement({
        superclass: 'CajaFormField',
        domClass: 'HTMLInputElement',
        properties: function() { return {
          checked: PT.filterProp(identity, Boolean),
          defaultChecked: PT.rw,
          defaultValue: PT.filter(
            false, function (x) { return x == null ? null : String(x); },
            false, function (x) { return x == null ? '' : '' + x; }),
          min: PT.rw,
          max: PT.rw,
          readOnly: PT.rw,
          selectedIndex: PT.filterProp(identity, toInt),
          size: PT.rw,
          step: PT.rw,
          type: PT.rw,
          valueAsNumber: PT.rw,
          select: NP_noArgEditVoidMethod,
          stepDown: NP_noArgEditVoidMethod,
          stepUp: NP_noArgEditVoidMethod
        }; }
      });

      defineElement({
        superclass: 'CajaFormField',
        domClass: 'HTMLButtonElement',
        properties: function() { return {
          // On Safari, the .type property is not writable, so use setAttribute
          // for consistency.
          type: PT.filter(false, String, true, String)
        }; }
      });

      defineElement({
        superclass: 'CajaFormField',
        domClass: 'HTMLSelectElement',
        properties: function() { return {
          multiple: PT.rw,
          options: PT.TameMemoIf(nodeListsAreLive,
              function(privates, f) {
            return new TameOptionsList(f, defaultTameNode, 'name');
          }),
          selectedIndex: PT.filterProp(identity, toInt),
          type: PT.ro
        }; }
      });

      defineElement({
        superclass: 'CajaFormField',
        domClass: 'HTMLTextAreaElement',
        properties: function() { return {
          type: PT.rw
        }; }
      });

      defineElement({
        domClass: 'HTMLLabelElement',
        properties: function() { return {
          htmlFor: Props.actAs('for', PT.filterAttr(identity, identity))
        }; }
      });

      defineElement({
        domClass: 'HTMLMediaElement',
        properties: function() { return {
          // TODO(kpreid): audioTracks taming
          autoplay: NP_writePolicyOnly,
          // TODO(kpreid): buffered (TimeRanges) taming
          // TODO(kpreid): controller (MediaController) taming
          controls: NP_writePolicyOnly,
          crossOrigin: NP_writePolicyOnly,
          currentSrc: PT.ro,
          currentTime: PT.ro,
          defaultMuted: Props.ampAccessor(
            // TODO: express this generically
            function(privates) {
              return privates.feral.defaultMuted;
            },
            function(privates, value) {
              if (value) {
                this.setAttribute('muted', '');
              } else {
                this.removeAttribute('muted');
              }
            }
          ),
          defaultPlaybackRate: PT.filterProp(identity, Number),
          duration: PT.ro,
          ended: PT.ro,
          // TODO(kpreid): error (MediaError) taming
          loop: NP_writePolicyOnly,
          mediaGroup: PT.filterAttr(identity, identity),  // rewritten like id
          muted: PT.ro,  // TODO(kpreid): Pending policy about guest audio
          networkState: PT.ro,
          paused: PT.ro,
          playbackRate: PT.filterProp(identity, Number),
          // TODO(kpreid): played (TimeRanges) taming
          preload: NP_writePolicyOnly,
          readyState: PT.ro,
          // TODO(kpreid): seekable (TimeRanges) taming
          seeking: PT.ro,
          src: NP_writePolicyOnly,
          // TODO(kpreid): textTracks (TextTrackList) taming
          // TODO(kpreid): videoTracks (VideoTrackList) taming
          volume: PT.ro,  // TODO(kpreid): Pending policy about guest audio
          canPlayType: Props.ampMethod(function(privates, type) {
            return String(privates.feral.canPlayType(String(type)));
          }),
          // fastSeek is in spec but not yet in browsers
          //fastSeek: Props.ampMethod(function(privates, time) {
          //  // TODO(kpreid): Use generic taming like canvas does
          //  privates.policy.requireEditable();
          //  privates.feral.fastSeek(+time);
          //}),
          load: NP_noArgEditVoidMethod,
          pause: NP_noArgEditVoidMethod,
          play: Props.ampMethod(function(privates, time) {
            // TODO(kpreid): Better programmatic control approach
            if (domicile.handlingUserAction) {
              privates.feral.play();
            }
          })
        }; }
      });

      defineElement({
        domClass: 'HTMLOptGroupElement',
        properties: function() { return {
          disabled: NP_reflectBoolean,
          label: NP_writePolicyOnly
        }; }
      });

      defineElement({
        domClass: 'HTMLOptionElement',
        properties: function() { return {
          defaultSelected: PT.filterProp(Boolean, Boolean),
          disabled: NP_reflectBoolean,
          form: PT.related,
          index: PT.filterProp(Number),
          label: PT.filterProp(String, String),
          selected: PT.filterProp(Boolean, Boolean),
          text: PT.filterProp(String, String),
          // TODO(kpreid): Justify these specialized filters.
          value: PT.filterProp(
            function (x) { return x == null ? null : String(x); },
            function (x) { return x == null ? '' : '' + x; })
        }; }
      });
      // Per https://developer.mozilla.org/en-US/docs/DOM/Option
      // as of 2012-09-24
      namedConstructors.Option = innocuous(function OptionCtor(
          text, value, defaultSelected, selected) {
        var element = tameDocument.createElement('option');
        if (text !== undefined) { element.text = text; }
        if (value !== undefined) { element.value = value; }
        if (defaultSelected !== undefined) {
          element.defaultSelected = defaultSelected;
        }
        if (selected !== undefined) { element.selected = selected; }
        return element;
      });

      defineTrivialElement('HTMLParagraphElement');
      defineTrivialElement('HTMLPreElement');

      function dynamicCodeDispatchMaker(privates) {
        window.cajaDynamicScriptCounter =
          window.cajaDynamicScriptCounter ?
            window.cajaDynamicScriptCounter + 1 : 0;
        var name = "caja_dynamic_script" +
          window.cajaDynamicScriptCounter + '___';
        window[name] = function() {
          try {
            if (privates.scriptSrc &&
              'function' === typeof domicile.evaluateUntrustedExternalScript) {
              // Per HTML5 spec (2013-02-08), execution time (now) is when the
              // relative URL is resolved, not e.g. setAttribute time.
              domicile.evaluateUntrustedExternalScript(
                  URI.utils.resolve(domicile.pseudoLocation.href,
                      privates.scriptSrc),
                  privates.feral);  // load/error events are fired on this node
            }
          } finally {
            window[name] = undefined;
          }
        };
        return name + "();";
      }

      // General hook in document.createElement which currently only applies to
      // <script>s; keeping it simple till we need more generality.
      var postInitCreatedElement =
          TameElementConf.amplifying(function(privates) {
        if (privates.feral.tagName === 'SCRIPT') {
          privates.feral.appendChild(
            document.createTextNode(
              dynamicCodeDispatchMaker(privates)));
        }
      });

      defineElement({
        domClass: 'HTMLScriptElement',
        forceChildrenNotEditable: true,  // critical to script isolation
        construct: function(privates) {
          privates.scriptSrc = undefined;
          // See also postInitCreatedElement, which initializes
          // document.createElement'd scripts for src loading
        },
        properties: function() { return {
          src: NP_writePolicyOnly,
          setAttribute: Props.ampMethod(function(privates, attrib, value) {
            var feral = privates.feral;
            privates.policy.requireEditable();
            TameElement.prototype.setAttribute.call(this, attrib, value);
            var attribName = String(attrib).toLowerCase();
            if ("src" === attribName) {
              privates.scriptSrc = String(value);
            }
          })
        }; }
      });

      defineTrivialElement('HTMLSpanElement');

      defineElement({
        domClass: 'HTMLStyleElement',
        forceChildrenNotEditable: true,  // critical to style isolation
        properties: function() {
          var styleForFeatureTests = document.createElement('style');
          return {
            disabled: NP_reflectBoolean,
            media: NP_writePolicyOnly,
            scoped: Props.cond('scoped' in styleForFeatureTests,
                PT.filterProp(identity, Boolean)),
            // TODO(kpreid): property 'sheet'
            type: PT.ro
          };
        }
      });

      defineElement({
        domClass: 'HTMLTableColElement',
        properties: function() { return {
          align: PT.filterProp(identity, identity),
          vAlign: PT.filterProp(identity, identity)
        }; }
      });

      defineTrivialElement('HTMLTableCaptionElement');

      defineElement({
        domClass: 'HTMLTableCellElement',
        properties: function() { return {
          colSpan: PT.filterProp(identity, identity),
          rowSpan: PT.filterProp(identity, identity),
          cellIndex: PT.ro,
          noWrap: PT.filterProp(identity, identity) // HTML5 Obsolete
        }; }
      });
      defineElement({
        superclass: 'HTMLTableCellElement',
        domClass: 'HTMLTableDataCellElement'
      });
      defineElement({
        superclass: 'HTMLTableCellElement',
        domClass: 'HTMLTableHeaderCellElement'
      });

      function requireIntIn(idx, min, max) {
        if (idx !== (idx | 0) || idx < min || idx > max) {
          throw new Error(INDEX_SIZE_ERROR);
        }
      }

      defineElement({
        domClass: 'HTMLTableRowElement',
        properties: function() { return {
          // TODO(kpreid): Arrange so there are preexisting functions to pass
          // into TameMemoIf rather than repeating this inline stuff.
          cells: PT.TameMemoIf(nodeListsAreLive,
              function(privates, feralList) {
            return new TameNodeList(feralList, defaultTameNode);
          }),
          rowIndex: PT.ro,
          sectionRowIndex: PT.ro,
          insertCell: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.cells.length);
            return defaultTameNode(
                privates.feral.insertCell(index),
                privates.editable);
          }),
          deleteCell: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.cells.length);
            privates.feral.deleteCell(index);
          })
        }; }
      });

      defineElement({
        domClass: 'HTMLTableSectionElement',
        properties: function() { return {
          rows: PT.TameMemoIf(nodeListsAreLive,
              function(privates, feralList) {
            return new TameNodeList(feralList, defaultTameNode);
          }),
          insertRow: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.rows.length);
            return defaultTameNode(privates.feral.insertRow(index));
          }),
          deleteRow: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.rows.length);
            privates.feral.deleteRow(index);
          })
        }; }
      });

      defineElement({
        // nonstandard but sound
        superclass: 'HTMLTableSectionElement',
        domClass: 'HTMLTableElement',
        properties: function() { return {
          tBodies: PT.TameMemoIf(nodeListsAreLive,
              function(privates, f) {
            if (privates.policy.childrenVisible) {
              return new TameNodeList(f, defaultTameNode);
            } else {
              return fakeNodeList([], 'NodeList');
            }
          }),
          tHead: NP_tameDescendant,
          tFoot: NP_tameDescendant,
          cellPadding: PT.filterAttr(Number, fromInt),
          cellSpacing: PT.filterAttr(Number, fromInt),
          border:      PT.filterAttr(Number, fromInt),
          createTHead: NP_noArgEditMethodReturningNode,
          deleteTHead: NP_noArgEditVoidMethod,
          createTFoot: NP_noArgEditMethodReturningNode,
          deleteTFoot: NP_noArgEditVoidMethod,
          createCaption: NP_noArgEditMethodReturningNode,
          deleteCaption: NP_noArgEditVoidMethod,
          insertRow: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.rows.length);
            return defaultTameNode(privates.feral.insertRow(index));
          }),
          deleteRow: Props.ampMethod(function(privates, index) {
            privates.policy.requireEditable();
            requireIntIn(index, -1, privates.feral.rows.length);
            privates.feral.deleteRow(index);
          })
        }; }
      });

      defineElement({
        virtualized: true,
        domClass: 'HTMLTitleElement'
      });

      defineTrivialElement('HTMLUListElement');

      defineElement({
        virtualized: null,
        domClass: 'HTMLUnknownElement'
      });

      defineElement({
        superclass: 'HTMLMediaElement',
        domClass: 'HTMLVideoElement',
        properties: function() { return {
          height: PT.rw,
          width: PT.rw,
          poster: PT.filterAttr(identity, identity),
          videoHeight: PT.rw,
          videoWidth: PT.rw
        }; }
      });

      // We are now done with all of the specialized element taming classes.

      // Taming of Events:

      // coerce null and false to 0
      function fromInt(x) { return '' + (x | 0); }

      function tameEvent(event) {
        if (!taming.hasTameTwin(event)) {
          var tamed = new (tamingClassTable.getTamingCtor('Event'))(
              event, false);
          taming.tamesTo(event, tamed);
        }
        return taming.tame(event);
      }

      tamingClassTable.registerLazy('Touch', function() {
        /**
         * Taming of touch record objects for touch events.
         */
        function TameTouch(feral) {
          // Touch objects are read-only records, so we can just copy
          this.identifier = +feral.identifier;
          this.screenX = +feral.screenX;
          this.screenY = +feral.screenY;
          this.clientX = +feral.clientX;
          this.clientY = +feral.clientY;
          this.pageX = +feral.pageX;
          this.pageY = +feral.pageY;
          this.radiusX = +feral.radiusX;
          this.radiusY = +feral.radiusY;
          this.rotationAngle = +feral.rotationAngle;
          this.force = +feral.force;
          this.target = tameRelatedNode(feral.target);
          Object.freeze(this);
        }
        inertCtor(TameTouch, Object);
        return cajaVM.def(TameTouch);  // and defend its prototype
      });

      tamingClassTable.registerLazy('TouchList', function() {
        var TameTouch = tamingClassTable.getTamingCtor('Touch');

        var TameTouchListConf = new Confidence('TameTouchList');
        /**
         * Taming of TouchList type for touch events.
         * These are immutable and so we do not need any NodeList-like magic.
         */
        function TameTouchList(feralList) {
          var length = feralList.length;
          this.length = length;
          for (var i = 0; i < length; i++) {
            var feralTouch = feralList.item(i);
            var tamedTouch = new TameTouch(feralTouch);
            taming.tamesTo(feralTouch, tamedTouch);
            this[i] = tamedTouch;
          }
          TameTouchListConf.confide(this, taming);
          TameTouchListConf.amplify(this, function(privates) {
            privates.feral = feralList;
          });
          Object.freeze(this);
        }
        inertCtor(TameTouchList, Object);
        Props.define(TameTouchList.prototype, TameTouchListConf, {
          // TODO(kpreid): documented in MDN, but not in linked standard; get
          // better reference for correct behavior.
          identifiedTouch: Props.ampMethod(function(privates, id) {
            id = +id;
            var feralTouch = privates.feral.identifiedTouch(id);
            if (!feralTouch) { return null; }  // TODO(kpreid): proper value?
            if (!taming.hasTameTwin(feralTouch)) {
              throw new Error('can\'t happen: untamed Touch object');
            }
            return taming.tame(feralTouch);
          }),
          item: Props.plainMethod(function(index) {
            return this[+index];
          })
        });
        return cajaVM.def(TameTouchList);  // and defend its prototype
      });

      tamingClassTable.registerLazy('Event', function() {
        function eventVirtualizingAccessor(fn) {
          return Props.addOverride(Props.ampGetter(fn));
        }

        function P_e_view(transform) {
          return Props.addOverride(PT.ROView(transform));
        }

        var featureTestKeyEvent = {};
        try {
          featureTestKeyEvent = document.createEvent('KeyboardEvent');
        } catch (e) {}

        function tameEventView(view) {
          if (view === window) {
            return tameWindow;
          } else if (view === null || view === undefined) {
            return view;
          } else {
            if (typeof console !== 'undefined') {
              console.warn('Domado: Discarding unrecognized feral view value:',
                  view);
            }
            return null;
          }
        }
        function untameEventView(view) {
          if (view === tameWindow) {
            return window;
          } else if (view === null || view === undefined) {
            return view;
          } else {
            if (typeof console !== 'undefined') {
              console.warn('Domado: Discarding unrecognized guest view value:',
                  view);
            }
            return null;
          }
        }

        /**
         * Helper for init*Event.
         * 'method' is relied on. 'args' should be untamed.
         */
        function tameInitSomeEvent(
            privates, method, type, bubbles, cancelable, args) {
          if (privates.notYetDispatched) {
            bridal.initEvent(
                privates.feral, method, type, bubbles, cancelable, args);
          } else {
            // Do nothing. This prevents guests using initEvent to mutate
            // browser-generated events that will be seen by the host.
            // It also matches browser behavior (Chrome and FF, as of 2013-01-07),
            // because they have initEvent do nothing if the event has already
            // been dispatched, but we don't want to rely on that for security,
            // and bridal's initEvent emulation for IE does not have that
            // property.
          }
        }

        // Note: Per MDN the touch event properties are read-only, so we
        // shouldn't be doing addOverride, but we also apply them to _all_
        // events rather than having a TouchEvent subtype, so this is more
        // compatible (if e.g. an application is constructing synthetic events).
        // It also avoids putting a special case in testEventMutation.
        var touchListProp = Props.addOverride(PT.TameMemoIf(true,
            function(privates, feralList) {
          if (!feralList) {  // applied to a non-TouchEvent
            return undefined;
          } else {
            return new (tamingClassTable.getTamingCtor('TouchList'))(feralList);
          }
        }));

        function TameEvent(event, isSyntheticEvent) {
          assert(!!event);
          TameEventConf.confide(this, taming);
          eventAmplify(this, function(privates) {
            privates.feral = event;
            privates.notYetDispatched = isSyntheticEvent;
            Object.preventExtensions(privates);
          });
          return this;
        }
        inertCtor(TameEvent, Object);
        Props.define(TameEvent.prototype, TameEventConf, {
          eventPhase: P_e_view(Number),
          type: P_e_view(function(type) {
            return bridal.untameEventType(String(type));
          }),
          bubbles: P_e_view(Boolean),
          cancelable: P_e_view(Boolean),
          view: P_e_view(tameEventView),
          target: eventVirtualizingAccessor(function(privates) {
            var event = privates.feral;
            return tameEventTarget(event.target || event.srcElement);
          }),
          srcElement: P_e_view(tameRelatedNode),
          currentTarget: P_e_view(tameEventTarget),
          relatedTarget: eventVirtualizingAccessor(function(privates) {
            var e = privates.feral;
            var t = e.relatedTarget;
            if (!t) {
              if (e.type === 'mouseout') {
                t = e.toElement;
              } else if (e.type === 'mouseover') {
                t = e.fromElement;
              }
            }
            return tameEventTarget(t);
          }),
          fromElement: P_e_view(tameRelatedNode),
          toElement: P_e_view(tameRelatedNode),
          detail: P_e_view(Number),
          pageX: P_e_view(Number),
          pageY: P_e_view(Number),
          altKey: P_e_view(Boolean),
          ctrlKey: P_e_view(Boolean),
          metaKey: P_e_view(Boolean),
          shiftKey: P_e_view(Boolean),
          button: P_e_view(function (v) { return v && Number(v); }),
          clientX: P_e_view(Number),
          clientY: P_e_view(Number),
          screenX: P_e_view(Number),
          screenY: P_e_view(Number),
          which: P_e_view(function (v) { return v && Number(v); }),
          location: P_e_view(Number),  // KeyboardEvent
          keyCode: P_e_view(function(v) { return v && Number(v); }),
          charCode: P_e_view(function(v) { return v && Number(v); }),
          key: Props.cond('key' in featureTestKeyEvent, P_e_view(String)),
          char: Props.cond('char' in featureTestKeyEvent, P_e_view(String)),
          touches: touchListProp,
          targetTouches: touchListProp,
          changedTouches: touchListProp,
          stopPropagation: Props.ampMethod(function(privates) {
            // TODO(mikesamuel): make sure event doesn't propagate to dispatched
            // events for this gadget only.
            // But don't allow it to stop propagation to the container.
            if (privates.feral.stopPropagation) {
              privates.feral.stopPropagation();
            } else {
              privates.feral.cancelBubble = true;
            }
          }),
          preventDefault: Props.ampMethod(function(privates) {
            // TODO(mikesamuel): make sure event doesn't propagate to dispatched
            // events for this gadget only.
            // But don't allow it to stop propagation to the container.
            if (privates.feral.preventDefault) {
              privates.feral.preventDefault();
            } else {
              privates.feral.returnValue = false;
            }
          }),

          initEvent: Props.ampMethod(function(
              privates, type, bubbles, cancelable) {
            tameInitSomeEvent.call(this, privates, 'initEvent', type, bubbles,
                cancelable, []);
          }),
          initUIEvent: Props.ampMethod(function(
              privates, type, bubbles, cancelable, view, detail) {
            tameInitSomeEvent.call(this, privates, 'initUIEvent', type, bubbles,
                cancelable, [untameEventView(view), +detail]);
          }),
          initMouseEvent: Props.ampMethod(function(
            // per MDN
              privates, type, bubbles, cancelable, view, detail, screenX,
              screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey,
              button, relatedTarget) {
            tameInitSomeEvent.call(this, privates, 'initMouseEvent', type,
                bubbles, cancelable, [untameEventView(view), +detail, +screenX,
                +screenY, +clientX, +clientY, Boolean(ctrlKey), Boolean(altKey),
                Boolean(shiftKey), Boolean(metaKey), +button,
                toFeralNode(relatedTarget)]);
          }),
          initKeyEvent: Props.cond(
              'initKeyEvent' in featureTestKeyEvent,
              Props.ampMethod(function(
                  // per MDN
                  privates, type, bubbles, cancelable, view, ctrlKey, altKey,
                  shiftKey, metaKey, keyCode, charCode) {
            tameInitSomeEvent.call(this, privates, 'initKeyEvent', type,
                bubbles, cancelable, [untameEventView(view), Boolean(ctrlKey),
                Boolean(altKey), Boolean(shiftKey), Boolean(metaKey),
                Number(keyCode), Number(charCode)]);
          })),
          initKeyboardEvent: Props.cond(
              'initKeyboardEvent' in featureTestKeyEvent,
              Props.ampMethod(function(
                  // per MDN
                  privates, type, bubbles, cancelable, view, char, key,
                  location, modifiers, repeat, locale) {
            tameInitSomeEvent.call(this, privates, 'initKeyboardEvent', type,
                bubbles, cancelable, [untameEventView(view), String(char),
                String(key), Number(location), String(modifiers),
                Boolean(repeat), String(locale)]);
          })),
          initCustomEvent: Props.ampMethod(function(
              privates, type, bubbles, cancelable, detail) {
            tameInitSomeEvent.call(this, privates, 'initCustomEvent', type,
                bubbles, cancelable, [undefined]);
            // Because the detail is an arbitrary guest value, don't pass it
            // to the host DOM (which would be a membrane breach and which our
            // .detail taming wouldn't let back in), but stash it as a
            // guest-view override just like the guest assigned it.
            // An alternative would be to do
            //    ...initCustomEvent(..., taming.untame(detail));
            // but it is unclear whether that would be the right thing since
            // the taming membrane does not permit all objects.
            this.detail = detail;
          }),

          toString: Props.overridable(false, innocuous(function() {
            return '[domado object Event]';
          }))
        });
        return cajaVM.def(TameEvent);  // and defend its prototype
      });

      // As far as we know, creating any particular event type is harmless; but
      // this whitelist exists to protect against novel extensions which may
      // have unwanted behavior and/or interactions we are not aware of.
      // Note also that our initEvent taming rewrites the event .type, so that
      // e.g. a "click" event is "click_custom___" and will not trigger host
      // event handlers and so on.
      var eventTypeWhitelist = {
        // Info sources:
        // https://developer.mozilla.org/en-US/docs/DOM/document.createEvent#Notes
        // http://www.w3.org/TR/DOM-Level-2-Events/events.html
        'Events': 0, 'Event': 0,
        'UIEvents': 0, 'UIEvent': 0,
        'MouseEvents': 0, 'MouseEvent': 0,
        // omitted MutationEvent, not particularly likely to be desirable
        'HTMLEvents': 0,
        'KeyEvents': 0, 'KeyboardEvent': 0,
        'CustomEvent': 0
      };

      function escapeCSSString(value) {
        // TODO(kpreid): refactor so this isn't duplicated from sanitizecss.js
        return '"' + String(value).replace(/[^\w-]/g, '\\$&') + '"';
      }

      var TameHTMLDocumentConf = TameNodeConf.subtype('TameHTMLDocument');
      function TameHTMLDocument(doc, container, domain) {
        TameNode.call(this, nodePolicyEditable);
        TameHTMLDocumentConf.confide(this, taming);
        TameHTMLDocumentConf.amplify(this, function(privates) {
          privates.feralDoc = doc;
          privates.feralContainerNode = container;
          privates.onLoadListeners = [];
          privates.onDCLListeners = [];

          // protocol for EventTarget operations
          privates.wrappedListeners = [];
          privates.feralEventTarget = container;
          // We use .feralEventTarget rather than .feral here because, even
          // though the feral twin of the tame document is container, because
          // it is not truly a node taming and ordinary node operations should
          // not be effective on the document's feral node.

          // Used to implement operations on the document, never exposed to the
          // guest. Note in particular that we skip defaultTameNode to skip
          // registering it in the taming membrane.
          privates.tameContainerNode =
            finishNode(makeTameNodeByType(container));
        });

        Props.define(this, TameHTMLDocumentConf, {
          domain: P_constant(domain)
        });

        installLocation(this);

        taming.tamesTo(container, this);
      }
      tamingClassTable.registerSafeCtor('Document',
          inertCtor(TameHTMLDocument, TameNode, 'HTMLDocument'));
      var forwardContainerProp = Props.markPropMaker(function(env) {
        var prop = env.prop;
        return Props.ampGetter(function(privates) {
          return privates.tameContainerNode[prop];
        });
      });
      var forwardContainerMethod = Props.markPropMaker(function(env) {
        var prop = env.prop;
        return Props.ampMethod(function(privates, opt1, opt2) {
          return privates.tameContainerNode[prop](opt1, opt2);
        });
      });
      Props.define(TameHTMLDocument.prototype, TameHTMLDocumentConf, {
        nodeType: P_constant(9),
        nodeName: P_constant('#document'),
        nodeValue: P_constant(null),
        firstChild: forwardContainerProp,
        lastChild: forwardContainerProp,
        nextSibling: P_constant(null),
        previousSibling: P_constant(null),
        childNodes: forwardContainerProp,
        attributes: { enumerable: true, get: innocuous(function() {
          return fakeNodeList([], 'HTMLCollection');
        })},
        parentNode: P_constant(null),
        body: {
          enumerable: true,
          get: innocuous(function() {
            // "The body element of a document is the first child of the html
            // element that is either a body element or a frameset element. If
            // there is no such element, it is null."
            // TODO(kpreid): should be internal .documentElement getter only
            var htmlEl = this.documentElement;
            if (!htmlEl) { return null; }
            for (var n = htmlEl.firstChild; n; n = n.nextSibling) {
              if (n.nodeName === 'BODY' || n.nodeName === 'FRAMESET') {
                return n;
              }
            }
            return null;
          }),
          set: innocuous(function(newBody) {
            // "If the new value is not a body or frameset element, then throw a
            // HierarchyRequestError exception and abort these steps."
            newBody = TameNodeT.coerce(newBody);
            if (!(newBody.nodeName === 'BODY' ||
                newBody.nodeName === 'FRAMESET')) {
              // should be HierarchyRequestError
              throw new Error(
                  'Cannot set document.body except to <body> or <frameset>.');
            }
            // "Otherwise, if the new value is the same as the body element, do
            // nothing. Abort these steps."
            // TODO(kpreid): should be internal .body getter only
            var currentBody = this.body;
            if (newBody === currentBody) { return; }
            // "Otherwise, if the body element is not null, then replace that
            // element with the new value in the DOM, as if the root element's
            // replaceChild() method had been called with the new value and the
            // incumbent body element as its two arguments respectively, then
            // abort these steps."
            // TODO(kpreid): should be internal .documentElement getter only
            var htmlEl = this.documentElement;
            if (currentBody !== null) {
              htmlEl.replaceChild(newBody, currentBody);
              return;
            }
            // "Otherwise, if there is no root element, throw a
            // HierarchyRequestError exception and abort these steps."
            if (!htmlEl) {
              // should be HierarchyRequestError
              throw new Error(
                  'Cannot set document.body with no <html>.');
            }
            // "Otherwise, the body element is null, but there's a root element.
            // Append the new value to the root element."
            htmlEl.appendChild(newBody);
          })
        },
        documentElement: {
          enumerable: true,
          get: innocuous(function() {
            var n;
            // In principle, documentElement should be our sole child, but
            // sometimes that gets screwed up, and we end up with more than
            // one child.  Returning something other than the pseudo <html>
            // element will mess up many things, so we first try finding
            // the <html> element
            for (n = this.firstChild; n; n = n.nextSibling) {
              if (n.nodeName === "HTML") { return n; }
            }
            // No <html>, so return the first child that's an element
            for (n = this.firstChild; n; n = n.nextSibling) {
              if (n.nodeType === 1) { return n; }
            }
            // None of our children are elements, fail
            return null;
          })},
        forms: Props.ampGetter(function(privates) {
          // privates not used but we need host-exception protection and
          // authority to access 'document'

          // TODO(kpreid): Make this a memoized live list.
          var tameForms = [];
          for (var i = 0; i < document.forms.length; i++) {
            var tameForm = tameRelatedNode(document.forms.item(i));
            // tameRelatedNode returns null if the node is not part of
            // this node's virtual document.
            if (tameForm !== null) { tameForms.push(tameForm); }
          }
          return fakeNodeList(tameForms, 'HTMLCollection');
        }),
        title: {
          // TODO(kpreid): get the title element pointer in conformant way

          // http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#document.title
          // as of 2012-08-14
          enumerable: true,
          get: innocuous(function() {
            var titleEl = this.getElementsByTagName('title')[0];
            return titleEl ? trimHTML5Spaces(titleEl.textContent) : "";
          }),
          set: innocuous(function(value) {
            var titleEl = this.getElementsByTagName('title')[0];
            if (!titleEl) {
              var head = this.getElementsByTagName('head')[0];
              if (head) {
                titleEl = this.createElement('title');
                head.appendChild(titleEl);
              } else {
                return;
              }
            }
            titleEl.textContent = value;
          })
        },
        compatMode: P_constant('CSS1Compat'),
        ownerDocument: P_constant(null),
        appendChild: forwardContainerMethod,
        insertBefore: forwardContainerMethod,
        removeChild: forwardContainerMethod,
        replaceChild: forwardContainerMethod,
        hasChildNodes: forwardContainerMethod,
        getElementsByTagName: Props.ampMethod(function(privates, tagName) {
          tagName = String(tagName).toLowerCase();
          return tameGetElementsByTagName(privates.feralContainerNode, tagName);
        }),
        getElementsByClassName: Props.ampMethod(function(privates, className) {
          return tameGetElementsByClassName(
              privates.feralContainerNode, className);
        }),
        getElementsByName: Props.cond(elementForFeatureTests.querySelector,
            Props.ampMethod(function(privates, name) {
          // knowingly non-live for our own sanity
          var escName = escapeCSSString(name);
          var selector = '[name=' + escName + '], [data-caja-name=' + escName +
              ']';
          return new TameNodeList(
              privates.feralContainerNode.querySelectorAll(selector),
              defaultTameNode);
        })),
        querySelector: Props.cond(elementForFeatureTests.querySelector,
            Props.ampMethod(function(privates, selector) {
              return tameQuerySelector(privates.feralContainerNode, selector,
                  false);
            })),
        querySelectorAll: Props.cond(elementForFeatureTests.querySelectorAll,
            Props.ampMethod(function(privates, selector) {
              return tameQuerySelector(privates.feralContainerNode, selector,
                  true);
            })),
        addEventListener: tameAddEventListenerProp,
        removeEventListener: tameRemoveEventListenerProp,
        dispatchEvent: tameDispatchEventProp,
        createComment: Props.ampMethod(function(privates, text) {
          return defaultTameNode(privates.feralDoc.createComment(" "));
        }),
        createDocumentFragment: Props.ampMethod(function(privates) {
          privates.policy.requireEditable();
          return defaultTameNode(privates.feralDoc.createDocumentFragment());
        }),
        createElement: Props.ampMethod(function(privates, tagName) {
          privates.policy.requireEditable();
          tagName = String(tagName).toLowerCase();
          tagName = htmlSchema.virtualToRealElementName(tagName);
          var newEl = privates.feralDoc.createElement(tagName);
          if ("canvas" == tagName) {
            bridal.initCanvasElement(newEl);
          }
          if (elementPolicies.hasOwnProperty(tagName)) {
            var attribs = elementPolicies[tagName]([]);
            if (attribs) {
              for (var i = 0; i < attribs.length; i += 2) {
                bridal.setAttribute(newEl, attribs[+i], attribs[i + 1]);
              }
            }
          }
          var tameEl = defaultTameNode(newEl);
          postInitCreatedElement.call(tameEl);  // Hook for <script>
          return tameEl;
        }),
        createTextNode: Props.ampMethod(function(privates, text) {
          privates.policy.requireEditable();
          return defaultTameNode(privates.feralDoc.createTextNode(
              text !== null && text !== void 0 ? '' + text : ''));
        }),
        getElementById: Props.ampMethod(function(privates, id) {
          id += idSuffix;
          var node = privates.feralDoc.getElementById(id);
          return defaultTameNode(node);
        }),
        // http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-DocumentEvent-createEvent
        createEvent: Props.ampMethod(function(privates, type) {
          type = String(type);
          if (!eventTypeWhitelist.hasOwnProperty(type)) {
            throw new Error('Domado: Non-whitelisted event type "' + type + '"');
          }
          var document = privates.feralDoc;
          var rawEvent;
          if (document.createEvent) {
            rawEvent = document.createEvent(type);
          } else {
            // For IE; ondataavailable is a placeholder. See bridal.js for
            // related code.
            rawEvent = document.createEventObject();
            rawEvent.eventType = 'ondataavailable';
          }
          var tamedEvent = new (tamingClassTable.getTamingCtor('Event'))(
              rawEvent, true);
          taming.tamesTo(rawEvent, tamedEvent);
          return tamedEvent;
        }),
        // TODO(kpreid): Refactor so that writeHook is stashed on the tame
        // document since that is the only place it is needed and gives
        // capability structure.
        write: Props.ampMethod(function(privates) {
          if (!domicile.writeHook) {
            throw new Error('document.write not provided for this document');
          }
          // TODO(kpreid): Per HTML5, document.write is void. This return value
          // is used internally by ses-frame-group.js to call the run()
          // callback, and ought to be a strictly internal interface.
          return domicile.writeHook.write.apply(undefined,
              Array.prototype.slice.call(arguments, 1));
        }),
        writeln: Props.ampMethod(function(privates) {
          if (!domicile.writeHook) {
            throw new Error('document.writeln not provided for this document');
          }
          // We don't write the \n separately rather than copying args, because
          // the HTML parser would rather get fewer larger chunks.
          var args = Array.prototype.slice.call(arguments, 1);
          args.push('\n');
          domicile.writeHook.write.apply(undefined, args);
        }),
        open: Props.ampMethod(function(privates) {
          if (!domicile.writeHook) {
            throw new Error('document.open not provided for this document');
          }
          return domicile.writeHook.open();
        }),
        close: Props.ampMethod(function(privates) {
          if (!domicile.writeHook) {
            throw new Error('document.close not provided for this document');
          }
          return domicile.writeHook.close();
        })
      });
      cajaVM.def(TameHTMLDocument);  // and its prototype

      domicile.setBaseUri = cajaVM.constFunc(function(base) {
        var parsed = URI.parse(base);
        var host = null;
        if (parsed.hasDomain()) {
          host = parsed.hasPort() ? parsed.getDomain() + ':' + parsed.getPort()
              : parsed.getDomain();
        }
        if (!parsed.hasPath()) {
          parsed.setRawPath('/');
        }
        domicile.pseudoLocation = {
          href: parsed.toString(),
          hash: parsed.hasFragment() ? '#' + parsed.getRawFragment() : '',
          host: host,
          hostname: parsed.getDomain(),
          port: parsed.hasPort() ? parsed.getPort() : '',
          protocol: parsed.hasScheme() ? parsed.getScheme() + ':' : null,
          pathname: parsed.getRawPath(),
          search: parsed.hasQuery() ? '?' + parsed.getRawQuery() : ''
        };
      });

      // TODO(kpreid): reconcile this and fireVirtualEvent
      function dispatchToListeners(tameNode, eventType, eventName) {
        var event = tameDocument.createEvent(eventType);
        event.initEvent(eventName, true, false);

        // TODO(kpreid): onload should be handled generically as an event
        // handler, not as a special case. But how?
        if (eventName === 'load') {
          if (tameWindow.onload) {
            callAsEventListener(tameWindow.onload, tameNode, event);
          }
        }

        tameNode.dispatchEvent(event);
      }

      // Called by the html-emitter when the virtual document has been loaded.
      domicile.signalLoaded = cajaVM.constFunc(function() {
        dispatchToListeners(tameDocument, 'Event', 'DOMContentLoaded');
        dispatchToListeners(tameWindow, 'UIEvent', 'load');
      });

      // Currently used by HtmlEmitter to synthesize script load events.
      // Note that it does trigger handler attributes (because our handler
      // attribute support does not catch 'custom' events); if this is needed,
      // then what we need to do is arrange for bridal to not consider the event
      // to be custom (which is OK since it also does not bubble).
      /**
       * Not yet fully general, only because the use case hasn't arisen.
       * Note bubbles=false cancelable=false.
       *
       * @param {string} type e.g. 'Event'
       * @param {string} name e.g. 'click'
       */
      domicile.fireVirtualEvent = function(feralNode, type, name) {
        var event = document.createEvent(type);
        bridal.initEvent(event, 'initEvent', name, false, false, [], true);
        feralNode.dispatchEvent(event);
      };

      function toFeralNode(tame) {
        if (tame === null || tame === undefined) {
          return tame;
        } else {
          // NOTE: will be undefined for pseudo (non-backed) nodes
          return TameNodeConf.amplify(tame,
              function(privates) { return privates.feral; });
        }
      }
      cajaVM.constFunc(toFeralNode);

      // For JavaScript handlers.  See function dispatchEvent below
      domicile.handlers = [];
      domicile.tameNode = cajaVM.def(defaultTameNode);
      domicile.feralNode = cajaVM.def(toFeralNode);
      domicile.tameEvent = cajaVM.def(tameEvent);
      domicile.fetchUri = cajaVM.constFunc(function(uri, mime, callback) {
        uriFetch(naiveUriPolicy,
            URI.utils.resolve(domicile.pseudoLocation.href, uri),
          mime, callback);
      });
      domicile.rewriteUri = cajaVM.constFunc(function(uri, mimeType, opt_hints) {
        // (SAME_DOCUMENT, SANDBOXED) is chosen as the "reasonable" set of
        // defaults for this function, which is only used by TCB components
        // to rewrite URIs for sources of data. We assume these sources of
        // data provide no exit from the sandbox, and their effects are shown
        // in the same HTML document view as the Caja guest.
        // TODO(ihab.awad): Rename this function to something more specific
        return uriRewrite(
            naiveUriPolicy,
            String(uri),
            html4.ueffects.SAME_DOCUMENT,
            html4.ltypes.SANDBOXED,
            opt_hints || {});
      });
      // note: referenced reflectively by HtmlEmitter
      domicile.cssUri = cajaVM.constFunc(function(uri, mimeType, prop) {
        uri = String(uri);
        if (!uriRewriterForCss) { return null; }
        return uriRewriterForCss(uri, prop);
      });
      // TODO(kpreid): Consider moving domicile.suffix into the
      // domicile.virtualization object. Used by caja-flash.js only.
      domicile.suffix = cajaVM.constFunc(function(nmtokens) {
        var p = String(nmtokens).replace(/^\s+|\s+$/g, '').split(/\s+/g);
        var out = [];
        for (var i = 0; i < p.length; ++i) {
          var nmtoken = rewriteAttribute(null, null, html4.atype.ID, p[+i]);
          if (!nmtoken) { throw new Error(nmtokens); }
          out.push(nmtoken);
        }
        return out.join(' ');
      });
      domicile.rewriteUriInCss = cajaVM.constFunc(function(value, propName) {
        return value
          ? uriRewrite(naiveUriPolicy, value, html4.ueffects.SAME_DOCUMENT,
                html4.ltypes.SANDBOXED,
                {
                  "TYPE": "CSS",
                  "CSS_PROP": propName
                })
          : void 0;
      });
      domicile.rewriteUriInAttribute = cajaVM.constFunc(
          function(value, tagName, attribName) {
        if (isValidFragment(value)) {
          return value + idSuffix;
        }
        var schemaAttr = htmlSchema.attribute(tagName, attribName);
        return value
          ? uriRewrite(naiveUriPolicy, value, schemaAttr.uriEffect,
                schemaAttr.loaderType, {
                  "TYPE": "MARKUP",
                  "XML_ATTR": attribName,
                  "XML_TAG": tagName
                })
          : void 0;
      });
      domicile.rewriteTargetAttribute = cajaVM.constFunc(
          function(value, tagName, attribName) {
        // TODO(ihab.awad): Parrots much of the code in sanitizeAttrs; refactor
        var atype = null, attribKey;
        if ((attribKey = tagName + '::' + attribName,
             html4.ATTRIBS.hasOwnProperty(attribKey))
            || (attribKey = '*::' + attribName,
                html4.ATTRIBS.hasOwnProperty(attribKey))) {
          atype = html4.ATTRIBS[attribKey];
          return rewriteAttribute(tagName, attribName, atype, value);
        }
        return null;
      });

      // Taming of Styles:

      tamingClassTable.registerLazy('CSSStyleDeclaration', function() {
        var allCssProperties = CssPropertiesCollection();

        // Sealed internals for TameStyle objects, not to be exposed.
        var TameStyleConf = new Confidence('Style');

        function allowProperty(cssPropertyName) {
          return allCssProperties.isCssName(cssPropertyName);
        };

        /**
         * http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration
         */
        function TameStyle(style, editable, tameEl) {
          TameStyleConf.confide(this, taming);
          TameStyleConf.amplify(this, function(privates) {
            privates.feral = style;
            privates.editable = editable;
            privates.tameElement = tameEl;

            privates.readByCanonicalName = function(canonName) {
              return String(style[canonName] || '');
            };
            privates.writeByCanonicalName = function(canonName, val) {
              style[canonName] = val;
            };

            // predeclared for TameComputedStyle
            privates.rawElement = undefined;
            privates.pseudoElement = undefined;

            Object.preventExtensions(privates);
          });
        };
        inertCtor(TameStyle, Object);
        TameStyle.prototype.getPropertyValue =
            TameStyleConf.amplifying(function(privates, cssPropertyName) {
          cssPropertyName = String(cssPropertyName || '').toLowerCase();
          if (!allowProperty(cssPropertyName)) { return ''; }
          var canonName = allCssProperties.cssToDom(cssPropertyName);
          return privates.readByCanonicalName(canonName);
        });
        Props.define(TameStyle.prototype, TameStyleConf, {
          toString: Props.overridable(false, innocuous(function() {
            return '[domado object Style]';
          })),
          cssText: {
            enumerable: true,
            set: TameStyleConf.amplifying(function(privates, value) {
              if (typeof privates.feral.cssText === 'string') {
                privates.feral.cssText = sanitizeStyleAttrValue(value);
              } else {
                // If the browser doesn't support setting cssText, then fall
                // back to setting the style attribute of the containing
                // element.  This won't work for style declarations that are
                // part of stylesheets and not attached to elements.
                privates.tameElement.setAttribute('style', value);
              }
              return true;
            })
          }
        });
        allCssProperties.forEachDomName(function(stylePropertyName) {
          // TODO(kpreid): Refactor this to be clearer about what is going on;
          // particularly what role each "name" plays.
          var cssPropertyName = allCssProperties.domToCss(stylePropertyName);
          var canonName = allCssProperties.cssToDom(cssPropertyName);
          var allowed = allowProperty(cssPropertyName);
          Object.defineProperty(TameStyle.prototype, stylePropertyName, {
            enumerable: canHaveEnumerableAccessors,
            get: TameStyleConf.amplifying(function(privates) {
              if (!(privates.feral && allowed)) {
                return void 0;
              }
              return privates.readByCanonicalName(canonName);
            }),
            set: TameStyleConf.amplifying(function(privates, value) {
              if (!privates.editable) { throw new Error('style not editable'); }
              if (!allowed) { return; }
              var tokens = lexCss(value);
              if (tokens.length === 0
                 || (tokens.length === 1 && tokens[0] === ' ')) {
                value = '';
              } else {
                if (!sanitizeStyleProperty(cssPropertyName, tokens)) {
                  console.log('bad value `' + value + '` for CSS property '
                                  + stylePropertyName);
                }
                value = tokens.join(' ');
              }
              privates.writeByCanonicalName(canonName, value);
            })
          });
        });

        // Support for computed style type reusing these values
        // TODO(kpreid): Do this in a more least-authority way.
        TameStyle.TameStyleConf = TameStyleConf;
        TameStyle.allCssProperties = allCssProperties;

        return cajaVM.def(TameStyle);  // and defends its prototype
      });

      tamingClassTable.registerLazy('CajaComputedCSSStyleDeclaration',
          function() {
        function isNestedInAnchor(el) {
          for (;
              el && el !== feralPseudoDocument;
              el = el.parentNode) {
            if (el.tagName && el.tagName.toLowerCase() === 'a') {
              return true;
            }
          }
          return false;
        }

        var TameStyle = tamingClassTable.getTamingCtor('CSSStyleDeclaration');
        var TameStyleConf = TameStyle.TameStyleConf;
        var allCssProperties = TameStyle.allCssProperties;

        function TameComputedStyle(rawElement, pseudoElement) {
          rawElement = rawElement || document.createElement('div');
          TameStyle.call(
              this,
              bridal.getComputedStyle(rawElement, pseudoElement),
              false);
          TameStyleConf.amplify(this, function(privates) {
            privates.rawElement = rawElement;
            privates.pseudoElement = pseudoElement;

            var superReadByCanonicalName =
                privates.readByCanonicalName;
            privates.readByCanonicalName = function(canonName) {
              var propName = allCssProperties.domToCss(canonName);
              var schemaElement = cssSchema[propName];
              return superReadByCanonicalName.call(this, canonName);
            };
            privates.writeByCanonicalName = function(canonName) {
              throw 'Computed styles not editable: This code should be ' +
                  'unreachable';
            };
          });
        };
        inertCtor(TameComputedStyle,
            tamingClassTable.getTamingCtor('CSSStyleDeclaration'));
        Props.define(TameComputedStyle, TameStyleConf, {
          toString: Props.overridable(false, innocuous(function() {
            return '[Fake Computed Style]';
          }))
        });
        return cajaVM.def(TameComputedStyle);  // and defends its prototype
      });

      tamingClassTable.registerLazy('XMLHttpRequest', function() {
        // Note: XMLHttpRequest is a ctor that *can* be directly
        // called by cajoled code, so we do not use inertCtor().
        return cajaVM.def(TameXMLHttpRequest(
            taming,
            XMLHttpRequestCtor(
                window.XMLHttpRequest,
                window.ActiveXObject,
                window.XDomainRequest),
            naiveUriPolicy,
            function () { return domicile.pseudoLocation.href; }));
      });


      var cssIdClassPrefixRE =
          new RegExp('(^|[},])\\s*\\.' + idClass + ' ', 'g');
      /**
       * Create a CSS stylesheet with the given text and append it to the DOM.
       * @param {string} cssText a well-formed stylesheet production.
       */
      domicile.emitCss = cajaVM.constFunc(function(cssText) {
        if (outerContainerNode === document) {
          // Kludge to strip out container class markers from the cajoler if
          // we're using a frame. TODO(kpreid): Modify the cajoler so that its
          // generated emitCss invocations are parameterized to handle this
          // difference. TODO(kpreid): Validate this regexp strategy.
          cssText = cssText.replace(cssIdClassPrefixRE, '');
        }
        this.getCssContainer().appendChild(
            bridal.createStylesheet(document, cssText));
      });
      /** The node to which gadget stylesheets should be added. */
      domicile.getCssContainer = cajaVM.constFunc(function() {
        var e = document.getElementsByTagName('head')[0] ||
            // iframe doc
            outerContainerNode.getElementsByTagName('caja-v-head')[0];
        if (!e) {
          if (typeof console !== 'undefined') {
            console.warn('Domado: Unable to find location to stash stylesheet');
          }
          e = document.createElement('head');
        }
        return e;
      });

      var idClassPattern = new RegExp(
          '(?:^|\\s)' + idClass.replace(/[\.$]/g, '\\$&') + '(?:\\s|$)');
      /**
       * Is this the node whose children are the children of the virtual
       * document?
       */
      function isContainerNode(node) {
        return node === feralPseudoDocument ||
            (node &&
             node.nodeType === 1 &&
             idClassPattern.test(node.className));
      }
      /** A per-gadget class used to separate style rules. */
      domicile.getIdClass = cajaVM.constFunc(function() {
        return idClass;
      });

      /**
       * The node whose children correspond to the children of the tameDocument.
       */
      domicile.getPseudoDocument = cajaVM.constFunc(function() {
        return feralPseudoDocument;
      });

      var TameWindowConf = new Confidence('TameWindow');

      /**
       * See http://www.whatwg.org/specs/web-apps/current-work/multipage/browsers.html#window for the full API.
       */
      function TameWindow(feralWinNode, feralDocNode) {
        TameWindowConf.confide(this, taming);
        TameWindowConf.amplify(this, function(privates) {
          // TODO(kpreid): revise this to make sense
          privates.feralContainerNode = feralDocNode;

          // needed for EventTarget
          privates.policy = nodePolicyEditable;

          // protocol for EventTarget operations
          privates.wrappedListeners = [];
          privates.feralEventTarget = feralWinNode;

          Object.preventExtensions(privates);
        });

        // JS globals
        addImports(this);

        // These descriptors were chosen to resemble actual ES5-supporting browser
        // behavior.
        // The document property is defined below.
        installLocation(this);
        Object.defineProperty(this, "navigator", {
          value: tameNavigator,
          configurable: false,
          enumerable: true,
          writable: false
        });

        taming.tamesTo(feralWinNode, this);

        // Attach reflexive properties
        [
          'top', 'self', 'opener', 'parent', 'window', 'frames'
        ].forEach(function(prop) {
          this[prop] = this;
        }, this);

        // window.frames.length (must be a data prop for ES5/3)
        this.length = 0;

        // Timed callbacks
        //
        // Defined on instance rather than prototype because setTimeout closes
        // over the environment (i.e. this) for string eval. Note that this is
        // a deviation from browser behavior (Chrome and Firefox have it on
        // prototype). requestAnimationFrame does not need the same treatment
        // but we might as well be regular.
        tameSetAndClear(
            this,
            window.setTimeout,
            window.clearTimeout,
            'setTimeout', 'clearTimeout',
            false, true, this);
        tameSetAndClear(
            this,
            window.setInterval,
            window.clearInterval,
            'setInterval', 'clearInterval',
            false, true, this);
        if (window.requestAnimationFrame) {
          tameSetAndClear(
              this,
              function(code, ignored) {  // no time arg like setTimeout has
                  return window.requestAnimationFrame(code); },
              window.cancelAnimationFrame,
              'requestAnimationFrame', 'cancelAnimationFrame',
              true, false, undefined);
        }
      }
      inertCtor(TameWindow, Object, 'Window');
      Props.define(TameWindow.prototype, TameWindowConf, {
        toString: Props.overridable(false, innocuous(function() {
          return '[domado object Window]';
        }))
      });
      // Methods of TameWindow are established later. TODO(kpreid): Revisit
      // whether that is necessary.

      tamingClassTable.registerLazy('Location', function() {
        // Location object -- used by Document and Window and so must be created
        // before each.
        function TameLocation() {
          // TODO(mikesamuel): figure out a mechanism by which the container can
          // specify the gadget's apparent URL.
          // See http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#location0
          var self = this;
          function defineLocationField(f, dflt) {
            Object.defineProperty(self, f, {
              configurable: false,
              enumerable: true,
              get: innocuous(function() {
                try {
                  var v = domicile.pseudoLocation[f];
                  return String(v !== null ? v : dflt);
                } catch (e) {
                  // paranoia - domicile.pseudoLocation is potentially
                  // replaceable by the host and could have wrong-frame code.
                  // TODO(kpreid): put pseudoLocation somewhere not writable.
                  throw tameException(e);
                }
              })
            });
          }
          defineLocationField('href', 'http://nosuchhost.invalid:80/');
          defineLocationField('hash', '');
          defineLocationField('host', 'nosuchhost.invalid:80');
          defineLocationField('hostname', 'nosuchhost.invalid');
          defineLocationField('pathname', '/');
          defineLocationField('port', '80');
          defineLocationField('protocol', 'http:');
          defineLocationField('search', '');
        }
        inertCtor(TameLocation, Object);
        setToString(TameLocation.prototype, innocuous(function() {
          return this.href;
        }));
        return cajaVM.def(TameLocation);  // and its prototype
      });

      // 'location' singleton
      var installLocation = (function() {
        var tameLocation;
        function tameLocationGetter() {
          if (!tameLocation) {
            tameLocation =
                new (tamingClassTable.getTamingCtor('Location'))();
          }
          return tameLocation;
        }
        cajaVM.constFunc(tameLocationGetter);
        function tameLocationSetter() {
          throw new Error('Caja does not currently support assigning to ' +
              '.location');
        }
        cajaVM.constFunc(tameLocationSetter);
        return function installLocation(obj) {
          Object.defineProperty(obj, 'location', {
            configurable: false,
            enumerable: true,
            get: tameLocationGetter,
            set: tameLocationSetter
          });
        };
      }());

      // See spec at http://www.whatwg.org/specs/web-apps/current-work/multipage/browsers.html#navigator
      // We don't attempt to hide or abstract userAgent details since
      // they are discoverable via side-channels we don't control.
      var navigator = window.navigator;
      var tameNavigator = cajaVM.def({
        appName: String(navigator.appName),
        appVersion: String(navigator.appVersion),
        platform: String(navigator.platform),
        // userAgent should equal the string sent in the User-Agent HTTP header.
        userAgent: String(navigator.userAgent),
        // Custom attribute indicating Caja is active. The version number has
        // ended up completely meaningless, but there is code in the wild that
        // tests for this attribute, so we'll just leave it, for now.
        cajaVersion: '1.0'
        });

      /**
       * Set of allowed pseudo elements as described at
       * http://www.w3.org/TR/CSS2/selector.html#q20
       */
      var PSEUDO_ELEMENT_WHITELIST = {
        // after and before disallowed since they can leak information about
        // arbitrary ancestor nodes.
        'first-letter': true,
        'first-line': true
      };

      var noopWindowFunctionProp = Props.markPropMaker(function(env) {
        var prop = env.prop;
        var notify = true;
        return {
          // Matches Firefox 17.0
          // Chrome 25.0.1329.0 canary has configurable:false
          configurable: true,
          enumerable: true,
          writable: true,
          value: innocuous(function domadoNoop() {
            if (notify) {
              notify = false;
              if (typeof console !== 'undefined') {
                console.warn('Domado: ignoring window.' + prop + '(\u2026).');
              }
            }
          })
        };
      });
      // Firefox's class name is (exported) BarProp, Chrome's is (nonexported)
      // BarInfo.
      // visible: false was chosen to reflect what the Caja environment
      // provides (e.g. there is no location bar displaying the URL), not
      // browser behavior (which, for Firefox, is to have .visible be false if
      // and only if the window was created by a window.open specifying that,
      // whether or not the relevant toolbar actually is hidden).
      var stubBarPropProp = Props.overridable(true,
          cajaVM.def({visible: false}));
      Props.define(TameWindow.prototype, TameWindowConf, {
        addEventListener: tameAddEventListenerProp,
        removeEventListener: tameRemoveEventListenerProp,
        dispatchEvent: tameDispatchEventProp,
        scrollBy: Props.ampMethod(function(privates, dx, dy) {
          // The window is always auto scrollable, so make the apparent window
          // body scrollable if the gadget tries to scroll it.
          if (dx || dy) {
            makeScrollable(bridal, privates.feralContainerNode);
          }
          tameScrollBy(privates.feralContainerNode, dx, dy);
        }),
        scrollTo: Props.ampMethod(function(privates, x, y) {
          // The window is always auto scrollable, so make the apparent window
          // body scrollable if the gadget tries to scroll it.
          makeScrollable(bridal, privates.feralContainerNode);
          tameScrollTo(privates.feralContainerNode, x, y);
        }),
        resizeTo: Props.ampMethod(function(privates, w, h) {
            tameResizeTo(privates.feralContainerNode, w, h);
        }),
        resizeBy: Props.ampMethod(function(privates, dw, dh) {
          tameResizeBy(privates.feralContainerNode, dw, dh);
        }),
        /** A partial implementation of getComputedStyle. */
        getComputedStyle: Props.plainMethod(
            // Pseudo elements are suffixes like :first-line which constrain to
            // a portion of the element's content as defined at
            // http://www.w3.org/TR/CSS2/selector.html#q20
            function(tameElement, pseudoElement) {
          return TameElementConf.amplify(tameElement, function(elPriv) {
            // Coerce all nullish values to undefined, since that is the value
            // for unspecified parameters.
            // Per bug 973: pseudoElement should be null according to the
            // spec, but mozilla docs contradict this.
            // From https://developer.mozilla.org/En/DOM:window.getComputedStyle
            //     pseudoElt is a string specifying the pseudo-element to match.
            //     Should be an empty string for regular elements.
            pseudoElement = (pseudoElement === null || pseudoElement === void 0
                             || '' === pseudoElement)
                ? void 0 : String(pseudoElement).toLowerCase();
            if (pseudoElement !== void 0
                && !PSEUDO_ELEMENT_WHITELIST.hasOwnProperty(pseudoElement)) {
              throw new Error('Bad pseudo element ' + pseudoElement);
            }
            // No need to check editable since computed styles are readonly.
            return new (tamingClassTable.getTamingCtor(
                'CajaComputedCSSStyleDeclaration'))(
                elPriv.feral, pseudoElement);
          });
        }),
        pageXOffset: Props.aliasRO(true, 'scrollX'),
        pageYOffset: Props.aliasRO(true, 'scrollY'),
        scrollX: Props.ampGetter(function(p) {
            return p.feralContainerNode.scrollLeft; }),
        scrollY: Props.ampGetter(function(p) {
            return p.feralContainerNode.scrollTop; }),
        innerHeight: Props.ampGetter(function(p) {
            return p.feralContainerNode.offsetHeight; }),
        innerWidth: Props.ampGetter(function(p) {
            return p.feralContainerNode.offsetWidth; }),
        outerHeight: Props.ampGetter(function(p) {
            return p.feralContainerNode.offsetHeight; }),
        outerWidth: Props.ampGetter(function(p) {
            return p.feralContainerNode.offsetWidth; }),
        blur: noopWindowFunctionProp,
        focus: noopWindowFunctionProp,
        close: noopWindowFunctionProp,
        moveBy: noopWindowFunctionProp,
        moveTo: noopWindowFunctionProp,
        print: noopWindowFunctionProp,
        stop: noopWindowFunctionProp,
        locationbar: stubBarPropProp,
        personalbar: stubBarPropProp,
        menubar: stubBarPropProp,
        scrollbars: stubBarPropProp,
        statusbar: stubBarPropProp,
        toolbar: stubBarPropProp
      });
      // NOT PROVIDED on window:
      // event: a global on IE.  We always define it in scopes that can handle
      //        events.
      // opera: defined only on Opera.
      cajaVM.def(TameWindow);  // and its prototype

      // Declare we're done adding new exported classes.
      tamingClassTable.finish();

      var tameDocument = new TameHTMLDocument(
          document,
          feralPseudoDocument,
          // TODO(jasvir): Properly wire up document.domain
          // by untangling the cyclic dependence between
          // TameWindow and TameDocument
          String(undefined || 'nosuchhost.invalid'));
      domicile.htmlEmitterTarget = feralPseudoDocument;

      var tameWindow = new TameWindow(feralPseudoWindow, feralPseudoDocument);




      if (TameHTMLDocumentConf.amplify(tameDocument,
          function(p) { return p.policy.editable; })) {
        // Powerful singleton authority not granted for RO document
        tameDocument.defaultView = tameWindow;

        // Hook for document.write support.
        domicile.sanitizeAttrs = sanitizeAttrs;
      }

      // Iterate over all node classes, assigning them to the Window object
      // under their DOM Level 2 standard name. They have been frozen above.
      tamingClassTable.exportTo(tameWindow);

      // TODO(ihab.awad): Build a more sophisticated virtual class hierarchy by
      // having a table of subclass relationships and implementing them.

      // If a node class name in this list is not defined using defineElement or
      // inertCtor above, then it will now be bound to the HTMLElement class.
      var allDomNodeClasses = htmlSchema.getAllKnownScriptInterfaces();
      for (var i = 0; i < allDomNodeClasses.length; i++) {
        var className = allDomNodeClasses[+i];
        if (!(className in tameWindow)) {
          Object.defineProperty(tameWindow, className, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: defaultNodeClassCtor
          });
        }
      }

      // Register [NamedConstructor]s
      Object.freeze(namedConstructors);  // catch initialization order errors
      Object.getOwnPropertyNames(namedConstructors).forEach(function(name) {
        Object.defineProperty(tameWindow, name, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: namedConstructors[name]
        });
      });

      tameDocument = finishNode(tameDocument);

      domicile.window = tameWindow;
      domicile.document = tameDocument;
      Object.defineProperty(tameWindow, 'document', {
        value: tameDocument,
        configurable: false,
        enumerable: true,
        writable: false
      });

      pluginId = getId(tameWindow);
      windowToDomicile.set(tameWindow, domicile);

      // Install virtual UA stylesheet.
      if (!document.caja_gadgetStylesheetInstalled) (function () {
        document.caja_gadgetStylesheetInstalled = true;

        var element = document.createElement("style");
        element.setAttribute("type", "text/css");
        element.textContent = (
          // Visually contains the virtual document
          ".vdoc-container___ {" +
            "position:relative!important;" +
            "overflow:auto!important;" +
            "clip:rect(auto,auto,auto,auto)!important;" + // paranoia
          "}" +

          // Styles for HTML elements that we virtualize, and so do not get the
          // normal UA stylesheet rules applied:

          // Should be the intersection of HTML5 spec's list and our virtualized
          // (i.e. non-whitelisted) elements. Source:
          // <http://www.whatwg.org/specs/web-apps/current-work/multipage/rendering.html#the-css-user-agent-style-sheet-and-presentational-hints>
          "caja-v-base,caja-v-basefont,caja-v-head,caja-v-link,caja-v-meta," +
          "caja-v-noembed,caja-v-noframes,caja-v-param,caja-v-source," +
          "caja-v-track,caja-v-title{" +
            "display:none;" +
          "}" +

          "caja-v-html, caja-v-body {" +
            "display:block;" +
          "}"
        );
        domicile.getCssContainer().appendChild(element);
      })();

      return domicile;
    }

    /**
     * Function called from rewritten event handlers to dispatch an event safely.
     */
    function plugin_dispatchEvent(thisNode, event, pluginId, handler) {
      var window = bridalMaker.getWindow(thisNode);
      event = event || window.event;
      // support currentTarget on IE[678]
      if (!event.currentTarget) {
        event.currentTarget = thisNode;
      }
      var imports = getImports(pluginId);
      var domicile = windowToDomicile.get(imports);
      var node = domicile.tameNode(thisNode);
      var isUserAction = eventIsUserAction(event, window);
      try {
        return dispatch(
          isUserAction, pluginId, handler,
          [ node, domicile.tameEvent(event) ]);
      } catch (ex) {
        imports.onerror(ex.message, 'unknown', 0);
      }
    }

    /**
     * Return true if event is a user action that can be expected to do
     * click(), focus(), etc.
     */
    function eventIsUserAction(event, window) {
      if (!(event instanceof window.UIEvent)) { return false; }
      switch (event.type) {
        case 'click':
        case 'dblclick':
        case 'keypress':
        case 'keydown':
        case 'keyup':
        case 'mousedown':
        case 'mouseup':
        case 'touchstart':
        case 'touchend':
          return true;
      }
      return false;
    }

    /**
     * Called when user clicks on a javascript: link.
     */
    function plugin_dispatchToHandler(pluginId, handler, args) {
      return dispatch(true, pluginId, handler, args);
    }

    function dispatch(isUserAction, pluginId, handler, args) {
      var domicile = windowToDomicile.get(getImports(pluginId));
      switch (typeof handler) {
        case 'number':
          handler = domicile.handlers[+handler];
          break;
        case 'string':
          var fn = void 0;
          fn = domicile.window[handler];
          handler = fn && typeof fn.call === 'function' ? fn : void 0;
          break;
        case 'function': case 'object': break;
        default:
          throw new Error(
              'Expected function as event handler, not ' + typeof handler);
      }
      domicile.handlingUserAction = isUserAction;
      try {
        return handler.call.apply(handler, args);
      } catch (ex) {
        // guard against IE discarding finally blocks
        domicile.handlingUserAction = false;
        throw ex;
      } finally {
        domicile.handlingUserAction = false;
      }
    }

    return cajaVM.def({
      attachDocument: attachDocument,
      plugin_dispatchEvent: plugin_dispatchEvent,
      plugin_dispatchToHandler: plugin_dispatchToHandler,
      getDomicileForWindow: windowToDomicile.get.bind(windowToDomicile)
    });
  });
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['Domado'] = Domado;
}
;
// Copyright (C) 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Schema for taming membrane.
 *
 * @requires WeakMap
 * @overrides window
 * @provides TamingSchema
 */
function TamingSchema(helper) {

  'use strict';

  function PropertyFlags() {
    var map = new WeakMap();
    return Object.freeze({
      has: function(obj, prop, flag) {
        prop = '$' + prop;
        return map.has(obj) &&
            map.get(obj).hasOwnProperty(prop) &&
            map.get(obj)[prop].indexOf(flag) !== -1;
      },
      set: function(obj, prop, flag) {
        prop = '$' + prop;
        if (!map.has(obj)) {
          // Note: Object.create(null) not supported in ES5/3
          map.set(obj, {});
        }
        var o = map.get(obj);
        if (!o.hasOwnProperty(prop)) {
          o[prop] = [];
        }
        if (o[prop].indexOf(flag) === -1) {
          o[prop].push(flag);
        }
      },
      getProps: function(obj) {
        if (!map.has(obj)) { return []; }
        return Object.getOwnPropertyNames(map.get(obj))
            .map(function(s) { return s.substring(1); });
      }
    });
  }

  var grantTypes = Object.freeze({
    METHOD: 'method',
    READ: 'read',
    WRITE: 'write',
    OVERRIDE: 'override'
  });

  var grantAs = PropertyFlags();

  var tameTypes = Object.freeze({
    CONSTRUCTOR: 'constructor',
    FUNCTION: 'function',
    XO4A: 'xo4a',
    READ_ONLY_RECORD: 'read_only_record'
  });

  // All WeakMaps we use deal in host objects, so have a shortcut
  function makeWeakMap() {
    var map = new WeakMap();
    helper.weakMapPermitHostObjects(map);
    return map;
  }

  var tameAs = makeWeakMap();

  var tameFunctionName = makeWeakMap();
  var tameCtorSuper = makeWeakMap();

  var functionAdvice = makeWeakMap();

  function applyFeralFunction(f, self, args) {
    return initAdvice(f)(self, args);
  }

  function isNumericName(n) {
    return typeof n === 'number' || ('' + (+n)) === n;
  }

  function checkNonNumeric(prop) {
    if (isNumericName(prop)) {
      throw new TypeError('Cannot control numeric property names: ' + prop);
    }
  }

  var fixed = makeWeakMap();

  function checkCanControlTaming(f) {
    var to = typeof f;
    if (!f || (to !== 'function' && to !== 'object')) {
      throw new TypeError('Taming controls not for non-objects: ' + f);
    }
    if (fixed.has(f)) {
      throw new TypeError('Taming controls not for already tamed: ' + f);
    }
    if (helper.isDefinedInCajaFrame(f)) {
      throw new TypeError('Taming controls not for Caja objects: ' + f);
    }
  }

  function fix(f) {
    fixed.set(f, true);
  }

  function markTameAsReadOnlyRecord(f) {
    checkCanControlTaming(f);
    tameAs.set(f, tameTypes.READ_ONLY_RECORD);
    return f;
  }

  function markTameAsFunction(f, name) {
    checkCanControlTaming(f);
    tameAs.set(f, tameTypes.FUNCTION);
    tameFunctionName.set(f, name);
    return f;
  }

  function markTameAsCtor(ctor, opt_super, name) {
    checkCanControlTaming(ctor);
    var ctype = typeof ctor;
    var stype = typeof opt_super;
    if (ctype !== 'function') {
      throw new TypeError('Cannot tame ' + ctype + ' as ctor');
    }
    if (opt_super && stype !== 'function') {
      throw new TypeError('Cannot tame ' + stype + ' as superclass ctor');
    }
    tameAs.set(ctor, tameTypes.CONSTRUCTOR);
    tameFunctionName.set(ctor, name);
    tameCtorSuper.set(ctor, opt_super);
    return ctor;
  }

  function markTameAsXo4a(f, name) {
    checkCanControlTaming(f);
    var ftype = typeof f;
    if (ftype !== 'function') {
      throw new TypeError('Cannot tame ' + ftype + ' as function');
    }
    tameAs.set(f, tameTypes.XO4A);
    tameFunctionName.set(f, name);
    return f;
  }

  function grantTameAsMethod(f, prop) {
    checkCanControlTaming(f);
    checkNonNumeric(prop);
    grantAs.set(f, prop, grantTypes.METHOD);
    grantAs.set(f, prop, grantTypes.READ);
  }

  function grantTameAsRead(f, prop) {
    checkCanControlTaming(f);
    checkNonNumeric(prop);
    grantAs.set(f, prop, grantTypes.READ);
  }

  function grantTameAsReadWrite(f, prop) {
    checkCanControlTaming(f);
    checkNonNumeric(prop);
    grantAs.set(f, prop, grantTypes.READ);
    grantAs.set(f, prop, grantTypes.WRITE);
  }

  function grantTameAsReadOverride(f, prop) {
    checkCanControlTaming(f);
    checkNonNumeric(prop);
    grantAs.set(f, prop, grantTypes.READ);
    grantAs.set(f, prop, grantTypes.OVERRIDE);
  }

  // Met the ghost of Greg Kiczales at the Hotel Advice.
  // This is what I told him as I gazed into his eyes:
  // Objects were for contracts,
  // Functions made for methods,
  // Membranes made for interposing semantics around them!

  function initAdvice(f) {
    if (!functionAdvice.has(f)) {
      functionAdvice.set(f, function tamingNullAdvice(self, args) {
        return f.apply(self, args);
      });
    }
    return functionAdvice.get(f);
  }

  function adviseFunctionBefore(f, advice) {
    var p = initAdvice(f);
    functionAdvice.set(f, function tamingBeforeAdvice(self, args) {
      return p(self, advice(f, self, args));
    });
  }
  
  function adviseFunctionAfter(f, advice) {
    var p = initAdvice(f);
    functionAdvice.set(f, function tamingAfterAdvice(self, args) {
      return advice(f, self, p(self, args));
    });
  }

  function adviseFunctionAround(f, advice) {
    var p = initAdvice(f);
    functionAdvice.set(f, function tamingAroundAdvice(self, args) {
      return advice(p, self, args);
    });
  }

  ///////////////////////////////////////////////////////////////////////////

  return Object.freeze({
    // Public facet, providing taming controls to clients
    published: Object.freeze({
      markTameAsReadOnlyRecord: markTameAsReadOnlyRecord,
      markTameAsFunction: markTameAsFunction,
      markTameAsCtor: markTameAsCtor,
      markTameAsXo4a: markTameAsXo4a,
      grantTameAsMethod: grantTameAsMethod,
      grantTameAsRead: grantTameAsRead,
      grantTameAsReadWrite: grantTameAsReadWrite,
      grantTameAsReadOverride: grantTameAsReadOverride,
      adviseFunctionBefore: adviseFunctionBefore,
      adviseFunctionAfter: adviseFunctionAfter,
      adviseFunctionAround: adviseFunctionAround
    }),
    // Control facet, exposed to taming membrane instances
    control: Object.freeze({
      grantTypes: grantTypes,
      grantAs: grantAs,
      tameTypes: tameTypes,
      tameAs: tameAs,
      tameFunctionName: tameFunctionName,
      tameCtorSuper: tameCtorSuper,
      applyFeralFunction: applyFeralFunction,
      fix: fix
    })});
}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['TamingSchema'] = TamingSchema;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Generic taming membrane implementation.
 *
 * @requires WeakMap, ArrayBuffer, Int8Array, Uint8Array, Uint8ClampedArray,
 *    Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array,
 *    Float64Array, DataView
 * @overrides window
 * @provides TamingMembrane
 */
function TamingMembrane(helper, schema) {

  'use strict';

  var feralByTame = new WeakMap();
  var tameByFeral = new WeakMap();
  helper.weakMapPermitHostObjects(tameByFeral);

  // Useless value provided as a safe 'this' value to functions.
  feralByTame.set(helper.USELESS, helper.USELESS);
  tameByFeral.set(helper.USELESS, helper.USELESS);

  // Distinguished value returned when directConstructor() wishes to indicate
  // that the direct constructor of some object is the native primordial
  // "Object" function of some JavaScript frame.
  var BASE_OBJECT_CONSTRUCTOR = Object.freeze({});

  function directConstructor(obj) {
    if (obj === null) { return void 0; }
    if (obj === void 0) { return void 0; }
    if ((typeof obj) !== 'object') {
      // Regarding functions, since functions return undefined,
      // directConstructor() doesn't provide access to the
      // forbidden Function constructor.
      // Otherwise, we don't support finding the direct constructor
      // of a primitive.
      return void 0;
    }
    var directProto = Object.getPrototypeOf(obj);
    if (!directProto) { return void 0; }
    var directCtor = directProto.constructor;
    if (!directCtor) { return void 0; }
    helper.allFrames().forEach(function(w) {
      var O;
      try {
        O = w.Object;
      } catch (e) {
        // met a different-origin frame, probably
        return;
      }
      if (directCtor === O) {
        if (!Object.prototype.hasOwnProperty.call(directProto, 'constructor')) {
          // detect prototypes which just didn't bother to set .constructor and
          // inherited it from Object (Safari's DOMException is the motivating
          // case).
          directCtor = void 0;
        } else {
          directCtor = BASE_OBJECT_CONSTRUCTOR;
        }
      }
    });
    return directCtor;
  }

  function getObjectCtorFor(o) {
    if (o === undefined || o === null) {
      return void 0;
    }
    var ot = typeof o;
    if (ot !== 'object' && ot !== 'function') {
      throw new TypeError('Cannot obtain ctor for non-object');
    }
    var proto = undefined;
    while (o) {
      proto = o;
      o = Object.getPrototypeOf(o);
    }
    return proto.constructor;
  }

  function isNumericName(n) {
    return typeof n === 'number' || ('' + (+n)) === n;
  }

  function preventExtensions(o) {
    return ((void 0) === o) ? (void 0) : Object.preventExtensions(o);
  }

  // Applies a function 'feralFunction' ensuring that either the return
  // value is tamed or the thrown exception is tamed and rethrown.
  function applyFeralFunction(feralFunction, feralThis, feralArguments) {
    try {
      return tame(
          schema.applyFeralFunction(
              feralFunction,
              feralThis,
              feralArguments));
    } catch (e) {
      throw tameException(e);
    }
  }

  // Applies a guest-side function 'tameFunction' ensuring that either the
  // return value is untamed or the thrown exception is untamed and rethrown.
  function applyTameFunction(tameFunction, tameThis, tameArguments) {
    try {
      return untame(tameFunction.apply(tameThis, tameArguments));
    } catch (e) {
      throw untameException(e);
    }
  }

  function getFeralProperty(feralObject, feralProp) {
    try {
      return tame(feralObject[feralProp]);
    } catch (e) {
      throw tameException(e);
    }
  }

  function setFeralProperty(feralObject, feralProp, feralValue) {
    try {
      feralObject[feralProp] = feralValue;
    } catch (e) {
      throw tameException(e);
    }
  }

  function getTameProperty(tameObject, tameProp) {
    try {
      return untame(tameObject[tameProp]);
    } catch (e) {
      throw untameException(e);
    }
  }

  function setTameProperty(tameObject, tameProp, tameValue) {
    try {
      tameObject[tameProp] = tameValue;
    } catch (e) {
      throw untameException(e);
    }
  }

  /**
   * Given a builtin object "o" from either side of the membrane, return a copy
   * constructed in the taming frame. Return undefined if "o" is not of a type
   * handled here. Note that we only call this function if we know that "o" is
   * *not* a primitive.
   *
   * This function handles only objects which we copy exactly once and reuse
   * the copy (via tamesTo()) if the same object is met again. For objects which
   * we copy every  time they are passed across the membrane, see
   * copyTreatedMutable below.
   */
  function copyTreatedImmutable(o) {
    var t = void 0;
    switch (Object.prototype.toString.call(o)) {
      case '[object Boolean]':
        t = new Boolean(o.valueOf());
        break;
      case '[object Date]':
        t = new Date(o.valueOf());
        break;
      case '[object Number]':
        t = new Number(o.valueOf());
        break;
      case '[object RegExp]':
        t = new RegExp(
            o.source,
            (o.global ? 'g' : '') +
            (o.ignoreCase ? 'i' : '') +
            (o.multiline ? 'm' : ''));
        break;
      case '[object String]':
        t = new String(o.valueOf());
        break;
      case '[object Error]':
      case '[object DOMException]':
        // paranoia -- Error constructor is specified to stringify
        var msg = '' + o.message;
        var name = o.name;
        switch (name) {
          case 'Error':
            t = new Error(msg);
            break;
          case 'EvalError':
            t = new EvalError(msg);
            break;
          case 'RangeError':
            t = new RangeError(msg);
            break;
          case 'ReferenceError':
            t = new ReferenceError(msg);
            break;
          case 'SyntaxError':
            t = new SyntaxError(msg);
            break;
          case 'TypeError':
            t = new TypeError(msg);
            break;
          case 'URIError':
            t = new URIError(msg);
            break;
          // no case for DOMException as DOMException is not constructible
          // (and also not whitelisted, and in general more funky).
          default:
            t = new Error(msg);
            t.name = '' + name;
            break;
        }
        break;
    }
    return t;
  }

  function copyArray(o, recursor) {
    var copy = [];
    for (var i = 0; i < o.length; i++) {
      copy[i] = recursor(o[i]);
    }
    return Object.freeze(copy);
  }
  
  /**
   * Given a builtin object "o" from either side of the membrane, return a copy
   * constructed in the taming frame. Return undefined if "o" is not of a type
   * handled here. Note that we only call this function if we know that "o" is
   * *not* a primitive.
   *
   * This function handles only objects which should be copied every time they
   * are passed across the membrane. For objects which we wish to copy at most
   * once, see copyTreatedImmutable above.
   */
  function copyTreatedMutable(o, recursor) {
    if (Array.isArray(o)) {
      // No tamesTo(...) for arrays; we copy across the membrane
      return copyArray(o, recursor);
    } else {
      var t = undefined;
      switch (Object.prototype.toString.call(o)) {
        // Note that these typed array tamings break any buffer sharing, but
        // that's in line with our general policy of copying.
        case '[object ArrayBuffer]':
          t = ArrayBuffer.prototype.slice.call(o, 0);
          break;
        case '[object Int8Array]': t = new Int8Array(o); break;
        case '[object Uint8Array]': t = new Uint8Array(o); break;
        case '[object Uint8ClampedArray]': t = new Uint8ClampedArray(o); break;
        case '[object Int16Array]': t = new Int16Array(o); break;
        case '[object Uint16Array]': t = new Uint16Array(o); break;
        case '[object Int32Array]': t = new Int32Array(o); break;
        case '[object Uint32Array]': t = new Uint32Array(o); break;
        case '[object Float32Array]': t = new Float32Array(o); break;
        case '[object Float64Array]': t = new Float64Array(o); break;
        case '[object DataView]':
          t = new DataView(recursor(o.buffer), o.byteOffset, o.byteLength);
          break;
      }
      return t;
    }
  }

  // This is a last resort for passing a safe "demilitarized zone" exception
  // across the taming membrane in cases where passing the actual thrown
  // exception is either problematic or not known to be safe.
  function makeNeutralException(e) {
    var str = 'Error';
    try {
      str = e.toString();
    } catch (ex) {}
    return new Error(str);
  }

  function tameException(f) {
    var t = void 0;
    try { t = tame(f); } catch (e) {}
    if (t !== void 0) { return t; }
    return makeNeutralException(f);
  }

  function untameException(t) {
    var f = void 0;
    try { f = untame(t); } catch (e) {}
    if (f !== void 0) { return f; }
    return makeNeutralException(t);
  }

  /**
   * Records that f is t's feral twin and t is f's tame twin.
   * <p>
   * A <i>feral</i> object is one safe to make accessible to trusted
   * but possibly innocent host code. A <i>tame</i> object is one
   * safe to make accessible to untrusted guest
   * code. tamesTo(f, t) records that f is feral, that t is tamed,
   * and that they are in one-to-one correspondence so that
   * tame(f) === t and untame(t) === f.
   */
  function tamesTo(f, t) {
    if ((f && tameByFeral.has(f)) || (t && feralByTame.has(t))) {
      var et = tameByFeral.get(f);
      var ef = feralByTame.get(t);
      throw new TypeError('Attempt to multiply tame: ' + f + 
          (ef ? ' (already ' + (ef === f ? 'same' : ef) + ')' : '') +
          ' <-> ' + t +
          (et ? ' (already ' + (et === t ? 'same' : et) + ')' : ''));
    }
    reTamesTo(f, t);
  }

  function reTamesTo(f, t) {
    var ftype = typeof f;
    if (!f || (ftype !== 'function' && ftype !== 'object')) {
      throw new TypeError('Unexpected feral primitive: ', f);
    }
    var ttype = typeof t;
    if (!t || (ttype !== 'function' && ttype !== 'object')) {
      throw new TypeError('Unexpected tame primitive: ', t);
    }

    tameByFeral.set(f, t);
    feralByTame.set(t, f);
    schema.fix(f);
  }

  function errGet(p) {
    return Object.freeze(function() {
      throw new TypeError('Unreadable property: ' + p);
    });
  }

  function errSet(p) {
    return Object.freeze(function() {
      throw new TypeError('Unwriteable property: ' + p);
    });
  }

  /**
   * Returns a tame object representing f, or undefined on failure.
   */
  function tame(f) {
    if (f !== Object(f)) {
      // Primitive value; tames to self
      return f;
    }
    var t = tameByFeral.get(f);
    if (t) { return t; }
    t = copyTreatedMutable(f, tame);
    if (t) { return t; }
    if (feralByTame.has(f)) {
      throw new TypeError('Tame object found on feral side of taming membrane: '
          + f + '. The membrane has previously been compromised.');
    }
    var ftype = typeof f;
    if (ftype === 'object') {
      var ctor = directConstructor(f);
      if (ctor === BASE_OBJECT_CONSTRUCTOR) {
        t = preventExtensions(tameRecord(f));
      } else {
        t = copyTreatedImmutable(f);
        if (t === void 0) {
          if (ctor === void 0) {
            throw new TypeError('Cannot determine ctor of: ' + f);
          } else {
            t = tamePreviouslyConstructedObject(f, ctor);
          }
        }
      }
    } else if (ftype === 'function') {
      switch (schema.tameAs.get(f)) {
        case schema.tameTypes.CONSTRUCTOR:
          t = tameCtor(f, schema.tameCtorSuper.get(f), schema.tameFunctionName.get(f));
          break;
        case schema.tameTypes.FUNCTION:
          t = tamePureFunction(f, schema.tameFunctionName.get(f));
          break;
        case schema.tameTypes.XO4A:
          t = tameXo4a(f, schema.tameFunctionName.get(f));
          break;
        default:
          t = void 0;
          break;
      }
    }
    if (t) {
      tamesTo(f, t);
    }

    return t;
  }

  function isValidPropertyName(p) {
    return !/.*__$/.test(p);
  }

  // Tame a feral record by iterating over all own properties of the feral
  // record and installing a property handler for each one. Tame object is not
  // frozen; that is up to the caller to do when appropriate.
  function tameRecord(f, t) {
    if (!t) { t = {}; }
    var readOnly = schema.tameAs.get(f) === schema.tameTypes.READ_ONLY_RECORD;
    Object.keys(f).forEach(function(p) {
      if (isNumericName(p)) { return; }
      if (!isValidPropertyName(p)) { return; }
      var get = function() {
        return getFeralProperty(f, p);
      };
      var set = readOnly ? undefined :
          function(v) {
            setFeralProperty(f, p, untame(v));
            return v;
          };
      Object.defineProperty(t, p, {
        enumerable: true,
        configurable: false,
        get: get,
        set: set ? set : errSet(p)
      });
    });
    return t;
  }

  function tamePreviouslyConstructedObject(f, fc) {
    if (schema.tameAs.get(fc) !== schema.tameTypes.CONSTRUCTOR) {
      return void 0;
    }
    var tc = tame(fc);
    var t = Object.create(tc.prototype);
    tameObjectWithMethods(f, t);
    return t;
  }

  function addFunctionPropertyHandlers(f, t) {
    schema.grantAs.getProps(f).forEach(function(p) {
      if (!isValidPropertyName(p)) { return; }
      var get = !schema.grantAs.has(f, p, schema.grantTypes.READ) ? undefined :
          function() {
            return getFeralProperty(f, p);
          };
      var set = !schema.grantAs.has(f, p, schema.grantTypes.WRITE) ? undefined :
          function(v) {
            setFeralProperty(f, p, untame(v));
            return v;
          };
      if (get || set) {
        Object.defineProperty(t, p, {
          enumerable: true,
          configurable: false,
          get: get ? get : errGet(p),
          set: set ? set : errSet(p)
        });
      }
    });
  }

  // CAUTION: It is ESSENTIAL that we pass USELESS, not (void 0), when
  // calling down to a feral function. That function may not be declared
  // in "strict" mode, and so would receive [window] as its "this" arg if
  // we called it with (void 0), which would be a serious vulnerability.

  function tamePureFunction(f) {
    var t = function(_) {
      return applyFeralFunction(
          f,
          helper.USELESS,  // See notes on USELESS above
          copyArray(arguments, untame));
    };
    addFunctionPropertyHandlers(f, t);
    preventExtensions(t);
    return t;
  }

  function tameCtor(f, fSuper, name) {
    var fPrototype = f.prototype;

    var t = function (_) {
      if (!(this instanceof t)) {
        // Call as a function
        return applyFeralFunction(
            f,
            (void 0),
            copyArray(arguments, untame));
      } else {
        // Call as a constructor
        var o = Object.create(fPrototype);
        applyFeralFunction(f, o, copyArray(arguments, untame));
        tameObjectWithMethods(o, this);
        tamesTo(o, this);
      }
    };

    if (tameByFeral.get(fPrototype)) {
      throw new TypeError(
          'Prototype of constructor ' + f + ' has already been tamed');
    }

    tameRecord(f, t);

    var tPrototype = (function() {
      if (!fSuper || (fSuper === getObjectCtorFor(fSuper))) {
        return {};
      }
      if (!schema.tameAs.get(fSuper) === schema.tameTypes.CONSTRUCTOR) {
        throw new TypeError('Super ctor ' + fSuper + ' not granted as such');
      }
      var tSuper = tame(fSuper);
      return Object.create(tSuper.prototype);
    })();

    tameObjectWithMethods(fPrototype, tPrototype);

    Object.defineProperty(tPrototype, 'constructor', {
      writable: false,
      configurable: false,
      enumerable: true,
      value: t
    });

    Object.freeze(tPrototype);

    tamesTo(fPrototype, tPrototype);

    // FIXME(ihab.awad): Investigate why this fails *only* in ES53 mode
    // t.name = name;

    t.prototype = tPrototype;
    Object.freeze(t);

    return t;
  }

  function tameXo4a(f) {
    var t = function(_) {
      return applyFeralFunction(
          f,
          untame(this),
          copyArray(arguments, untame));
    };
    addFunctionPropertyHandlers(f, t);
    preventExtensions(t);
    return t;
  }

  function makePrototypeMethod(proto, func) {
    return function(_) {
      if (!inheritsFrom(this, proto)) {
        throw new TypeError('Target object not permitted: ' + this);
      }
      return func.apply(this, arguments);
    };
  }

  function makeStrictPrototypeMethod(proto, func) {
    return function(_) {
      if ((this === proto) || !inheritsFrom(this, proto)) {
        throw new TypeError('Target object not permitted: ' + this);
      }
      return func.apply(this, arguments);
    };
  }

  function inheritsFrom(o, proto) {
    while (o) {
      if (o === proto) { return true; }
      o = Object.getPrototypeOf(o);
    }
    return false;
  }

  function makePropertyGetter(f, t, p) {
    if (schema.grantAs.has(f, p, schema.grantTypes.METHOD)) {
      // METHOD access implies READ, and requires careful wrapping of the
      // feral method being exposed
      return makePrototypeMethod(t, function() {
        var self = this;
        return function(_) {
          return applyFeralFunction(
              untame(self)[p],
              untame(self),
              copyArray(arguments, untame));
        };
      });
    } else if (schema.grantAs.has(f, p, schema.grantTypes.READ)) {
      // Default READ access implies normal taming of the property value
      return makePrototypeMethod(t, function() {
        return getFeralProperty(untame(this), p);
      });
    } else {
      return undefined;
    }
  }

  function makePropertySetter(f, t, p) {
    var override =
      schema.grantAs.has(f, p, schema.grantTypes.OVERRIDE) ||
      (schema.grantAs.has(f, p, schema.grantTypes.METHOD) &&
       schema.grantAs.has(f, p, schema.grantTypes.WRITE));

    if (override) {
      return makeStrictPrototypeMethod(t, function(v) {
        setFeralProperty(untame(this), p, untame(v));
        return v;
      });
    } else if (schema.grantAs.has(f, p, schema.grantTypes.WRITE)) {
      return makePrototypeMethod(t, function(v) {
        setFeralProperty(untame(this), p, untame(v));
        return v;
      });
    } else {
      return undefined;
    }
  }

  function defineObjectProperty(f, t, p) {
    var get = makePropertyGetter(f, t, p);
    var set = makePropertySetter(f, t, p);
    if (get || set) {
      Object.defineProperty(t, p, {
        enumerable: true,
        configurable: false,
        get: get ? get : errGet(p),
        set: set ? set : errSet(p)
      });
    }
  }

  function tameObjectWithMethods(f, t) {
    if (!t) { t = {}; }
    schema.grantAs.getProps(f).forEach(function(p) {
      if (isValidPropertyName(p)) {
        defineObjectProperty(f, t, p);
      }
    });
    return t;
  }

  /**
   * Returns a feral object representing t, or undefined on failure.
   */
  function untame(t) {
    if (t !== Object(t)) {
      // Primitive value; untames to self
      return t;
    }
    var f = feralByTame.get(t);
    if (f) { return f; }
    f = copyTreatedMutable(t, untame);
    if (f) { return f; }
    if (tameByFeral.has(t)) {
      throw new TypeError('Feral object found on tame side of taming membrane: '
          + t + '. The membrane has previously been compromised.');
    }
    if (!helper.isDefinedInCajaFrame(t)) {
      throw new TypeError('Host object leaked without being tamed');
    }
    var ttype = typeof t;
    if (ttype === 'object') {
      var ctor = directConstructor(t);
      if (ctor === BASE_OBJECT_CONSTRUCTOR) {
        f = untameCajaRecord(t);
      } else {
        f = copyTreatedImmutable(t);
        if (f === void 0) {
          throw new TypeError(
              'Untaming of guest constructed objects unsupported: ' + t);
        }
      }
    } else if (ttype === 'function') {
      f = Object.freeze(untameCajaFunction(t));
    }
    if (f) { tamesTo(f, t); }
    return f;
  }

  function untameCajaFunction(t) {
    // Untaming of *constructors* which are defined in Caja is unsupported.
    // We untame all functions defined in Caja as xo4a.
    return function(_) {
      return applyTameFunction(t, tame(this), copyArray(arguments, tame));
    };
  }

  function untameCajaRecord(t) {
    var f = {};
    Object.getOwnPropertyNames(t).forEach(function(p) {
      var d = Object.getOwnPropertyDescriptor(t, p);
      var read = d.get || d.hasOwnProperty('value');
      var write = d.set || (d.hasOwnProperty('value') && d.writable);
      var get = !read ? undefined :
          function() {
             return getTameProperty(t, p);
          };
      var set = !write ? undefined :
          function(v) {
            setTameProperty(t, p, tame(v));
            return v;
          };
      if (get || set) {
        Object.defineProperty(f, p, {
          enumerable: true,
          configurable: false,
          get: get ? get : errGet(p),
          set: set ? set : errSet(p)
        });
      }
    });
    return preventExtensions(f);
  }

  function hasTameTwin(f) {
    return tameByFeral.has(f);
  }

  function hasFeralTwin(t) {
    return feralByTame.has(t);
  }

  return Object.freeze({
    tame: tame,
    untame: untame,
    tamesTo: tamesTo,
    reTamesTo: reTamesTo,
    hasTameTwin: hasTameTwin,
    hasFeralTwin: hasFeralTwin,
    
    // Any code which bypasses the membrane (e.g. in order to provide its own
    // tame twins, as Domado does) must also filter exceptions resulting from
    // control flow crossing the membrane.
    tameException: tameException,
    untameException: untameException
  });
}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['TamingMembrane'] = TamingMembrane;
}
;
// Copyright 2007-2009 Tyler Close
// under the terms of the MIT X license found at
// http://www.opensource.org/licenses/mit-license.html


/**
 * Implementation of promises for SES/ES5.
 * Exports Q to the global scope.
 *
 * Mostly taken from the ref_send implementation by Tyler Close, with the
 * addition of a trademark table to support promises for functions. Originally
 * written for Cajita, then ported to SES by Kevin Reid.
 *
 * @contributor maoziqing@gmail.com, kpreid@switchb.org
 * @requires setTimeout, WeakMap, cajaVM
 * @overrides window
 * @provides Q
 */

var Q;

(function() {
  "use strict";

  // Table of functions-which-are-promises
  var promises = new WeakMap(true);

  function reject(reason) {
    function rejected(op, arg1, arg2, arg3) {
      if (undefined === op) { return rejected; }
        if ('WHEN' === op) { return arg2 ? arg2(reason) : reject(reason); }
          return arg1 ? arg1(reject(reason)) : reject(reason);
    }
    rejected.reason = reason;
    promises.set(rejected, true);
    return rejected;
  }

  function ref(value) {
    if (null === value || undefined === value) {
      return reject({ 'class': [ 'NaO' ] });
    }
    if ('number' === typeof value && !isFinite(value)) {
      return reject({ 'class': [ 'NaN' ] });
    }
    function fulfilled(op, arg1, arg2, arg3) {
      if (undefined === op) { return value; }
      var r;
      switch (op) {
        case 'WHEN':
          r = value;
          break;
        case 'GET':
          if (undefined === arg2 || null === arg2) {
            r = value;
          } else {
            r = value[arg2];
          }
          break;
        case 'POST':
          if (undefined === arg2 || null === arg2) {
            r = reject({});
          } else {
            r = value[arg2].apply(value, arg3);
          }
          break;
        case 'PUT':
          if (undefined === arg2 || null === arg2) {
            r = reject({});
          } else {
            value[arg2] = arg3;
            r = {};
          }
          break;
        case 'DELETE':
          if (undefined === arg2 || null === arg2) {
            r = reject({});
          } else {
            delete value[arg2];
            r = {};
          }
          break;
        default:
          r = reject({});
      }
      return arg1 ? arg1.apply(null, [r]) : r;
    }
    promises.set(fulfilled, true);
    return fulfilled;
  }
 	
  var enqueue = (function () {
    var active = false;
    var pending = [];
    var run = function () {
      var task = pending.shift();
      if (0 === pending.length) {
        active = false;
      } else {
        setTimeout(run, 0);
      }
      task();
    };
    return function (task) {
      pending.push(task);
      if (!active) {
        setTimeout(run, 0);
        active = true;
      }
    };
  }());
 	
  /**
   * Enqueues a promise operation.
   *
   * The above functions, reject() and ref(), each construct a kind of
   * promise. Other libraries can provide other kinds of promises by
   * implementing the same API. A promise is a function with signature:
   * function (op, arg1, arg2, arg3). The first argument determines the
   * interpretation of the remaining arguments. The following cases exist:
   *
   * 'op' is undefined:
   *  Return the most resolved current value of the promise.
   *
   * 'op' is "WHEN":
   *  'arg1': callback to invoke with the fulfilled value of the promise
   *  'arg2': callback to invoke with the rejection reason for the promise
   *
   * 'op' is "GET":
   *  'arg1': callback to invoke with the value of the named property
   *  'arg2': name of the property to read
   *
   * 'op' is "POST":
   *  'arg1': callback to invoke with the return value from the invocation
   *  'arg2': name of the method to invoke
   *  'arg3': array of invocation arguments
   *
   * 'op' is "PUT":
   *  'arg1': callback to invoke with the return value from the operation
   *  'arg2': name of the property to set
   *  'arg3': new value of property
   *
   * 'op' is "DELETE":
   *  'arg1': callback to invoke with the return value from the operation
   *  'arg2': name of the property to delete
   *
   * 'op' is unrecognized:
   *  'arg1': callback to invoke with a rejected promise
   */
  function forward(p, op, arg1, arg2, arg3) {
    enqueue(function () { p(op, arg1, arg2, arg3); });
  }

  /**
   * Gets the corresponding promise for a given reference.
   */
  function promised(value) {
    return ('function' === typeof value && promises.get(value))
        ? value : ref(value);
  }

  function defer() {
    var value;
    var pending = [];
    function promise(op, arg1, arg2, arg3) {
      if (undefined === op) { return pending ? promise : value(); }
      if (pending) {
        pending.push({ op: op, arg1: arg1, arg2: arg2, arg3: arg3 });
      } else {
        forward(value, op, arg1, arg2, arg3);
      }
    }
    promises.set(promise, true);
    return cajaVM.def({
      promise: promise,
      resolve: function (p) {
        if (!pending) { return; }

        var todo = pending;
        pending = null;
        value = promised(p);
        for (var i = 0; i !== todo.length; i += 1) {
          var x = todo[+i];
          forward(value, x.op, x.arg1, x.arg2, x.arg3);
        }
      }
    });
  }

  Q = cajaVM.def({
    /**
     * Enqueues a task to be run in a future turn.
     * @param task  function to invoke later
     */
    run: enqueue,

    /**
     * Constructs a rejected promise.
     * @param reason    value describing the failure
     */
    reject: reject,

    /**
     * Constructs a promise for an immediate reference.
     * @param value immediate reference
     */
    ref: ref,

    /**
     * Constructs a ( promise, resolver ) pair.
     *
     * The resolver is a callback to invoke with a more resolved value for
     * the promise. To fulfill the promise, simply invoke the resolver with
     * an immediate reference. To reject the promise, invoke the resolver
     * with the return from a call to reject(). To put the promise in the
     * same state as another promise, invoke the resolver with that other
     * promise.
     */
    defer: defer,

    /**
     * Gets the current value of a promise.
     * @param value promise or immediate reference to evaluate
     */
    near: function (value) {
      return ('function' === typeof value && promises.get(value))
          ? value() : value;
    },

    /**
     * Registers an observer on a promise.
     * @param value     promise or immediate reference to observe
     * @param fulfilled function to be called with the resolved value
     * @param rejected  function to be called with the rejection reason
     * @return promise for the return value from the invoked callback
     */
    when: function (value, fulfilled, rejected) {
      var r = defer();
      var done = false;   // ensure the untrusted promise makes at most a
                          // single call to one of the callbacks
      forward(promised(value), 'WHEN', function (x) {
        if (done) { throw new Error(); }
        done = true;
        r.resolve(ref(x)('WHEN', fulfilled, rejected));
      }, function (reason) {
        if (done) { throw new Error(); }
        done = true;
        r.resolve(rejected ? rejected.apply(null, [reason]) : reject(reason));
      });
      return r.promise;
    },

    /**
     * Gets the value of a property in a future turn.
     * @param target    promise or immediate reference for target object
     * @param noun      name of property to get
     * @return promise for the property value
     */
    get: function (target, noun) {
      var r = defer();
      forward(promised(target), 'GET', r.resolve, noun);
      return r.promise;
    },

    /**
     * Invokes a method in a future turn.
     * @param target    promise or immediate reference for target object
     * @param verb      name of method to invoke
     * @param argv      array of invocation arguments
     * @return promise for the return value
     */
    post: function (target, verb, argv) {
      var r = defer();
      forward(promised(target), 'POST', r.resolve, verb, argv);
      return r.promise;
    },

    /**
     * Sets the value of a property in a future turn.
     * @param target    promise or immediate reference for target object
     * @param noun      name of property to set
     * @param value     new value of property
     * @return promise for the return value
     */
    put: function (target, noun, value) {
      var r = defer();
      forward(promised(target), 'PUT', r.resolve, noun, value);
      return r.promise;
    },

    /**
     * Deletes a property in a future turn.
     * @param target    promise or immediate reference for target object
     * @param noun      name of property to delete
     * @return promise for the return value
     */
    remove: function (target, noun) {
      var r = defer();
      forward(promised(target), 'DELETE', r.resolve, noun);
      return r.promise;
    }
  });
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['Q'] = Q;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @requires setTimeout URI
 * @provides GuestManager
 * @overrides window
 */

/**
 * A GuestManager is a handle to an instance of a Caja sandbox.
 *
 * Methods on GuestManager are somewhat redundant because this consolidates
 * what used to be two different but similar objects.
 *
 * API variant 1:
 *    caja.makeFrameGroup(..., function (frameGroup) {
 *        frameGroup.makeES5Frame(..., function (frame) {
 *            frame.url(...).run(api, callback);
 *
 * API variant 2:
 *    caja.load(..., function (frame) {
 *        frame.code(...).api(api).run(callback);
 *    });
 *
 * The "frame" parameters were once different objects with subtly different
 * semantics that don't matter in practice.  GuestManager combines the two.
 */

function GuestManager(frameTamingSchema, frameTamingMembrane, divInfo,
    hostBaseUrl, domicile, htmlEmitter, guestWin, USELESS, uriPolicy, runImpl) {
  // TODO(felix8a): this api needs to be simplified; it's difficult to
  // explain what all the parameters mean in different situations.
  var args = {
    // url to fetch, or imputed origin of content
    url: undefined,

    // Content type for the url or the uncajoledContent.
    // If not specified, uncajoledContent assumes text/html,
    // and url fetch assumes type based on filename suffix.
    mimeType: undefined,

    uncajoledContent: undefined,

    moreImports: undefined,

    // Enable Flash support
    flash: true
  };

  function copyStringMap(o) {
    var r = {};
    for (var k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) {
        r[k] = o[k];
      }
    }
    return r;
  }

  var self = {
    // Public state
    div: divInfo.opt_div && divInfo.opt_div.parentNode,
    idClass: divInfo.idClass,
    getUrl: function() { return args.url; },
    getUriPolicy: function() { return uriPolicy; },

    getElementByGuestId: domicile
        ? function(id) {
          return self.untame(
              Object.prototype.v___
                  ? self.imports.v___('document').m___('getElementById', [id])
                  : self.imports.document.getElementById(id));
        }
        : function(_) {
          return null;
        },

    rewriteUri: domicile
        ? function(url, mime, opts) {
          return self.untame(
              Object.prototype.v___
                  ? domicile.m___('rewriteUri', [
                      url,
                      mime,
                      copyStringMap(opts)])
                  : domicile.rewriteUri(
                      url,
                      mime,
                      copyStringMap(opts)));
        }
        : function(_) {
          return null;
        },

    // deprecated; idSuffix in domado means '-' + idClass, but idSuffix
    // exposed here is without the leading '-'.  Future code should use the
    // idClass property instead.
    idSuffix: divInfo.idClass,

    // TODO(kpreid): rename/move to make sure this is used only for testing
    // as SES now doesn't have a distinct guestWin which could cause confusion.
    iframe: guestWin.frameElement,

    imports: (domicile
              ? domicile.window
              : guestWin.cajaVM.makeImports()),
    innerContainer: domicile && domicile.getPseudoDocument(),
    outerContainer: divInfo.opt_div,

    // Internal state
    domicile: domicile,      // Currently exposed only for the test suite
    htmlEmitter: htmlEmitter,

    // Taming utilities
    tame: frameTamingMembrane.tame,
    untame: frameTamingMembrane.untame,
    tamesTo: frameTamingMembrane.tamesTo,
    reTamesTo: frameTamingMembrane.reTamesTo,
    hasTameTwin: frameTamingMembrane.hasTameTwin,

    markReadOnlyRecord: frameTamingSchema.published.markTameAsReadOnlyRecord,
    markFunction: frameTamingSchema.published.markTameAsFunction,
    markCtor: frameTamingSchema.published.markTameAsCtor,
    markXo4a: frameTamingSchema.published.markTameAsXo4a,
    grantMethod: frameTamingSchema.published.grantTameAsMethod,
    grantRead: frameTamingSchema.published.grantTameAsRead,
    grantReadWrite: frameTamingSchema.published.grantTameAsReadWrite,
    grantReadOverride: frameTamingSchema.published.grantTameAsReadOverride,
    adviseFunctionBefore: frameTamingSchema.published.adviseFunctionBefore,
    adviseFunctionAfter: frameTamingSchema.published.adviseFunctionAfter,
    adviseFunctionAround: frameTamingSchema.published.adviseFunctionAround,

    USELESS: USELESS,

    api: function (imports) {
      args.moreImports = imports;
      return self;
    },

    flash: function(flag) {
      args.flash = !!flag;
      return self;
    },

    code: function (url, opt_mimeType, opt_content) {
      args.url = url;
      args.mimeType = opt_mimeType;
      args.uncajoledContent = opt_content;
      return self;
    },

    content: function (url, content, opt_mimeType) {
      return self.code(url, opt_mimeType, content);
    },

    url: function (url, opt_mimeType) {
      return self.code(url, opt_mimeType, undefined);
    },

    run: run
  };

  return self;

  //----------------

  function run(opt_arg1, opt_arg2) {
    var moreImports, opt_runDone;
    if (opt_arg2) {
      moreImports = opt_arg1 || args.moreImports || {};
      opt_runDone = opt_arg2;
    } else {
      moreImports = args.moreImports || {};
      opt_runDone = opt_arg1;
    }
    if (domicile) {
      domicile.setBaseUri(URI.utils.resolve(hostBaseUrl, args.url));
    }
    return runImpl(self, args, moreImports, function(result) {
      setTimeout(function() { 
          if (opt_runDone) {
            opt_runDone(result);
          }
      }, 0);
    });
  }
}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['GuestManager'] = GuestManager;
}
;
// Copyright (C) 2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @provides cajaFrameTracker
 * @overrides window
 */

var cajaFrameTracker = (function() {

  var guestWindows = [];

  return {
    addGuestWindow: addGuestWindow,
    isDefinedInCajaFrame: isDefinedInCajaFrame
  };

  function addGuestWindow(w) {
    guestWindows.push(w);
  }

  function isDefinedInCajaFrame(o) {
    var ot = typeof o;
    if (ot !== 'object' && ot !== 'function') {
      return false;  // primitive
    }
    if (o instanceof Object) {
      return true;
    }
    for (var i = 0; i < guestWindows.length; i++) {
      if (o instanceof guestWindows[i].Object) {
        return true;
      }
    }
    return false;
  }
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['cajaFrameTracker'] = cajaFrameTracker;
}
;
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @provides SESFrameGroup
 * @requires bridalMaker
 * @requires cajaVM
 * @requires cajaFrameTracker
 * @requires Domado
 * @requires GuestManager
 * @requires Q
 * @requires ses
 * @requires TamingSchema
 * @requires TamingMembrane
 * @requires URI
 * @overrides window
 */

function SESFrameGroup(cajaInt, config, tamingWin, feralWin,
    additionalParams) {
  if (tamingWin !== window) {
    throw new Error('wrong frame');
  }

  tamingWin.ses.mitigateSrcGotchas = additionalParams.mitigateSrcGotchas;

  // CAUTION: It is ESSENTIAL that we pass USELESS, not (void 0), when
  // calling down to a feral function. That function may not be declared
  // in "strict" mode, and so would receive [window] as its "this" arg if
  // we called it with (void 0). This could lead to a vulnerability if the
  // function called happened to modify its "this" arg in some way that an
  // attacker could redirect into an attack on the global [window].
  var USELESS = Object.freeze({
    USELESS: 'USELESS',
    toString: function() { return '[Caja USELESS object]'; }
  });

  var tamingHelper = Object.freeze({
      isDefinedInCajaFrame: cajaFrameTracker.isDefinedInCajaFrame,
      USELESS: USELESS,
      weakMapPermitHostObjects: ses.weakMapPermitHostObjects,
      allFrames: allFrames
  });

  function allFrames() {
    var a = Array.prototype.slice.call(feralWin.frames);
    a.push(feralWin);
    return a;
  }

  var frameGroupTamingSchema = TamingSchema(tamingHelper);
  var frameGroupTamingMembrane =
      TamingMembrane(tamingHelper, frameGroupTamingSchema.control);

  var lazyDomado;
  function getDomado() {
    // don't construct Domado until we know we need it
    return lazyDomado || (lazyDomado = Domado());
  }

  // TODO(kpreid): Only used for XHR; dependency on feralWin is bogus
  var bridal = bridalMaker(feralWin.document);

  var unsafe = false;

  var frameGroup = {

    makeDefensibleObject___: makeDefensibleObject,
    makeDefensibleFunction___: makeDefensibleFunction,

    tame: frameGroupTamingMembrane.tame,
    tamesTo: frameGroupTamingMembrane.tamesTo,
    reTamesTo: frameGroupTamingMembrane.reTamesTo,
    untame: frameGroupTamingMembrane.untame,
    unwrapDom: function(o) { return o; },
    markReadOnlyRecord:
        frameGroupTamingSchema.published.markTameAsReadOnlyRecord,
    markFunction: frameGroupTamingSchema.published.markTameAsFunction,
    markCtor: frameGroupTamingSchema.published.markTameAsCtor,
    markXo4a: frameGroupTamingSchema.published.markTameAsXo4a,
    grantMethod: frameGroupTamingSchema.published.grantTameAsMethod,
    grantRead: frameGroupTamingSchema.published.grantTameAsRead,
    grantReadWrite: frameGroupTamingSchema.published.grantTameAsReadWrite,
    grantReadOverride: frameGroupTamingSchema.published.grantTameAsReadOverride,
    adviseFunctionBefore: frameGroupTamingSchema.published.adviseFunctionBefore,
    adviseFunctionAfter: frameGroupTamingSchema.published.adviseFunctionAfter,
    adviseFunctionAround: frameGroupTamingSchema.published.adviseFunctionAround,

    USELESS: USELESS,
    iframe: window.frameElement,

    Q: Q,

    makeES5Frame: makeES5Frame,
    disableSecurityForDebugger: disableSecurityForDebugger
  };

  return frameGroup;

  //----------------

  function disableSecurityForDebugger(value) {
    unsafe = !!value;
    if (tamingWin) {
      tamingWin.ses.DISABLE_SECURITY_FOR_DEBUGGER = unsafe;
    }
  }

  function makeDefensibleObject(descriptors) {
    return Object.seal(Object.create(Object.prototype, descriptors));
  }

  function makeDefensibleFunction(f) {
    // See notes on USELESS above
    return Object.freeze(function() {
      return f.apply(USELESS, Array.prototype.slice.call(arguments, 0));
    });
  }

  function applyFunction(f, dis, args) {
    return f.apply(dis, args);
  }

  function getProperty(o, p) {
    return o[p];
  }

  function setProperty(o, p, v) {
    return o[p] = v;
  }

  //----------------

  function makeES5Frame(div, uriPolicy, es5ready, domOpts) {
    var divInfo = cajaInt.prepareContainerDiv(div, feralWin, domOpts);

    var frameTamingSchema = TamingSchema(tamingHelper);
    var frameTamingMembrane =
        TamingMembrane(tamingHelper, frameTamingSchema.control);
    var domicileAndEmitter = makeDomicileAndEmitter(
        frameTamingMembrane, divInfo, uriPolicy);
    var domicile = domicileAndEmitter && domicileAndEmitter[0];
    var htmlEmitter = domicileAndEmitter && domicileAndEmitter[1];
    var gman = GuestManager(frameTamingSchema, frameTamingMembrane, divInfo,
        cajaInt.documentBaseUrl(), domicile, htmlEmitter, window, USELESS,
        uriPolicy, sesRun);
    es5ready(gman);
  }

  //----------------

  function makeDomicileAndEmitter(
      frameTamingMembrane, divInfo, uriPolicy) {
    if (!divInfo.opt_div) { return null; }

    function FeralTwinStub() {}
    FeralTwinStub.prototype.toString = function () {
      return "[feral twin stub:" + tamingWin.taming.tame(this) + "]";
    };

    function permitUntaming(o) {
      if (typeof o === 'object' || typeof o === 'function') {
        frameTamingMembrane.tamesTo(new FeralTwinStub(), o);
      } // else let primitives go normally
    }

    // Needs to be membraned for exception safety in Domado. But we do not want
    // to have side effects on our arguments, so we construct a wrapper.
    // TODO(kpreid): Instead of reimplementing the taming membrane here, have
    // the host-side code generate a fresh host-side function wrapper which can
    // be tamed. Then neither SES nor ES5/3 frame group code need do this.
    var uriPolicyWrapper = {};
    ['rewrite', 'fetch'].forEach(function(name) {
      if (name in uriPolicy) {
        var f = uriPolicy[name];
        uriPolicyWrapper[name] = function() {
          var args = Array.prototype.slice.call(arguments);
          // Argument 0 of both rewrite and fetch is the URI object, which we
          // need to make sure can be untamed but the taming membrane doesn't
          // natively support. TODO(kpreid): Do this more cleanly, such as by
          // the taming membrane being able to be told about untaming of tame
          // constructed objects, or by having a tame-side advice mechanism.
          var uriArg = arguments[0];
          if (uriArg) {
            if (!uriArg instanceof URI) { throw new Error('oops, not URI'); }
            frameTamingMembrane.tamesTo(uriArg.clone(), uriArg);
          }
          try {
            return frameTamingMembrane.tame(
                f.apply(uriPolicy, Array.prototype.map.call(arguments,
                    frameTamingMembrane.untame)));
          } catch (e) {
            throw frameTamingMembrane.tameException(e);
          }
        };
      }
    });

    var domicile = getDomado().attachDocument(
      '-' + divInfo.idClass, uriPolicyWrapper, divInfo.opt_div,
      config.targetAttributePresets,
      Object.freeze({
        permitUntaming: permitUntaming,
        tame: frameTamingMembrane.tame,
        untame: frameTamingMembrane.untame,
        tamesTo: frameTamingMembrane.tamesTo,
        reTamesTo: frameTamingMembrane.reTamesTo,
        hasTameTwin: frameTamingMembrane.hasTameTwin,
        hasFeralTwin: frameTamingMembrane.hasFeralTwin,
        tameException: frameTamingMembrane.tameException,
        untameException: frameTamingMembrane.untameException
      }),
      cajaVM.constFunc(function(imports) {
        cajaVM.copyToImports(imports, cajaVM.sharedImports);
      }));

    var htmlEmitter = new tamingWin.HtmlEmitter(domicile.htmlEmitterTarget,
      uriPolicy.mitigate, domicile, window);

    // Invoked by textual event handlers emitted by Domado.
    // TODO(kpreid): Use a name other than ___ for this purpose; perhaps some
    // property of the 'caja' object.
    var containerFeralWin =
        (divInfo.opt_div.ownerDocument || divInfo.opt_div).defaultView;
    containerFeralWin.___.plugin_dispatchEvent___ =
        getDomado().plugin_dispatchEvent;

    return [domicile, htmlEmitter];
  }

  function identity(x) { return x; }

  //----------------

  function sesRun(gman, args, moreImports, opt_runDone) {
    if (!moreImports.onerror) {
      moreImports.onerror = onerror;
    }

    // Note that if the guest creates inner iframes, then moreImports will not
    // be added to them. There is no especially strong reason for this behavior,
    // but it was simpler and fits with (in browsers in general) iframes being a
    // way to create a "fresh" environment with no application-specific
    // global state.
    //
    // TODO(kpreid): right enumerable/own behavior?
    var imports = gman.imports;
    Object.getOwnPropertyNames(moreImports).forEach(
      function (i) {
        Object.defineProperty(
          imports, i,
          Object.getOwnPropertyDescriptor(moreImports, i));
      });

    // TODO(felix8a): args.flash

    var promise;
    if (args.uncajoledContent !== undefined) {
      promise = loadContent(gman, Q.ref({
        contentType: args.mimeType || 'text/html',
        responseText: args.uncajoledContent
      }));

    } else {
      promise = loadContent(gman, fetch(args.url), args.mimeType);
    }

    Q.when(promise, function (compiledFunc) {
      var result = compiledFunc(imports);
      if (opt_runDone) {
        opt_runDone(result);
      }
    }, function (failure) {
      config.console.log('Failed to load guest content: ' + failure);
    });
  }

  function onerror(message, source, lineNum) {
    config.console.log(
        'Uncaught script error: ' + message +
        ' in source: "' + source +
        '" at line: ' + lineNum);
  }

  /**
   * Given a promise for a fetch() response record, return a promise
   * for its Caja interpretation, a function of (extraImports).
   */
  function loadContent(gman, contentPromise, opt_expectedContentType) {
    return Q.when(contentPromise, function (xhrRecord) {
      // TODO(kpreid): Is this safe? Does this match the cajoling
      // service's behavior? Should we reject if these two do not
      // agree?
      var contentType = opt_expectedContentType
        || xhrRecord.contentType;

      var theContent = xhrRecord.responseText;

      if (contentType === 'text/javascript'
          || contentType === 'application/javascript'
          || contentType === 'application/x-javascript'
          || contentType === 'text/ecmascript'
          || contentType === 'application/ecmascript'
          || contentType === 'text/jscript') {
        // TODO(kpreid): Make sure there's only one place (in JS)
        // where this big list of content-type synonyms is defined.

        if (gman.htmlEmitter) {
          // If we have a container but no HTML (only JS) then cause an empty
          // document to exist, much like about:blank.
          gman.htmlEmitter.finish();
        }

        // TODO(kpreid): needs to return completion value unless we
        // deprecate that feature.
        return Q.ref(cajaVM.compileExpr(
          // End of line required to ensure linecomments in theContent
          // do not escape away the closing curlies in the expression
          '(function () {' + theContent + '\n})()'));

      } else if (contentType === 'text/html') {
        // importsAgain always === imports, so ignored
        var writeComplete = gman.imports.document.write(theContent);
        return Q.when(writeComplete, function (importsAgain) {
            // TODO(kpreid): Make fetch() support streaming download,
            // then use it here via repeated document.write().
            gman.htmlEmitter.finish();
            gman.htmlEmitter.signalLoaded();
            return function() {};
        });
      } else {
        throw new TypeError("Unimplemented content-type " + contentType);
      }
    });
  }

  /**
   * Download the content of the given URL asynchronously, and return a
   * promise for a XHR-ish record containing the response.
   *
   * TODO(kpreid): modify this interface to support streaming download
   * (readyState 3), and make use of it in loadContent.
   */
  function fetch(url) {
    // TODO(kpreid): Review this for robustness/exposing all relevant info
    var pair = Q.defer();
    var resolve = pair.resolve;
    var xhr = bridal.makeXhr();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve({
            contentType: xhr.getResponseHeader('Content-Type'),
            responseText: xhr.responseText
          });
        } else {
          resolve(Q.reject(xhr.status + ' ' + xhr.statusText));
        }
      }
    };
    xhr.send(null);
    return pair.promise;
  }

}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['SESFrameGroup'] = SESFrameGroup;
}
;
// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * This file exists to be concatenated into the single file that caja.js (the
 * iframed-Caja-runtime loader) loads as the very last thing to give an on-load
 * callback.
 *
 * @author kpreid@switchb.org
 * @requires cajaIframeDone___
 */

cajaIframeDone___();
