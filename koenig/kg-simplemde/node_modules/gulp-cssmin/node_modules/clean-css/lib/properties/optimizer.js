var compactable = require('./compactable');
var wrapForOptimizing = require('./wrap-for-optimizing').all;
var populateComponents = require('./populate-components');
var compactOverrides = require('./override-compactor');
var compactShorthands = require('./shorthand-compactor');
var removeUnused = require('./remove-unused');
var restoreShorthands = require('./restore-shorthands');
var stringifyProperty = require('../stringifier/one-time').property;

var shorthands = {
  'animation-delay': ['animation'],
  'animation-direction': ['animation'],
  'animation-duration': ['animation'],
  'animation-fill-mode': ['animation'],
  'animation-iteration-count': ['animation'],
  'animation-name': ['animation'],
  'animation-play-state': ['animation'],
  'animation-timing-function': ['animation'],
  '-moz-animation-delay': ['-moz-animation'],
  '-moz-animation-direction': ['-moz-animation'],
  '-moz-animation-duration': ['-moz-animation'],
  '-moz-animation-fill-mode': ['-moz-animation'],
  '-moz-animation-iteration-count': ['-moz-animation'],
  '-moz-animation-name': ['-moz-animation'],
  '-moz-animation-play-state': ['-moz-animation'],
  '-moz-animation-timing-function': ['-moz-animation'],
  '-o-animation-delay': ['-o-animation'],
  '-o-animation-direction': ['-o-animation'],
  '-o-animation-duration': ['-o-animation'],
  '-o-animation-fill-mode': ['-o-animation'],
  '-o-animation-iteration-count': ['-o-animation'],
  '-o-animation-name': ['-o-animation'],
  '-o-animation-play-state': ['-o-animation'],
  '-o-animation-timing-function': ['-o-animation'],
  '-webkit-animation-delay': ['-webkit-animation'],
  '-webkit-animation-direction': ['-webkit-animation'],
  '-webkit-animation-duration': ['-webkit-animation'],
  '-webkit-animation-fill-mode': ['-webkit-animation'],
  '-webkit-animation-iteration-count': ['-webkit-animation'],
  '-webkit-animation-name': ['-webkit-animation'],
  '-webkit-animation-play-state': ['-webkit-animation'],
  '-webkit-animation-timing-function': ['-webkit-animation'],
  'border-color': ['border'],
  'border-style': ['border'],
  'border-width': ['border'],
  'border-bottom': ['border'],
  'border-bottom-color': ['border-bottom', 'border-color', 'border'],
  'border-bottom-style': ['border-bottom', 'border-style', 'border'],
  'border-bottom-width': ['border-bottom', 'border-width', 'border'],
  'border-left': ['border'],
  'border-left-color': ['border-left', 'border-color', 'border'],
  'border-left-style': ['border-left', 'border-style', 'border'],
  'border-left-width': ['border-left', 'border-width', 'border'],
  'border-right': ['border'],
  'border-right-color': ['border-right', 'border-color', 'border'],
  'border-right-style': ['border-right', 'border-style', 'border'],
  'border-right-width': ['border-right', 'border-width', 'border'],
  'border-top': ['border'],
  'border-top-color': ['border-top', 'border-color', 'border'],
  'border-top-style': ['border-top', 'border-style', 'border'],
  'border-top-width': ['border-top', 'border-width', 'border'],
  'font-family': ['font'],
  'font-size': ['font'],
  'font-style': ['font'],
  'font-variant': ['font'],
  'font-weight': ['font'],
  'transition-delay': ['transition'],
  'transition-duration': ['transition'],
  'transition-property': ['transition'],
  'transition-timing-function': ['transition'],
  '-moz-transition-delay': ['-moz-transition'],
  '-moz-transition-duration': ['-moz-transition'],
  '-moz-transition-property': ['-moz-transition'],
  '-moz-transition-timing-function': ['-moz-transition'],
  '-o-transition-delay': ['-o-transition'],
  '-o-transition-duration': ['-o-transition'],
  '-o-transition-property': ['-o-transition'],
  '-o-transition-timing-function': ['-o-transition'],
  '-webkit-transition-delay': ['-webkit-transition'],
  '-webkit-transition-duration': ['-webkit-transition'],
  '-webkit-transition-property': ['-webkit-transition'],
  '-webkit-transition-timing-function': ['-webkit-transition']
};

function _optimize(properties, mergeAdjacent, aggressiveMerging, validator) {
  var overrideMapping = {};
  var lastName = null;
  var j;

  function mergeablePosition(position) {
    if (mergeAdjacent === false || mergeAdjacent === true)
      return mergeAdjacent;

    return mergeAdjacent.indexOf(position) > -1;
  }

  function sameValue(position) {
    var left = properties[position - 1];
    var right = properties[position];

    return stringifyProperty(left.all, left.position) == stringifyProperty(right.all, right.position);
  }

  propertyLoop:
  for (var position = 0, total = properties.length; position < total; position++) {
    var property = properties[position];
    var _name = (property.name == '-ms-filter' || property.name == 'filter') ?
      (lastName == 'background' || lastName == 'background-image' ? lastName : property.name) :
      property.name;
    var isImportant = property.important;
    var isHack = property.hack;

    if (property.unused)
      continue;

    if (position > 0 && _name == lastName && sameValue(position)) {
      property.unused = true;
      continue;
    }

    // comment is necessary - we assume that if two properties are one after another
    // then it is intentional way of redefining property which may not be widely supported
    // e.g. a{display:inline-block;display:-moz-inline-box}
    // however if `mergeablePosition` yields true then the rule does not apply
    // (e.g merging two adjacent selectors: `a{display:block}a{display:block}`)
    if (_name in overrideMapping && (aggressiveMerging && _name != lastName || mergeablePosition(position))) {
      var toOverridePositions = overrideMapping[_name];
      var canOverride = compactable[_name] && compactable[_name].canOverride;
      var anyRemoved = false;

      for (j = toOverridePositions.length - 1; j >= 0; j--) {
        var toRemove = properties[toOverridePositions[j]];
        var longhandToShorthand = toRemove.name != _name;
        var wasImportant = toRemove.important;
        var wasHack = toRemove.hack;

        if (toRemove.unused)
          continue;

        if (longhandToShorthand && wasImportant)
          continue;

        if (!wasImportant && (wasHack && !isHack || !wasHack && isHack))
          continue;

        if (wasImportant && (isHack == 'star' || isHack == 'underscore'))
          continue;

        if (!wasHack && !isHack && !longhandToShorthand && canOverride && !canOverride(toRemove, property, validator))
          continue;

        if (wasImportant && !isImportant || wasImportant && isHack) {
          property.unused = true;
          continue propertyLoop;
        } else {
          anyRemoved = true;
          toRemove.unused = true;
        }
      }

      if (anyRemoved) {
        position = -1;
        overrideMapping = {};
      }
    } else {
      overrideMapping[_name] = overrideMapping[_name] || [];
      overrideMapping[_name].push(position);

      // TODO: to be removed with
      // certain shorthand (see values of `shorthands`) should trigger removal of
      // longhand properties (see keys of `shorthands`)
      var _shorthands = shorthands[_name];
      if (_shorthands) {
        for (j = _shorthands.length - 1; j >= 0; j--) {
          var shorthand = _shorthands[j];
          overrideMapping[shorthand] = overrideMapping[shorthand] || [];
          overrideMapping[shorthand].push(position);
        }
      }
    }

    lastName = _name;
  }
}

function optimize(selector, properties, mergeAdjacent, withCompacting, options, validator) {
  var _properties = wrapForOptimizing(properties);
  populateComponents(_properties, validator);
  _optimize(_properties, mergeAdjacent, options.aggressiveMerging, validator);

  if (withCompacting && options.shorthandCompacting) {
    compactOverrides(_properties, options.compatibility, validator);
    compactShorthands(_properties, options.sourceMap, validator);
  }

  restoreShorthands(_properties);
  removeUnused(_properties);
}

module.exports = optimize;
