var EscapeStore = require('./escape-store');
var reduceUrls = require('../urls/reduce');

var lineBreak = require('os').EOL;

function UrlsProcessor(context, saveWaypoints, keepUrlQuotes) {
  this.urls = new EscapeStore('URL');
  this.context = context;
  this.saveWaypoints = saveWaypoints;
  this.keepUrlQuotes = keepUrlQuotes;
}

// Strip urls by replacing them by a special
// marker for further restoring. It's done via string scanning
// instead of regexps to speed up the process.
UrlsProcessor.prototype.escape = function (data) {
  var breaksCount;
  var lastBreakAt;
  var indent;
  var saveWaypoints = this.saveWaypoints;
  var self = this;

  return reduceUrls(data, this.context, function (url, tempData) {
    if (saveWaypoints) {
      breaksCount = url.split(lineBreak).length - 1;
      lastBreakAt = url.lastIndexOf(lineBreak);
      indent = lastBreakAt > 0 ?
        url.substring(lastBreakAt + lineBreak.length).length :
        url.length;
    }

    var placeholder = self.urls.store(url, saveWaypoints ? [breaksCount, indent] : null);
    tempData.push(placeholder);
  });
};

function normalize(url, keepUrlQuotes) {
  url = url
    .replace(/^url/gi, 'url')
    .replace(/\\?\n|\\?\r\n/g, '')
    .replace(/(\s{2,}|\s)/g, ' ')
    .replace(/^url\((['"])? /, 'url($1')
    .replace(/ (['"])?\)$/, '$1)');

  if (!keepUrlQuotes && !/^['"].+['"]$/.test(url) && !/url\(.*[\s\(\)].*\)/.test(url) && !/url\(['"]data:[^;]+;charset/.test(url))
    url = url.replace(/["']/g, '');

  return url;
}

UrlsProcessor.prototype.restore = function (data) {
  var tempData = [];
  var cursor = 0;

  for (; cursor < data.length;) {
    var nextMatch = this.urls.nextMatch(data, cursor);
    if (nextMatch.start < 0)
      break;

    tempData.push(data.substring(cursor, nextMatch.start));
    var url = normalize(this.urls.restore(nextMatch.match), this.keepUrlQuotes);
    tempData.push(url);

    cursor = nextMatch.end;
  }

  return tempData.length > 0 ?
    tempData.join('') + data.substring(cursor, data.length) :
    data;
};

module.exports = UrlsProcessor;
