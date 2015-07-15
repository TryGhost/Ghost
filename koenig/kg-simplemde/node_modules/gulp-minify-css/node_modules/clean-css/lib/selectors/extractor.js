// This extractor is used in advanced optimizations
// IMPORTANT: Mind Token class and this code is not related!
// Properties will be tokenized in one step, see #429

var stringifySelectors = require('../stringifier/one-time').selectors;
var stringifyValue = require('../stringifier/one-time').value;

function extract(token) {
  var properties = [];

  if (token[0] == 'selector') {
    var inSimpleSelector = !/[\.\+#>~\s]/.test(stringifySelectors(token[1]));
    for (var i = 0, l = token[2].length; i < l; i++) {
      var property = token[2][i];

      if (property.indexOf('__ESCAPED') === 0)
        continue;

      var name = token[2][i][0][0];
      if (name.length === 0)
        continue;

      var value = stringifyValue(token[2], i);

      properties.push([
        name,
        value,
        findNameRoot(name),
        token[2][i],
        name + ':' + value,
        token[1],
        inSimpleSelector
      ]);
    }
  } else if (token[0] == 'block') {
    for (var j = 0, k = token[2].length; j < k; j++) {
      properties = properties.concat(extract(token[2][j]));
    }
  }

  return properties;
}

function findNameRoot(name) {
  if (name == 'list-style')
    return name;
  if (name.indexOf('-radius') > 0)
    return 'border-radius';
  if (name == 'border-collapse' || name == 'border-spacing' || name == 'border-image')
    return name;
  if (name.indexOf('border-') === 0 && /^border\-\w+\-\w+$/.test(name))
    return name.match(/border\-\w+/)[0];
  if (name.indexOf('border-') === 0 && /^border\-\w+$/.test(name))
    return 'border';
  if (name.indexOf('text-') === 0)
    return name;

  return name.replace(/^\-\w+\-/, '').match(/([a-zA-Z]+)/)[0].toLowerCase();
}

module.exports = extract;
