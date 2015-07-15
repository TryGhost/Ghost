var Splitter = require('../utils/splitter');

var COMMA = ',';
var FORWARD_SLASH = '/';

function selectorName(value) {
  return value[0];
}

function noop() {}

function withoutComments(string, into, heading, context) {
  var matcher = heading ? /^__ESCAPED_COMMENT_/ : /__ESCAPED_COMMENT_/;
  var track = heading ? context.track : noop; // don't track when comment not in a heading as we do it later in `trackComments`

  while (matcher.test(string)) {
    var startOfComment = string.indexOf('__');
    var endOfComment = string.indexOf('__', startOfComment + 1) + 2;
    var comment = string.substring(startOfComment, endOfComment);
    string = string.substring(0, startOfComment) + string.substring(endOfComment);

    track(comment);
    into.push(comment);
  }

  return string;
}

function withoutHeadingComments(string, into, context) {
  return withoutComments(string, into, true, context);
}

function withoutInnerComments(string, into, context) {
  return withoutComments(string, into, false, context);
}

function trackComments(comments, into, context) {
  for (var i = 0, l = comments.length; i < l; i++) {
    context.track(comments[i]);
    into.push(comments[i]);
  }
}

function extractProperties(string, selectors, context) {
  var list = [];
  var innerComments = [];
  var splitter = new Splitter(/[ ,\/]/);

  if (typeof string != 'string')
    return [];

  if (string.indexOf(')') > -1)
    string = string.replace(/\)([^\s_;:,\)])/g, context.sourceMap ? ') __ESCAPED_COMMENT_CLEAN_CSS(0,-1)__ $1' : ') $1');

  if (string.indexOf('ESCAPED_URL_CLEAN_CSS') > -1)
    string = string.replace(/(ESCAPED_URL_CLEAN_CSS[^_]+?__)/g, context.sourceMap ? '$1 __ESCAPED_COMMENT_CLEAN_CSS(0,-1)__ ' : '$1 ');

  var candidates = string.split(';');

  for (var i = 0, l = candidates.length; i < l; i++) {
    var candidate = candidates[i];
    var firstColonAt = candidate.indexOf(':');

    if (firstColonAt == -1) {
      context.track(candidate);
      if (candidate.indexOf('__ESCAPED_COMMENT_SPECIAL') > -1)
        list.push(candidate.trim());
      continue;
    }

    if (candidate.indexOf('{') > 0) {
      context.track(candidate);
      continue;
    }

    var body = [];
    var name = candidate.substring(0, firstColonAt);

    innerComments = [];

    if (name.indexOf('__ESCAPED_COMMENT') > -1)
      name = withoutHeadingComments(name, list, context);

    if (name.indexOf('__ESCAPED_COMMENT') > -1)
      name = withoutInnerComments(name, innerComments, context);

    body.push([name.trim()].concat(context.track(name, true)));
    context.track(':');

    trackComments(innerComments, list, context);

    var values = splitter.split(candidate.substring(firstColonAt + 1), true);

    if (values.length == 1 && values[0] === '') {
      context.warnings.push('Empty property \'' + name + '\' inside \'' + selectors.filter(selectorName).join(',') + '\' selector. Ignoring.');
      continue;
    }

    for (var j = 0, m = values.length; j < m; j++) {
      var value = values[j];
      var trimmed = value.trim();

      if (trimmed.length === 0)
        continue;

      var lastCharacter = trimmed[trimmed.length - 1];
      var endsWithNonSpaceSeparator = trimmed.length > 1 && (lastCharacter == COMMA || lastCharacter == FORWARD_SLASH);

      if (endsWithNonSpaceSeparator)
        trimmed = trimmed.substring(0, trimmed.length - 1);

      if (trimmed.indexOf('__ESCAPED_COMMENT_CLEAN_CSS(0,-') > -1) {
        context.track(trimmed);
        continue;
      }

      innerComments = [];

      if (trimmed.indexOf('__ESCAPED_COMMENT') > -1)
        trimmed = withoutHeadingComments(trimmed, list, context);

      if (trimmed.indexOf('__ESCAPED_COMMENT') > -1)
        trimmed = withoutInnerComments(trimmed, innerComments, context);

      if (trimmed.length === 0) {
        trackComments(innerComments, list, context);
        continue;
      }

      var pos = body.length - 1;
      if (trimmed == 'important' && body[pos][0] == '!') {
        context.track(trimmed);
        body[pos - 1][0] += '!important';
        body.pop();
        continue;
      }

      if (trimmed == '!important' || (trimmed == 'important' && body[pos][0][body[pos][0].length - 1] == '!')) {
        context.track(trimmed);
        body[pos][0] += trimmed;
        continue;
      }

      body.push([trimmed].concat(context.track(value, true)));

      trackComments(innerComments, list, context);

      if (endsWithNonSpaceSeparator) {
        body.push([lastCharacter]);
        context.track(lastCharacter);
      }
    }

    if (i < l - 1)
      context.track(';');

    list.push(body);
  }

  return list;
}

module.exports = extractProperties;
