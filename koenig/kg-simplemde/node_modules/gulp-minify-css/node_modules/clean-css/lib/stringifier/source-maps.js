var SourceMapGenerator = require('source-map').SourceMapGenerator;
var all = require('./helpers').all;

var isWindows = process.platform == 'win32';
var unknownSource = '$stdin';

function store(element, context) {
  var fromString = typeof element == 'string';
  var value = fromString ? element : element[0];

  if (value.indexOf('_') > -1)
    value = context.restore(value);

  track(value, fromString ? null : element, context);
  context.output.push(value);
}

function track(value, element, context) {
  if (element)
    trackAllMappings(element, context);

  var parts = value.split('\n');
  context.line += parts.length - 1;
  context.column = parts.length > 1 ? 0 : (context.column + parts.pop().length);
}

function trackAllMappings(element, context) {
  var mapping = element[element.length - 1];

  if (!Array.isArray(mapping))
    return;

  for (var i = 0, l = mapping.length; i < l; i++) {
    trackMapping(mapping[i], context);
  }
}

function trackMapping(mapping, context) {
  var source = mapping[2] || unknownSource;

  if (isWindows)
    source = source.replace(/\\/g, '/');

  context.outputMap.addMapping({
    generated: {
      line: context.line,
      column: context.column
    },
    source: source,
    original: {
      line: mapping[0],
      column: mapping[1]
    }
  });

  if (mapping[3])
    context.outputMap.setSourceContent(source, mapping[3][mapping[2]]);
}

function stringify(tokens, options, restoreCallback, inputMapTracker) {
  var context = {
    column: 0,
    inputMapTracker: inputMapTracker,
    keepBreaks: options.keepBreaks,
    line: 1,
    output: [],
    outputMap: new SourceMapGenerator(),
    restore: restoreCallback,
    sourceMapInlineSources: options.sourceMapInlineSources,
    spaceAfterClosingBrace: options.compatibility.properties.spaceAfterClosingBrace,
    store: store
  };

  all(tokens, context, false);

  return {
    sourceMap: context.outputMap,
    styles: context.output.join('').trim()
  };
}

module.exports = stringify;
