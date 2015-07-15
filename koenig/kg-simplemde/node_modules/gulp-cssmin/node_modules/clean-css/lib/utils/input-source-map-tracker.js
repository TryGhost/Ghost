var SourceMapConsumer = require('source-map').SourceMapConsumer;

var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

var override = require('../utils/object.js').override;

var MAP_MARKER = /\/\*# sourceMappingURL=(\S+) \*\//;
var REMOTE_RESOURCE = /^(https?:)?\/\//;

function InputSourceMapStore(outerContext) {
  this.options = outerContext.options;
  this.errors = outerContext.errors;
  this.warnings = outerContext.warnings;
  this.sourceTracker = outerContext.sourceTracker;
  this.timeout = this.options.inliner.timeout;
  this.requestOptions = this.options.inliner.request;
  this.localOnly = outerContext.localOnly;
  this.relativeTo = outerContext.options.target || process.cwd();

  this.maps = {};
  this.sourcesContent = {};
}

function fromString(self, _, whenDone) {
  self.trackLoaded(undefined, undefined, self.options.sourceMap);
  return whenDone();
}

function fromSource(self, data, whenDone, context) {
  var nextAt = 0;

  function proceedToNext() {
    context.cursor += nextAt + 1;
    fromSource(self, data, whenDone, context);
  }

  while (context.cursor < data.length) {
    var fragment = data.substring(context.cursor);

    var markerStartMatch = self.sourceTracker.nextStart(fragment) || { index: -1 };
    var markerEndMatch = self.sourceTracker.nextEnd(fragment) || { index: -1 };
    var mapMatch = MAP_MARKER.exec(fragment) || { index: -1 };
    var sourceMapFile = mapMatch[1];

    nextAt = data.length;
    if (markerStartMatch.index > -1)
      nextAt = markerStartMatch.index;
    if (markerEndMatch.index > -1 && markerEndMatch.index < nextAt)
      nextAt = markerEndMatch.index;
    if (mapMatch.index > -1 && mapMatch.index < nextAt)
      nextAt = mapMatch.index;

    if (nextAt == data.length)
      break;

    if (nextAt == markerStartMatch.index) {
      context.files.push(markerStartMatch.filename);
    } else if (nextAt == markerEndMatch.index) {
      context.files.pop();
    } else if (nextAt == mapMatch.index) {
      var isRemote = /^https?:\/\//.test(sourceMapFile) || /^\/\//.test(sourceMapFile);
      if (isRemote) {
        return fetchMapFile(self, sourceMapFile, context, proceedToNext);
      } else {
        var sourceFile = context.files[context.files.length - 1];
        var sourceDir = sourceFile ? path.dirname(sourceFile) : self.options.relativeTo;
        var sourceMapPath = path.resolve(self.options.root, path.join(sourceDir || '', sourceMapFile));

        var sourceMapData = fs.readFileSync(sourceMapPath, 'utf-8');
        self.trackLoaded(sourceFile || undefined, sourceMapPath, sourceMapData);
      }
    }

    context.cursor += nextAt + 1;
  }

  return whenDone();
}


function fetchMapFile(self, sourceUrl, context, done) {
  fetch(self, sourceUrl, function (data) {
    self.trackLoaded(context.files[context.files.length - 1] || undefined, sourceUrl, data);
    done();
  }, function (message) {
    context.errors.push('Broken source map at "' + sourceUrl + '" - ' + message);
    return done();
  });
}

function fetch(self, path, onSuccess, onFailure) {
  var protocol = path.indexOf('https') === 0 ? https : http;
  var requestOptions = override(url.parse(path), self.requestOptions);
  var errorHandled = false;

  protocol
    .get(requestOptions, function (res) {
      if (res.statusCode < 200 || res.statusCode > 299)
        return onFailure(res.statusCode);

      var chunks = [];
      res.on('data', function (chunk) {
        chunks.push(chunk.toString());
      });
      res.on('end', function () {
        onSuccess(chunks.join(''));
      });
    })
    .on('error', function(res) {
      if (errorHandled)
        return;

      onFailure(res.message);
      errorHandled = true;
    })
    .on('timeout', function() {
      if (errorHandled)
        return;

      onFailure('timeout');
      errorHandled = true;
    })
    .setTimeout(self.timeout);
}

function originalPositionIn(trackedSource, line, column, token, allowNFallbacks) {
  var originalPosition;
  var maxRange = token.length;
  var position = {
    line: line,
    column: column + maxRange
  };

  while (maxRange-- > 0) {
    position.column--;
    originalPosition = trackedSource.data.originalPositionFor(position);

    if (originalPosition)
      break;
  }

  if (originalPosition.line === null && line > 1 && allowNFallbacks > 0)
    return originalPositionIn(trackedSource, line - 1, column, token, allowNFallbacks - 1);

  if (trackedSource.path && originalPosition.source) {
    originalPosition.source = REMOTE_RESOURCE.test(trackedSource.path) ?
      url.resolve(trackedSource.path, originalPosition.source) :
      path.join(trackedSource.path, originalPosition.source);

    originalPosition.sourceResolved = true;
  }

  return originalPosition;
}

function trackContentSources(self, sourceFile) {
  var consumer = self.maps[sourceFile].data;
  var isRemote = REMOTE_RESOURCE.test(sourceFile);
  var sourcesMapping = {};

  consumer.sources.forEach(function (file, index) {
    var uniquePath = isRemote ?
      url.resolve(path.dirname(sourceFile), file) :
      path.relative(self.relativeTo, path.resolve(path.dirname(sourceFile), file));

    sourcesMapping[uniquePath] = consumer.sourcesContent && consumer.sourcesContent[index];
  });
  self.sourcesContent[sourceFile] = sourcesMapping;
}

function _resolveSources(self, remaining, whenDone) {
  function processNext() {
    return _resolveSources(self, remaining, whenDone);
  }

  if (remaining.length === 0)
    return whenDone();

  var current = remaining.shift();
  var sourceFile = current[0];
  var originalFile = current[1];
  var isRemote = REMOTE_RESOURCE.test(sourceFile);

  if (isRemote && self.localOnly) {
    self.warnings.push('No callback given to `#minify` method, cannot fetch a remote file from "' + originalFile + '"');
    return processNext();
  }

  if (isRemote) {
    fetch(self, originalFile, function (data) {
      self.sourcesContent[sourceFile][originalFile] = data;
      processNext();
    }, function (message) {
      self.warnings.push('Broken original source file at "' + originalFile + '" - ' + message);
      processNext();
    });
  } else {
    var fullPath = path.join(self.options.root, originalFile);
    if (fs.existsSync(fullPath))
      self.sourcesContent[sourceFile][originalFile] = fs.readFileSync(fullPath, 'utf-8');
    else
      self.warnings.push('Missing original source file at "' + fullPath + '".');
    return processNext();
  }
}

InputSourceMapStore.prototype.track = function (data, whenDone) {
  return typeof this.options.sourceMap == 'string' ?
    fromString(this, data, whenDone) :
    fromSource(this, data, whenDone, { files: [], cursor: 0, errors: this.errors });
};

InputSourceMapStore.prototype.trackLoaded = function (sourcePath, mapPath, mapData) {
  var relativeTo = this.options.explicitTarget ? this.options.target : this.options.root;
  var isRemote = REMOTE_RESOURCE.test(sourcePath);

  if (mapPath) {
    mapPath = isRemote ?
      path.dirname(mapPath) :
      path.dirname(path.relative(relativeTo, mapPath));
  }

  this.maps[sourcePath] = {
    path: mapPath,
    data: new SourceMapConsumer(mapData)
  };

  trackContentSources(this, sourcePath);
};

InputSourceMapStore.prototype.isTracking = function (source) {
  return !!this.maps[source];
};

InputSourceMapStore.prototype.originalPositionFor = function (sourceInfo, token, allowNFallbacks) {
  return originalPositionIn(this.maps[sourceInfo.source], sourceInfo.line, sourceInfo.column, token, allowNFallbacks);
};

InputSourceMapStore.prototype.sourcesContentFor = function (contextSource) {
  return this.sourcesContent[contextSource];
};

InputSourceMapStore.prototype.resolveSources = function (whenDone) {
  var toResolve = [];

  for (var sourceFile in this.sourcesContent) {
    var contents = this.sourcesContent[sourceFile];
    for (var originalFile in contents) {
      if (!contents[originalFile])
        toResolve.push([sourceFile, originalFile]);
    }
  }

  return _resolveSources(this, toResolve, whenDone);
};

module.exports = InputSourceMapStore;
