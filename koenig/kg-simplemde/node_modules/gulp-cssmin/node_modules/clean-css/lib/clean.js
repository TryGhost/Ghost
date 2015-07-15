/**
 * Clean-css - https://github.com/jakubpawlowicz/clean-css
 * Released under the terms of MIT license
 *
 * Copyright (C) 2014 JakubPawlowicz.com
 */

var ImportInliner = require('./imports/inliner');
var rebaseUrls = require('./urls/rebase');
var SelectorsOptimizer = require('./selectors/optimizer');

var simpleStringify = require('./stringifier/simple');
var sourceMapStringify = require('./stringifier/source-maps');

var CommentsProcessor = require('./text/comments-processor');
var ExpressionsProcessor = require('./text/expressions-processor');
var FreeTextProcessor = require('./text/free-text-processor');
var UrlsProcessor = require('./text/urls-processor');

var Compatibility = require('./utils/compatibility');
var InputSourceMapTracker = require('./utils/input-source-map-tracker');
var SourceTracker = require('./utils/source-tracker');
var SourceReader = require('./utils/source-reader');
var Validator = require('./properties/validator');

var fs = require('fs');
var path = require('path');

var DEFAULT_TIMEOUT = 5000;

var CleanCSS = module.exports = function CleanCSS(options) {
  options = options || {};

  this.options = {
    advanced: undefined === options.advanced ? true : !!options.advanced,
    aggressiveMerging: undefined === options.aggressiveMerging ? true : !!options.aggressiveMerging,
    benchmark: options.benchmark,
    compatibility: new Compatibility(options.compatibility).toOptions(),
    debug: options.debug,
    explicitRoot: !!options.root,
    explicitTarget: !!options.target,
    inliner: options.inliner || {},
    keepBreaks: options.keepBreaks || false,
    keepSpecialComments: 'keepSpecialComments' in options ? options.keepSpecialComments : '*',
    mediaMerging: undefined === options.mediaMerging ? true : !!options.mediaMerging,
    processImport: undefined === options.processImport ? true : !!options.processImport,
    rebase: undefined === options.rebase ? true : !!options.rebase,
    relativeTo: options.relativeTo,
    restructuring: undefined === options.restructuring ? true : !!options.restructuring,
    root: options.root || process.cwd(),
    roundingPrecision: options.roundingPrecision,
    semanticMerging: undefined === options.semanticMerging ? false : !!options.semanticMerging,
    shorthandCompacting: undefined === options.shorthandCompacting ? true : !!options.shorthandCompacting,
    sourceMap: options.sourceMap,
    sourceMapInlineSources: !!options.sourceMapInlineSources,
    target: !options.target || missingDirectory(options.target) || presentDirectory(options.target) ? options.target : path.dirname(options.target)
  };

  this.options.inliner.timeout = this.options.inliner.timeout || DEFAULT_TIMEOUT;
  this.options.inliner.request = this.options.inliner.request || {};
};

function missingDirectory(filepath) {
  return !fs.existsSync(filepath) && !/\.css$/.test(filepath);
}

function presentDirectory(filepath) {
  return fs.existsSync(filepath) && fs.statSync(filepath).isDirectory();
}

CleanCSS.prototype.minify = function(data, callback) {
  var context = {
    stats: {},
    errors: [],
    warnings: [],
    options: this.options,
    debug: this.options.debug,
    localOnly: !callback,
    sourceTracker: new SourceTracker(),
    validator: new Validator(this.options.compatibility)
  };

  if (context.options.sourceMap)
    context.inputSourceMapTracker = new InputSourceMapTracker(context);

  context.sourceReader = new SourceReader(context, data);
  data = context.sourceReader.toString();

  if (context.options.processImport || data.indexOf('@shallow') > 0) {
    // inline all imports
    var runner = callback ?
      process.nextTick :
      function (callback) { return callback(); };

    return runner(function () {
      return new ImportInliner(context).process(data, {
        localOnly: context.localOnly,
        whenDone: runMinifier(callback, context)
      });
    });
  } else {
    return runMinifier(callback, context)(data);
  }
};

function runMinifier(callback, context) {
  function whenSourceMapReady (data) {
    data = context.options.debug ?
      minifyWithDebug(context, data) :
      minify(context, data);
    data = withMetadata(context, data);

    return callback ?
      callback.call(null, context.errors.length > 0 ? context.errors : null, data) :
      data;
  }

  return function (data) {
    if (context.options.sourceMap) {
      return context.inputSourceMapTracker.track(data, function () {
        if (context.options.sourceMapInlineSources) {
          return context.inputSourceMapTracker.resolveSources(function () {
            return whenSourceMapReady(data);
          });
        } else {
          return whenSourceMapReady(data);
        }
      });
    } else {
      return whenSourceMapReady(data);
    }
  };
}

function withMetadata(context, data) {
  data.stats = context.stats;
  data.errors = context.errors;
  data.warnings = context.warnings;
  return data;
}

function minifyWithDebug(context, data) {
  var startedAt = process.hrtime();
  context.stats.originalSize = context.sourceTracker.removeAll(data).length;

  data = minify(context, data);

  var elapsed = process.hrtime(startedAt);
  context.stats.timeSpent = ~~(elapsed[0] * 1e3 + elapsed[1] / 1e6);
  context.stats.efficiency = 1 - data.styles.length / context.stats.originalSize;
  context.stats.minifiedSize = data.styles.length;

  return data;
}

function benchmark(runner) {
  return function (processor, action) {
    var name =  processor.constructor.name + '#' + action;
    var start = process.hrtime();
    runner(processor, action);
    var itTook = process.hrtime(start);
    console.log('%d ms: ' + name, 1000 * itTook[0] + itTook[1] / 1000000);
  };
}

function minify(context, data) {
  var options = context.options;
  var sourceMapTracker = context.inputSourceMapTracker;

  var commentsProcessor = new CommentsProcessor(context, options.keepSpecialComments, options.keepBreaks, options.sourceMap);
  var expressionsProcessor = new ExpressionsProcessor(options.sourceMap);
  var freeTextProcessor = new FreeTextProcessor(options.sourceMap);
  var urlsProcessor = new UrlsProcessor(context, options.sourceMap, options.compatibility.properties.urlQuotes);

  var selectorsOptimizer = new SelectorsOptimizer(options, context);
  var stringify = options.sourceMap ? sourceMapStringify : simpleStringify;

  var run = function (processor, action) {
    data = typeof processor == 'function' ?
      processor(data) :
      processor[action](data);
  };

  if (options.benchmark)
    run = benchmark(run);

  run(commentsProcessor, 'escape');
  run(expressionsProcessor, 'escape');
  run(urlsProcessor, 'escape');
  run(freeTextProcessor, 'escape');

  run(function() {
    return selectorsOptimizer.process(data, stringify, function (data) {
      data = freeTextProcessor.restore(data);
      data = urlsProcessor.restore(data);
      data = options.rebase ? rebaseUrls(data, context) : data;
      data = expressionsProcessor.restore(data);
      return commentsProcessor.restore(data);
    }, sourceMapTracker);
  });

  return data;
}
