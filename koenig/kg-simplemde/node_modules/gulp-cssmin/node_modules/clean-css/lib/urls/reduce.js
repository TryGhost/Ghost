var URL_PREFIX = 'url(';
var UPPERCASE_URL_PREFIX = 'URL(';
var URL_SUFFIX = ')';

var IMPORT_URL_PREFIX = '@import';
var UPPERCASE_IMPORT_URL_PREFIX = '@IMPORT';

function byUrl(data, context, callback) {
  var nextStart = 0;
  var nextStartUpperCase = 0;
  var nextEnd = 0;
  var cursor = 0;
  var tempData = [];
  var hasUppercaseUrl = data.indexOf(UPPERCASE_URL_PREFIX) > -1;

  for (; nextEnd < data.length;) {
    nextStart = data.indexOf(URL_PREFIX, nextEnd);
    nextStartUpperCase = hasUppercaseUrl ? data.indexOf(UPPERCASE_URL_PREFIX, nextEnd) : -1;
    if (nextStart == -1 && nextStartUpperCase == -1)
      break;

    if (nextStart == -1 && nextStartUpperCase > -1)
      nextStart = nextStartUpperCase;

    if (data[nextStart + URL_PREFIX.length] == '"')
      nextEnd = data.indexOf('"', nextStart + URL_PREFIX.length + 1);
    else if (data[nextStart + URL_PREFIX.length] == '\'')
      nextEnd = data.indexOf('\'', nextStart + URL_PREFIX.length + 1);
    else
      nextEnd = data.indexOf(URL_SUFFIX, nextStart);

    // Following lines are a safety mechanism to ensure
    // incorrectly terminated urls are processed correctly.
    if (nextEnd == -1) {
      nextEnd = data.indexOf('}', nextStart);

      if (nextEnd == -1)
        nextEnd = data.length;
      else
        nextEnd--;

      context.warnings.push('Broken URL declaration: \'' + data.substring(nextStart, nextEnd + 1) + '\'.');
    } else {
      if (data[nextEnd] != URL_SUFFIX)
        nextEnd = data.indexOf(URL_SUFFIX, nextEnd);
    }

    tempData.push(data.substring(cursor, nextStart));

    var url = data.substring(nextStart, nextEnd + 1);
    callback(url, tempData);

    cursor = nextEnd + 1;
  }

  return tempData.length > 0 ?
    tempData.join('') + data.substring(cursor, data.length) :
    data;
}

function byImport(data, context, callback) {
  var nextImport = 0;
  var nextImportUpperCase = 0;
  var nextStart = 0;
  var nextEnd = 0;
  var cursor = 0;
  var tempData = [];
  var nextSingleQuote = 0;
  var nextDoubleQuote = 0;
  var untilNextQuote;
  var withQuote;
  var SINGLE_QUOTE = '\'';
  var DOUBLE_QUOTE = '"';

  for (; nextEnd < data.length;) {
    nextImport = data.indexOf(IMPORT_URL_PREFIX, nextEnd);
    nextImportUpperCase = data.indexOf(UPPERCASE_IMPORT_URL_PREFIX, nextEnd);
    if (nextImport == -1 && nextImportUpperCase == -1)
      break;

    if (nextImport > -1 && nextImportUpperCase > -1 && nextImportUpperCase < nextImport)
      nextImport = nextImportUpperCase;

    nextSingleQuote = data.indexOf(SINGLE_QUOTE, nextImport);
    nextDoubleQuote = data.indexOf(DOUBLE_QUOTE, nextImport);

    if (nextSingleQuote > -1 && nextDoubleQuote > -1 && nextSingleQuote < nextDoubleQuote) {
      nextStart = nextSingleQuote;
      withQuote = SINGLE_QUOTE;
    } else if (nextSingleQuote > -1 && nextDoubleQuote > -1 && nextSingleQuote > nextDoubleQuote) {
      nextStart = nextDoubleQuote;
      withQuote = DOUBLE_QUOTE;
    } else if (nextSingleQuote > -1) {
      nextStart = nextSingleQuote;
      withQuote = SINGLE_QUOTE;
    } else if (nextDoubleQuote > -1) {
      nextStart = nextDoubleQuote;
      withQuote = DOUBLE_QUOTE;
    } else {
      break;
    }

    tempData.push(data.substring(cursor, nextStart));
    nextEnd = data.indexOf(withQuote, nextStart + 1);

    untilNextQuote = data.substring(nextImport, nextEnd);
    if (nextEnd == -1 || /^@import\s+(url\(|__ESCAPED)/i.test(untilNextQuote)) {
      cursor = nextStart;
      break;
    }

    var url = data.substring(nextStart, nextEnd + 1);
    callback(url, tempData);

    cursor = nextEnd + 1;
  }

  return tempData.length > 0 ?
    tempData.join('') + data.substring(cursor, data.length) :
    data;
}

function reduceAll(data, context, callback) {
  data = byUrl(data, context, callback);
  data = byImport(data, context, callback);
  return data;
}

module.exports = reduceAll;
