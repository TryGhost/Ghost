var path = require('path');
var rewriteUrls = require('../urls/rewrite');

var REMOTE_RESOURCE = /^(https?:)?\/\//;

function SourceReader(context, data) {
  this.outerContext = context;
  this.data = data;
  this.sources = {};
}

SourceReader.prototype.sourceAt = function (path) {
  return this.sources[path];
};

SourceReader.prototype.trackSource = function (path, source) {
  this.sources[path] = {};
  this.sources[path][path] = source;
};

SourceReader.prototype.toString = function () {
  if (typeof this.data == 'string')
    return fromString(this);
  if (Buffer.isBuffer(this.data))
    return fromBuffer(this);
  if (Array.isArray(this.data))
    return fromArray(this);

  return fromHash(this);
};

function fromString(self) {
  var data = self.data;
  self.trackSource(undefined, data);
  return data;
}

function fromBuffer(self) {
  var data = self.data.toString();
  self.trackSource(undefined, data);
  return data;
}

function fromArray(self) {
  return self.data
    .map(function (source) {
      return self.outerContext.options.processImport === false ?
        source + '@shallow' :
        source;
    })
    .map(function (source) {
      return !self.outerContext.options.relativeTo || /^https?:\/\//.test(source) ?
        source :
        path.relative(self.outerContext.options.relativeTo, source);
    })
    .map(function (source) { return '@import url(' + source + ');'; })
    .join('');
}

function fromHash(self) {
  var data = [];
  var toBase = path.resolve(self.outerContext.options.target || self.outerContext.options.root);

  for (var source in self.data) {
    var styles = self.data[source].styles;
    var inputSourceMap = self.data[source].sourceMap;
    var isRemote = REMOTE_RESOURCE.test(source);
    var absoluteSource = isRemote ? source : path.resolve(source);
    var absoluteSourcePath = path.dirname(absoluteSource);

    var rewriteOptions = {
      absolute: self.outerContext.options.explicitRoot,
      relative: !self.outerContext.options.explicitRoot,
      imports: true,
      rebase: self.outerContext.options.rebase,
      fromBase: absoluteSourcePath,
      toBase: isRemote ? absoluteSourcePath : toBase
    };
    styles = rewriteUrls(styles, rewriteOptions, self.outerContext);

    self.trackSource(source, styles);

    styles = self.outerContext.sourceTracker.store(source, styles);

    // here we assume source map lies in the same directory as `source` does
    if (self.outerContext.options.sourceMap && inputSourceMap)
      self.outerContext.inputSourceMapTracker.trackLoaded(source, source, inputSourceMap);

    data.push(styles);
  }

  return data.join('');
}

module.exports = SourceReader;
