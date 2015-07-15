var escapePrefix = '__ESCAPED_';

function trackPrefix(value, context, interestingContent) {
  if (!interestingContent && value.indexOf('\n') == -1) {
    if (value.indexOf(escapePrefix) === 0) {
      return value;
    } else {
      context.column += value.length;
      return;
    }
  }

  var withoutContent = 0;
  var split = value.split('\n');
  var total = split.length;
  var shift = 0;

  while (true) {
    if (withoutContent == total - 1)
      break;

    var part = split[withoutContent];
    if (/\S/.test(part))
      break;

    shift += part.length + 1;
    withoutContent++;
  }

  context.line += withoutContent;
  context.column = withoutContent > 0 ? 0 : context.column;
  context.column += /^(\s)*/.exec(split[withoutContent])[0].length;

  return value.substring(shift).trimLeft();
}

function sourceFor(originalMetadata, contextMetadata, context) {
  var source = originalMetadata.source || contextMetadata.source;

  if (source && context.resolvePath)
    return context.resolvePath(contextMetadata.source, source);

  return source;
}

function snapshot(data, context, fallbacks) {
  var metadata = {
    line: context.line,
    column: context.column,
    source: context.source
  };
  var sourceContent = null;
  var sourceMetadata = context.sourceMapTracker.isTracking(metadata.source) ?
    context.sourceMapTracker.originalPositionFor(metadata, data, fallbacks || 0) :
    {};

  metadata.line = sourceMetadata.line || metadata.line;
  metadata.column = sourceMetadata.column || metadata.column;
  metadata.source = sourceMetadata.sourceResolved ?
    sourceMetadata.source :
    sourceFor(sourceMetadata, metadata, context);

  if (context.sourceMapInlineSources) {
    var sourceMapSourcesContent = context.sourceMapTracker.sourcesContentFor(context.source);
    sourceContent = sourceMapSourcesContent && sourceMapSourcesContent[metadata.source] ?
      sourceMapSourcesContent :
      context.sourceReader.sourceAt(context.source);
  }

  return sourceContent ?
    [metadata.line, metadata.column, metadata.source, sourceContent] :
    [metadata.line, metadata.column, metadata.source];
}

function trackSuffix(data, context) {
  var parts = data.split('\n');

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i];
    var cursor = 0;

    if (i > 0) {
      context.line++;
      context.column = 0;
    }

    while (true) {
      var next = part.indexOf(escapePrefix, cursor);

      if (next == -1) {
        context.column += part.substring(cursor).length;
        break;
      }

      context.column += next - cursor;
      cursor += next - cursor;

      var escaped = part.substring(next, part.indexOf('__', next + 1) + 2);
      var encodedValues = escaped.substring(escaped.indexOf('(') + 1, escaped.indexOf(')')).split(',');
      context.line += ~~encodedValues[0];
      context.column = (~~encodedValues[0] === 0 ? context.column : 0) + ~~encodedValues[1];
      cursor += escaped.length;
    }
  }
}

function track(data, context, snapshotMetadata, fallbacks) {
  var untracked = trackPrefix(data, context, snapshotMetadata);
  var metadata = snapshotMetadata ?
    snapshot(untracked, context, fallbacks) :
    [];

  if (untracked)
    trackSuffix(untracked, context);

  return metadata;
}

module.exports = track;
