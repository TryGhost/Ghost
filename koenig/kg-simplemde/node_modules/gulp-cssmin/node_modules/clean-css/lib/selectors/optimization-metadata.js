// TODO: we should wrap it under `wrap for optimizing`

var BACKSLASH_HACK = '\\';
var IMPORTANT = '!important';
var STAR_HACK = '*';
var UNDERSCORE_HACK = '_';

function addOptimizationMetadata(tokens) {
  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];

    switch (token[0]) {
      case 'flat-block':
      case 'selector':
        addToProperties(token[2]);
        break;
      case 'block':
        addOptimizationMetadata(token[2]);
        break;
    }
  }
}

function addToProperties(properties) {
  for (var i = properties.length - 1; i >= 0; i--) {
    if (typeof properties[i] != 'string')
      addToProperty(properties[i]);
  }
}

function addToProperty(property) {
  var name = property[0][0];
  var lastValue = property[property.length - 1];
  var isImportant = lastValue[0].indexOf(IMPORTANT) > 0;
  var hackType = false;

  if (name[0] == UNDERSCORE_HACK) {
    property[0][0] = name.substring(1);
    hackType = 'underscore';
  } else if (name[0] == STAR_HACK) {
    property[0][0] = name.substring(1);
    hackType = 'star';
  } else if (lastValue[0].indexOf(BACKSLASH_HACK) > 0 && lastValue[0].indexOf(BACKSLASH_HACK) == lastValue[0].length - BACKSLASH_HACK.length - 1) {
    lastValue[0] = lastValue[0].substring(0, lastValue[0].length - BACKSLASH_HACK.length - 1);
    hackType = 'suffix';
  } else if (lastValue[0].indexOf(BACKSLASH_HACK) === 0 && lastValue[0].length == 2) {
    property.pop();
    hackType = 'suffix';
  }

  // TODO: this should be done at tokenization step
  // with adding importance info
  if (isImportant)
    lastValue[0] = lastValue[0].substring(0, lastValue[0].length - IMPORTANT.length);

  property[0].splice(1, 0, isImportant, hackType);
}

module.exports = addOptimizationMetadata;
