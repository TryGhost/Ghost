var Chunker = require('./chunker');
var extractProperties = require('./extract-properties');
var extractSelectors = require('./extract-selectors');
var track = require('../source-maps/track');

var path = require('path');

var flatBlock = /(@(font\-face|page|\-ms\-viewport|\-o\-viewport|viewport|counter\-style)|\\@.+?)/;

function tokenize(data, outerContext) {
  var chunker = new Chunker(normalize(data), '}', 128);
  if (chunker.isEmpty())
    return [];

  var context = {
    chunk: chunker.next(),
    chunker: chunker,
    column: 0,
    cursor: 0,
    line: 1,
    mode: 'top',
    resolvePath: outerContext.options.explicitTarget ?
      relativePathResolver(outerContext.options.root, outerContext.options.target) :
      null,
    source: undefined,
    sourceMap: outerContext.options.sourceMap,
    sourceMapInlineSources: outerContext.options.sourceMapInlineSources,
    sourceMapTracker: outerContext.inputSourceMapTracker,
    sourceReader: outerContext.sourceReader,
    sourceTracker: outerContext.sourceTracker,
    state: [],
    track: outerContext.options.sourceMap ?
      function (data, snapshotMetadata, fallbacks) { return [[track(data, context, snapshotMetadata, fallbacks)]]; } :
      function () { return []; },
    warnings: outerContext.warnings
  };

  return intoTokens(context);
}

function normalize(data) {
  return data.replace(/\r\n/g, '\n');
}

function relativePathResolver(root, target) {
  var rebaseTo = path.relative(root, target);

  return function (relativeTo, sourcePath) {
    return relativeTo != sourcePath ?
      path.normalize(path.join(path.relative(rebaseTo, path.dirname(relativeTo)), sourcePath)) :
      sourcePath;
  };
}

function whatsNext(context) {
  var mode = context.mode;
  var chunk = context.chunk;
  var closest;

  if (chunk.length == context.cursor) {
    if (context.chunker.isEmpty())
      return null;

    context.chunk = chunk = context.chunker.next();
    context.cursor = 0;
  }

  if (mode == 'body') {
    closest = chunk.indexOf('}', context.cursor);
    return closest > -1 ?
      [closest, 'bodyEnd'] :
      null;
  }

  var nextSpecial = chunk.indexOf('@', context.cursor);
  var nextEscape = chunk.indexOf('__ESCAPED_', context.cursor);
  var nextBodyStart = chunk.indexOf('{', context.cursor);
  var nextBodyEnd = chunk.indexOf('}', context.cursor);

  if (nextEscape > -1 && /\S/.test(chunk.substring(context.cursor, nextEscape)))
    nextEscape = -1;

  closest = nextSpecial;
  if (closest == -1 || (nextEscape > -1 && nextEscape < closest))
    closest = nextEscape;
  if (closest == -1 || (nextBodyStart > -1 && nextBodyStart < closest))
    closest = nextBodyStart;
  if (closest == -1 || (nextBodyEnd > -1 && nextBodyEnd < closest))
    closest = nextBodyEnd;

  if (closest == -1)
    return;
  if (nextEscape === closest)
    return [closest, 'escape'];
  if (nextBodyStart === closest)
    return [closest, 'bodyStart'];
  if (nextBodyEnd === closest)
    return [closest, 'bodyEnd'];
  if (nextSpecial === closest)
    return [closest, 'special'];
}

function intoTokens(context) {
  var chunk = context.chunk;
  var tokenized = [];
  var newToken;
  var value;

  while (true) {
    var next = whatsNext(context);
    if (!next) {
      var whatsLeft = context.chunk.substring(context.cursor);
      if (whatsLeft.trim().length > 0) {
        if (context.mode == 'body') {
          context.warnings.push('Missing \'}\' after \'' + whatsLeft + '\'. Ignoring.');
        } else {
          tokenized.push(['text', [whatsLeft]]);
        }
        context.cursor += whatsLeft.length;
      }
      break;
    }

    var nextSpecial = next[0];
    var what = next[1];
    var nextEnd;
    var oldMode;

    chunk = context.chunk;

    if (context.cursor != nextSpecial && what != 'bodyEnd') {
      var spacing = chunk.substring(context.cursor, nextSpecial);
      var leadingWhitespace = /^\s+/.exec(spacing);

      if (leadingWhitespace) {
        context.cursor += leadingWhitespace[0].length;
        context.track(leadingWhitespace[0]);
      }
    }

    if (what == 'special') {
      var firstOpenBraceAt = chunk.indexOf('{', nextSpecial);
      var firstSemicolonAt = chunk.indexOf(';', nextSpecial);
      var isSingle = firstSemicolonAt > -1 && (firstOpenBraceAt == -1 || firstSemicolonAt < firstOpenBraceAt);
      var isBroken = firstOpenBraceAt == -1 && firstSemicolonAt == -1;
      if (isBroken) {
        context.warnings.push('Broken declaration: \'' + chunk.substring(context.cursor) +  '\'.');
        context.cursor = chunk.length;
      } else if (isSingle) {
        nextEnd = chunk.indexOf(';', nextSpecial + 1);
        value = chunk.substring(context.cursor, nextEnd + 1);

        tokenized.push([
          'at-rule',
          [value].concat(context.track(value, true))
        ]);

        context.track(';');
        context.cursor = nextEnd + 1;
      } else {
        nextEnd = chunk.indexOf('{', nextSpecial + 1);
        value = chunk.substring(context.cursor, nextEnd);

        var trimmedValue = value.trim();
        var isFlat = flatBlock.test(trimmedValue);
        oldMode = context.mode;
        context.cursor = nextEnd + 1;
        context.mode = isFlat ? 'body' : 'block';

        newToken = [
          isFlat ? 'flat-block' : 'block'
        ];

        newToken.push([trimmedValue].concat(context.track(value, true)));
        context.track('{');
        newToken.push(intoTokens(context));

        if (typeof newToken[2] == 'string')
          newToken[2] = extractProperties(newToken[2], [[trimmedValue]], context);

        context.mode = oldMode;
        context.track('}');

        tokenized.push(newToken);
      }
    } else if (what == 'escape') {
      nextEnd = chunk.indexOf('__', nextSpecial + 1);
      var escaped = chunk.substring(context.cursor, nextEnd + 2);
      var isStartSourceMarker = !!context.sourceTracker.nextStart(escaped);
      var isEndSourceMarker = !!context.sourceTracker.nextEnd(escaped);

      if (isStartSourceMarker) {
        context.track(escaped);
        context.state.push({
          source: context.source,
          line: context.line,
          column: context.column
        });
        context.source = context.sourceTracker.nextStart(escaped).filename;
        context.line = 1;
        context.column = 0;
      } else if (isEndSourceMarker) {
        var oldState = context.state.pop();
        context.source = oldState.source;
        context.line = oldState.line;
        context.column = oldState.column;
        context.track(escaped);
      } else {
        if (escaped.indexOf('__ESCAPED_COMMENT_SPECIAL') === 0)
          tokenized.push(['text', [escaped]]);

        context.track(escaped);
      }

      context.cursor = nextEnd + 2;
    } else if (what == 'bodyStart') {
      var selectors = extractSelectors(chunk.substring(context.cursor, nextSpecial), context);

      oldMode = context.mode;
      context.cursor = nextSpecial + 1;
      context.mode = 'body';

      var body = extractProperties(intoTokens(context), selectors, context);

      context.track('{');
      context.mode = oldMode;

      tokenized.push([
        'selector',
        selectors,
        body
      ]);
    } else if (what == 'bodyEnd') {
      // extra closing brace at the top level can be safely ignored
      if (context.mode == 'top') {
        var at = context.cursor;
        var warning = chunk[context.cursor] == '}' ?
          'Unexpected \'}\' in \'' + chunk.substring(at - 20, at + 20) + '\'. Ignoring.' :
          'Unexpected content: \'' + chunk.substring(at, nextSpecial + 1) + '\'. Ignoring.';

        context.warnings.push(warning);
        context.cursor = nextSpecial + 1;
        continue;
      }

      if (context.mode == 'block')
        context.track(chunk.substring(context.cursor, nextSpecial));
      if (context.mode != 'block')
        tokenized = chunk.substring(context.cursor, nextSpecial);

      context.cursor = nextSpecial + 1;

      break;
    }
  }

  return tokenized;
}

module.exports = tokenize;
