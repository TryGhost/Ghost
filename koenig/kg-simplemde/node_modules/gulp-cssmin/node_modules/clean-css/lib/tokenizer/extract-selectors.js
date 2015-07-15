var Splitter = require('../utils/splitter');

function extractSelectors(string, context) {
  var list = [];
  var metadata;
  var selectors = new Splitter(',').split(string);

  for (var i = 0, l = selectors.length; i < l; i++) {
    metadata = context.track(selectors[i], true, i);
    context.track(',');
    list.push([selectors[i].trim()].concat(metadata));
  }

  return list;
}

module.exports = extractSelectors;
