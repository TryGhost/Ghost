/*  evidence.js, version 0.6
 *
 *  Copyright (c) 2009 Tobie Langel (http://tobielangel.com)
 *
 *  evidence.js is freely distributable under the terms of an MIT-style license.
 *--------------------------------------------------------------------------*/

(function(global) {
  var originalEvidence = global.Evidence,
      originalOnload   = global.onload;

  function Evidence() {
    TestCase.extend.apply(TestCase, arguments);
  }

  function noConflict() {
    global.Evidence = originalEvidence;
    return Evidence;
  }

  Evidence.noConflict = noConflict;
  Evidence.VERSION    = '0.6';

var FILE_REGEXP = /.*?\/(\w+\.html)(.*)/;

function getNameFromFile() {
  return (global.location || '').toString().replace(FILE_REGEXP, '$1');
}

function chain(subclass, superclass) {
  function Subclass() {}
  Subclass.prototype = superclass.prototype;
  subclass.prototype = new Subclass();
  subclass.prototype.constructor = subclass;
  return subclass;
}

function defer(block, context) {
  if ('setTimeout' in global) {
    window.setTimeout(function() {
      block.call(context);
    }, 10);
  } else {
    block.call(context);
  }
}
function AssertionSkippedError(message) {
  this.message = message;
}

AssertionSkippedError.displayName = 'AssertionSkippedError';

(function(p) {
  p.name = 'AssertionSkippedError';
})(AssertionSkippedError.prototype);
Evidence.AssertionSkippedError = AssertionSkippedError;
function AssertionFailedError(message, template, args) {
  this.message = message;
  this.template = template || '';
  this.args = args;
}

AssertionFailedError.displayName = 'AssertionFailedError';

(function(p) {
  p.name = 'AssertionFailedError';
})(AssertionFailedError.prototype);
Evidence.AssertionFailedError = AssertionFailedError;
function AssertionMessage(message, template, args) {
  this.message = message.replace(/%/g, '%%');
  this.template = template || '';
  this.args = args;
}

AssertionMessage.displayName = 'AssertionMessage';

(function(p) {
  function toString() {
    return UI.printf(this.message + this.template, this.args);
  }
  p.toString = toString;
})(AssertionMessage.prototype);
Evidence.AssertionMessage = AssertionMessage;

var Assertions = (function() {
  function _assertExpression(expression, message, template) {
    /*for (var i=0; i < 100000; i++) {
      (function(){})()
    }*/
    if (expression) {
      this.addAssertion();
    } else {
      var args = Array.prototype.slice.call(arguments, 3);
      throw new AssertionFailedError(message, template, args);
    }
  }

  function skip(message) {
    throw new AssertionSkippedError(message || 'Skipped!');
  }

  function fail(message) {
    this._assertExpression(false, message || 'Flunked!');
  }

  function assert(test, message) {
    this._assertExpression(
      !!test,
      message || 'Failed assertion.',
      'Expected %o to evaluate to true.', test
    );
  }

  function refute(test, message) {
    this._assertExpression(
      !test,
      message || 'Failed refutation.',
      'Expected %o to evaluate to false.', test
    );
  }

  function assertTrue(test, message) {
    this._assertExpression(
      (test === true),
      message || 'Failed assertion.',
      'Expected %o to be true.', test
    );
  }

  function refuteTrue(test, message) {
    this._assertExpression(
      (test !== true),
      message || 'Failed refutation.',
      'Expected %o to not be true.', test
    );
  }

  function assertNull(test, message) {
    this._assertExpression(
      (test === null),
      message || 'Failed assertion.',
      'Expected %o to be null.', test
    );
  }

  function refuteNull(test, message) {
    this._assertExpression(
      (test !== null),
      message || 'Failed refutation.',
      'Expected %o to not be null.', test
    );
  }

  function assertUndefined(test, message) {
    this._assertExpression(
      (typeof test === 'undefined'),
      message || 'Failed assertion.',
      'Expected %o to be undefined.', test
    );
  }

  function refuteUndefined(test, message) {
    this._assertExpression(
      (typeof test !== 'undefined'),
      message || 'Failed refutation.',
      'Expected %o to not be undefined.', test
    );
  }

  function assertFalse(test, message) {
    this._assertExpression(
      (test === false),
      message || 'Failed assertion.',
      'Expected %o to be false.', test
    );
  }

  function refuteFalse(test, message) {
    this._assertExpression(
      (test !== false),
      message || 'Failed refutation.',
      'Expected %o to not be false.', test
    );
  }

  function assertEqual(expected, actual, message) {
    this._assertExpression(
      (expected == actual),
      message || 'Failed assertion.',
      'Expected %o to be == to %o.', actual, expected
    );
  }

  function refuteEqual(expected, actual, message) {
    this._assertExpression(
      (expected != actual),
      message || 'Failed refutation.',
      'Expected %o to be != to %o.', actual, expected
    );
  }

  function assertIdentical(expected, actual, message) {
    this._assertExpression(
      (expected === actual),
      message || 'Failed assertion.',
      'Expected %o to be === to %o.', actual, expected
    );
  }

  function refuteIdentical(expected, actual, message) {
    this._assertExpression(
      (expected !== actual),
      message || 'Failed refutation.',
      'Expected %o to be !== to %o.', actual, expected
    );
  }

  function assertIn(property, object, message) {
    this._assertExpression(
      (property in object),
      message || 'Failed assertion.',
      'Expected "%s" to be a property of %o.', property, object
    );
  }

  function refuteIn(property, object, message) {
    this._assertExpression(
      !(property in object),
      message || 'Failed refutation.',
      'Expected "%s" to not be a property of %o.', property, object
    );
  }

  return {
    _assertExpression: _assertExpression,
    skip: skip,
    assert: assert,
    refute: refute,
    assertNot: refute,
    assertTrue: assertTrue,
    assertNull: assertNull,
    assertUndefined: assertUndefined,
    assertFalse: assertFalse,
    assertIdentical: assertIdentical,
    refuteIdentical: refuteIdentical,
    assertEqual: assertEqual,
    refuteEqual: refuteEqual,
    assertIn: assertIn,
    refuteIn: refuteIn,
    fail: fail,
    flunk: fail
  };
})();
  Evidence.Assertions = Assertions;
function TestCase(methodName) {
  this._methodName = methodName;
  this.name = methodName;
}

(function() {
  function extend(name, methods) {
    function TestCaseSubclass(methodName) {
      TestCase.call(this, methodName);
    }

    if (!methods) {
      methods = name;
      name = getNameFromFile();
    }

    chain(TestCaseSubclass, this);
    TestCaseSubclass.displayName = name;
    TestCaseSubclass.extend = extend;

    for(var prop in methods) {
      TestCaseSubclass.prototype[prop] = methods[prop];
    }
    TestCase.subclasses.push(TestCaseSubclass);
    return TestCaseSubclass;
  }

  function AssertionsMixin() {}
  AssertionsMixin.prototype = Assertions;
  TestCase.prototype = new AssertionsMixin();
  TestCase.constructor = TestCase;

  TestCase.displayName = 'TestCase';
  TestCase.extend      = extend;
  TestCase.subclasses  = [];
  TestCase.defaultTimeout = 10000;
})();

(function(p) {
  function run(result) {
    if (result) { this._result = result; }
    try {
      if (this._nextAssertions) {
        this._result.restartTest(this);
        this._nextAssertions(this);
      } else {
        /*this._globalProperties = objectKeys(global);*/
        this._result.startTest(this);
        this.setUp(this);
        this[this._methodName](this);
      }
    } catch(e) {
      this._filterException(e);
    } finally {
      if (this._paused) {
        this._result.pauseTest(this);
      } else {
        try {
          this.tearDown(this);
        } catch(e) {
          this._filterException(e);
        } finally {
          this._nextAssertions = null;
          this._result.stopTest(this);
          defer(function() {
            this.parent.next();
          }, this);
        }
      }
    }
  }

  function _filterException(e) {
    var name = e.name;
    switch(name) {
      case 'AssertionFailedError':
        this._result.addFailure(this, e);
        break;
      case 'AssertionSkippedError':
        this._result.addSkip(this, e);
        break;
      default:
        this._result.addError(this, e);
    }
  }

  function pause(assertions) {
    this._paused = true;
    var self = this;
    if (assertions) { this._nextAssertions = assertions; }
    self._timeoutId = global.setTimeout(function() {
      self.resume(function() {
        self.fail('Test timed out. Testing was not resumed after being paused.');
      });
    }, TestCase.defaultTimeout);
  }

  function resume(assertions) {
    if (this._paused) { // avoid race conditions
      this._paused = false;
      global.clearTimeout(this._timeoutId);
      if (assertions) { this._nextAssertions = assertions; }
      this.run();
    }
  }

  function size() {
    return 1;
  }

  function toString() {
    return this.constructor.displayName + '#' + this.name;
  }

  function addAssertion() {
    this._result.addAssertion();
  }

  p.run              = run;
  p.addAssertion     = addAssertion;
  p._filterException = _filterException;
  p.pause            = pause;
  p.resume           = resume;
  p.size             = size;
  p.toString         = toString;
  p.setUp            = function() {};
  p.tearDown         = function() {};
})(TestCase.prototype);
  Evidence.TestCase = TestCase;
function TestSuite(name, tests) {
  this.name = name;
  this._tests = [];
  if (tests) {
    this.push.apply(this, tests);
  }
}

TestSuite.displayName = 'TestSuite';

(function(p) {
  function run(result) {
    this._index = 0;
    this._result = result;
    result.startSuite(this);
    this.next();
    return result;
  }

  function next() {
    var next = this._tests[this._index];
    if (next) {
      this._index++;
      next.run(this._result);
    } else {
      this._result.stopSuite(this);
      if (this.parent) {
        this.parent.next();
      } else {
        this._result.stop(new Date());
      }
    }
  }

  function push() {
    for (var i = 0, length = arguments.length; i < length; i++) {
      var test = arguments[i];
      test.parent = this;
      this._tests.push(test);
    }
  }

  function addTest(test) {
    test.parent = this;
    this._tests.push(test);
  }

  function addTests(tests) {
    for (var i = 0, length = tests.length; i < length; i++) {
      this.addTest(tests[i]);
    }
  }

  function size() {
    var tests  = this._tests,
        length = tests.length,
        sum    = 0;

    for (var i = 0; i < length; i++) {
      sum += tests[i].size();
    }
    return sum;
  }

  function isEmpty() {
    return this.size() === 0;
  }

  function toString() {
    return this.name;
  }
  p.run  = run;
  p.next = next;
  p.push = push;
  p.size = size;
  p.isEmpty = isEmpty;
  p.toString = toString;
})(TestSuite.prototype);
  Evidence.TestSuite = TestSuite;
function TestRunner() {
}

TestRunner.displayName = 'TestRunner';

(function(p) {
  function run(suite) {
    suite.parent = null;
    var result = this._makeResult();
    result.start(new Date());
    suite.run(result);
    return result;
  }

  function _makeResult() {
    return new TestResult();
  }

  p.run = run;
  p._makeResult = _makeResult;
})(TestRunner.prototype);
  Evidence.TestRunner = TestRunner;
function TestLoader() {
}

TestLoader.displayName = 'TestLoader';

(function(p) {
  function loadTestsFromTestCase(testcaseClass) {
    var suite = new TestSuite(testcaseClass.displayName),
        props = this.getTestCaseNames(testcaseClass);
    for (var i=0; i < props.length; i++) {
      suite.push(new testcaseClass(props[i]));
    }
    return suite;
  }

  function loadTestsFromTestCases(testcases) {
    var suite = new TestSuite(getNameFromFile());
    for (var i = 0; i < testcases.length; i++) {
      var testcase = testcases[i];
      var subSuite = defaultLoader.loadTestsFromTestCase(testcase);
      if (!subSuite.isEmpty()) { suite.push(subSuite); }
    }
    return suite;
  }

  function getTestCaseNames(testcaseClass) {
    var results = [],
        proto = testcaseClass.prototype,
        prefix = this.testMethodPrefix;

    for (var property in proto) {
      if (property.indexOf(prefix) === 0) {
        results.push(property);
      }
    }
    return results.sort();
  }

  function loadRegisteredTestCases() {
    return loadTestsFromTestCases(TestCase.subclasses);
  }

  p.loadTestsFromTestCase = loadTestsFromTestCase;
  p.loadRegisteredTestCases = loadRegisteredTestCases;
  p.loadTestsFromTestCases = loadTestsFromTestCases;
  p.testMethodPrefix = 'test';
  p.getTestCaseNames = getTestCaseNames;

})(TestLoader.prototype);
  Evidence.TestLoader = TestLoader;
function AutoRunner() {
  if (global.console && global.console.log) {
    this.logger = Logger;
  } else if (Object.prototype.toString.call(global.environment) === '[object Environment]' && global.print) {
    this.logger = CommandLineLogger;
  } else {
    this.logger = PopupLogger;
  }
  this.autoRun   = true;
  this.verbosity = Logger.INFO;
  this.runner    = ConsoleTestRunner;
}

(function() {
  function run(options) {
    var autoRunner = new this();
    options = options || autoRunner.retrieveOptions();
    autoRunner.processOptions(options);
    if (autoRunner.autoRun) { autoRunner.run() };
  }

  AutoRunner.run = run;
  AutoRunner.displayName = 'AutoRunner';
  AutoRunner.LOGGERS = {
    console:      Logger,
    popup:        PopupLogger,
    command_line: CommandLineLogger
  };

  AutoRunner.RUNNERS = {
    console: ConsoleTestRunner
  };
})();

(function(p) {
  function run() {
    var logger = new this.logger(this.verbosity),
        runner = new this.runner(logger),
        suite = defaultLoader.loadRegisteredTestCases();
    if (suite._tests.length <= 1) {
      suite = suite._tests[0];
    }
    return runner.run(suite);
  }

  function processQueryString(str) {
    var results = {};
    str = (str + '').match(/^(?:[^?#]*\?)([^#]+?)(?:#.*)?$/);
    str = str && str[1];

    if (!str) { return results; }

    var pairs = str.split('&'),
        length = pairs.length;
    if (!length) { return results; }

    for (var i = 0; i < length; i++) {
      var pair  = pairs[i].split('='),
          key   = decodeURIComponent(pair[0]),
          value = pair[1];
      value = value ? decodeURIComponent(value) : true;
      results[key] = value;
    }
    return results;
  }

  function processArguments(args) { // RHINO
    var results = {};

    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (arg.indexOf('-') === 0) {
        var value = args[i + 1];
        if (value && value.indexOf('-') !== 0) {
          i++;
        } else {
          value = true;
        }
        results[arg.substr(1)] = value;
      }
    }
    return results;
  }

  function retrieveOptions() {
    if (global.location) {
      return this.processQueryString(global.location);
    }
    if (global.arguments) {
      return this.processArguments(global.arguments);
    }
    return {};
  }

  function processOptions(options) {
    for(var key in options) {
      var value = options[key];
      switch(key) {
        case 'timeout':
          TestCase.defaultTimeout = global.parseFloat(value) * 1000;
          break;
        case 'run':
          this.autoRun = value === 'false' ? false : true;
          break;
        case 'logger':
          this.logger = AutoRunner.LOGGERS[value];
          break;
        case 'verbosity':
          var i = global.parseInt(value);
          this.verbosity = global.isNaN(i) ? Logger[value] : i;
          break;
        case 'runner':
          this.runner = AutoRunner.RUNNERS[value];
          break;
      }
    }
  }

  p.run = run;
  p.processQueryString = processQueryString;
  p.processArguments = processArguments;
  p.retrieveOptions = retrieveOptions;
  p.processOptions = processOptions;
})(AutoRunner.prototype);
  Evidence.AutoRunner = AutoRunner;
function TestResult() {
  this.testCount      = 0;
  this.assertionCount = 0;
  this.skipCount      = 0;
  this.skips          = [];
  this.failureCount   = 0;
  this.failures       = [];
  this.errors         = [];
  this.errorCount     = 0;
  this.testCount      = 0;
}

TestResult.displayName = 'TestResult';

(function(p) {
  function addAssertion() {
    this.assertionCount++;
  }

  function addSkip(testcase, reason) {
    this.skipCount++;
    this.skips.push(reason);
  }

  function addFailure(testcase, reason) {
    this.failureCount++;
    this.failures.push(reason);
  }

  function addError(testcase, error) {
    this.errorCount++;
    this.errors.push(error);
  }

  function startTest(testcase) {
    this.testCount++;
  }

  function stopTest(testcase) {}

  function pauseTest(testcase) {}

  function restartTest(testcase) {}

  function startSuite(suite) {}

  function stopSuite(suite) {}

  function start(t0) {
    this.t0 = t0;
  }

  function stop(t1) {
    this.t1 = t1;
  }

  function toString() {
    return this.testCount      + ' tests, ' +
           this.assertionCount + ' assertions, ' +
           this.failureCount   + ' failures, ' +
           this.errorCount     + ' errors, ' +
           this.skipCount      + ' skips';
  }

  p.addAssertion  = addAssertion;
  p.addSkip       = addSkip;
  p.addFailure    = addFailure;
  p.addError      = addError;
  p.startTest     = startTest;
  p.stopTest      = stopTest;
  p.pauseTest     = pauseTest;
  p.restartTest   = restartTest;
  p.startSuite    = startSuite;
  p.stopSuite     = stopSuite;
  p.start         = start;
  p.stop          = stop;
  p.toString      = toString;
})(TestResult.prototype);
  Evidence.TestResult = TestResult;
var Console = {};

function Logger(level) {
  if (typeof level !== 'undefined') {
    this.level = level;
  }
}

Logger.displayName = 'Logger';
Logger.LEVELS = ['NOTSET', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
Logger.CRITICAL = 5;
Logger.ERROR    = 4;
Logger.WARN     = 3;
Logger.INFO     = 2;
Logger.DEBUG    = 1;
Logger.NOTSET   = 0;

(function(p) {
  function critical(template, params) {
    this.log(Logger.CRITICAL, template, params);
  }

  function error(template, params) {
    this.log(Logger.ERROR, template, params);
  }

  function warn(template, params) {
    this.log(Logger.WARN, template, params);
  }

  function info(template, params) {
    this.log(Logger.INFO, template, params);
  }

  function debug(template, params) {
    this.log(Logger.DEBUG, template, params);
  }

  function log(level, template, params) {
    level = level || Logger.NOTSET;
    var c = global.console;

    var method = Logger.LEVELS[level].toLowerCase();
    if (method === 'critical') { method = 'error'; }
    method = (method in c) ? method : 'log';

    if (level >= this.level) {
      if (params) {
        params = params.slice(0);
        params.unshift(template);
        c[method].apply(c, params);
      } else {
        c[method](template);
      }
    }
  }

  p.log      = log;
  p.critical = critical;
  p.error    = error;
  p.warn     = warn;
  p.info     = info;
  p.debug    = debug;
  p.level    = 0;
})(Logger.prototype);
Console.Logger = Logger;
function PopupLogger(level) {
  Logger.call(this, level);
}

chain(PopupLogger, Logger);
PopupLogger.displayName = 'PopupLogger';

(function(p) {
  var BASIC_STYLES = 'color: #333; background-color: #fff; font-family: monospace; border-bottom: 1px solid #ccc;';
  var STYLES = {
    WARN:     'color: #000; background-color: #fc6;',
    ERROR:    'color: #f00; background-color: #fcc;',
    CRITICAL: 'color: #fff; background-color: #000;'
  };

  function _cleanup(html) {
    return html.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/[\n\r]+/, '<br />');
  }

  function _makePopup() {
    var popup = global.open('','popup','height=400,width=400');
    var doc = popup.document;
    doc.write('<!doctype html>\
               <html lang="en">\
                 <head>\
                   <meta charset="utf-8">\
                   <title>Console</title>\
                 </head>\
                 <body><div id="evidence_console"></div></body>\
               </html>');
    doc.close();
    popup.focus();
    return popup;
  }

  function _appendLine(level, msg) {
    this.popup = this.popup || this._makePopup();
    var levelName = Logger.LEVELS[level];

    var html = '<div style="';
    html += BASIC_STYLES;
    html += STYLES[levelName] || '';
    html += '">';
    if (level > Logger.INFO) {
      html += '<span style="font-weight: bold;">';
      html += levelName;
      html += ':</span> ';
    }
    html += _cleanup(msg);
    html += '</div>';
    var doc = this.popup.document,
        div = doc.createElement('div');
    div.innerHTML = html;
    html = div.firstChild;
    div = null;
    doc.getElementById('evidence_console').appendChild(html);
  }

  function log(level, msg, params) {
    level = level || Logger.NOTSET;
    if (level >= this.level) {
      if (params) {
        msg = UI.printf(msg, params);
      }
      this._appendLine(level, msg);
    }
  }

  p.log = log;
  p._makePopup = _makePopup;
  p._appendLine = _appendLine;
})(PopupLogger.prototype);
Console.PopupLogger = PopupLogger;
function CommandLineLogger(level) {
  Logger.call(this, level);
}

chain(CommandLineLogger, Logger);
CommandLineLogger.displayName = 'CommandLineLogger';

(function(p) {

  function log(level, msg, params) {
    level = level || Logger.NOTSET;
    if (level >= this.level) {
      var prefix = '';
      if (level > Logger.INFO) {
        prefix = Logger.LEVELS[level]+ ': ';
      }
      if (params) {
        msg = UI.printf(msg, params);
      }
      global.print(prefix + msg);
    }
  }

  p.log = log;
})(CommandLineLogger.prototype);
Console.CommandLineLogger = CommandLineLogger;
function ConsoleTestRunner(logger) {
  TestRunner.call(this);
  this.logger = logger;
}

chain(ConsoleTestRunner, TestRunner);
ConsoleTestRunner.displayName = 'ConsoleTestRunner';

(function(p) {
  function _makeResult() {
    return new ConsoleTestResult(this.logger);
  }

  p._makeResult = _makeResult;
})(ConsoleTestRunner.prototype);
Console.TestRunner = ConsoleTestRunner;
function ConsoleTestResult(logger) {
  TestResult.call(this);
  this.logger = logger;
}

chain(ConsoleTestResult, TestResult);
ConsoleTestResult.displayName = 'ConsoleTestResult';

(function(p) {
  var _super = TestResult.prototype;

  function addAssertion() {
    this.assertionCount++;
  }

  function addSkip(testcase, msg) {
    _super.addSkip.call(this, testcase, msg);
    this.logger.warn('Skipping testcase ' + testcase + ': ' + msg.message);
  }

  function addFailure(testcase, msg) {
    _super.addFailure.call(this, testcase, msg);
    this.logger.error(testcase + ': ' + msg.message + ' ' + msg.template, msg.args);
  }

  function addError(testcase, error) {
    _super.addError.call(this, testcase, error);
    this.logger.error(testcase + ' threw an error. ' + error);
  }

  function startTest(testcase) {
    _super.startTest.call(this, testcase);
    this.logger.debug('Started testcase ' + testcase + '.');
  }

  function stopTest(testcase) {
    this.logger.debug('Completed testcase ' + testcase + '.');
  }

  function pauseTest(testcase) {
    this.logger.info('Paused testcase ' + testcase + '.');
  }

  function restartTest(testcase) {
    this.logger.info('Restarted testcase ' + testcase + '.');
  }

  function startSuite(suite) {
    this.logger.info('Started suite ' + suite + '.');
  }

  function stopSuite(suite) {
    this.logger.info('Completed suite ' + suite + '.');
  }

  function start(t0) {
    _super.start.call(this, t0);
    this.logger.info('Started tests.');
  }

  function stop(t1) {
    _super.stop.call(this, t1);
    this.logger.info('Completed tests in ' + ((t1 - this.t0)/1000) + 's.');
    this.logger.info(this.toString() + '.');
  }

  p.addAssertion  = addAssertion;
  p.addSkip       = addSkip;
  p.addFailure    = addFailure;
  p.addError      = addError;
  p.startTest     = startTest;
  p.stopTest      = stopTest;
  p.pauseTest     = pauseTest;
  p.restartTest   = restartTest;
  p.startSuite    = startSuite;
  p.stopSuite     = stopSuite;
  p.start         = start;
  p.stop          = stop;
})(ConsoleTestResult.prototype);


Console.TestResult = ConsoleTestResult;
var UI = (function() {
  function printf(template, args, inspector) {
    var parts = [],
        regexp = /(^%|.%)([a-zA-Z])/,
        args = args.splice(0); // clone args

    inspector = inspector || String;

    if (template.length <= 0) {
      return '';
    }
    while (m = regexp.exec(template)) {
      var match = m[0], index = m.index, type, arg;

      if (match.indexOf('%%') === 0) {
        parts.push(template.substr(0, index));
        parts.push(match.substr(1));
      } else {
        parts.push(template.substr(0, match.indexOf('%' === 0) ? index + 1 : index));
        type = m[2];
        arg = args.shift();
        arg = inspector(arg, type);
        parts.push(arg);
      }
      template = template.substr(index + match.length);
    }
    parts.push(template);
    return parts.join('');
  }

   return {
     printf: printf,
     Console: Console
   };
})();
  Evidence.UI = UI;

  var defaultLoader = new TestLoader();
  Evidence.defaultLoader = defaultLoader;

  global.Evidence = Evidence;

  if (global.location) {
    global.onload = function() {
      if (typeof originalOnload === 'function') {
        originalOnload.call(global);
      }
      AutoRunner.run();
    };
  } else if (global.arguments) {
    var runtime = java.lang.Runtime.getRuntime();
    var thread = new java.lang.Thread(function() {
      AutoRunner.run();
    });
    runtime.addShutdownHook(thread);
  }

})(this);
