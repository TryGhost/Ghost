var canOverride = require('./can-override');
var compactable = require('./compactable');
var deepClone = require('./clone').deep;
var shallowClone = require('./clone').shallow;
var hasInherit = require('./has-inherit');
var restoreShorthands = require('./restore-shorthands');
var everyCombination = require('./every-combination');
var sameVendorPrefixesIn = require('./vendor-prefixes').same;

var stringifyProperty = require('../stringifier/one-time').property;

var MULTIPLEX_SEPARATOR = ',';

// Used when searching for a component that matches property
function nameMatchFilter(to) {
  return function (property) {
    return to.name === property.name;
  };
}

function wouldBreakCompatibility(property, validator) {
  for (var i = 0; i < property.components.length; i++) {
    var component = property.components[i];
    var descriptor = compactable[component.name];
    var canOverride = descriptor && descriptor.canOverride || canOverride.sameValue;

    var _component = shallowClone(component);
    _component.value = [[descriptor.defaultValue]];

    if (!canOverride(_component, component, validator))
      return true;
  }

  return false;
}

function isComponentOf(shorthand, longhand) {
  return compactable[shorthand.name].components.indexOf(longhand.name) > -1;
}

function overrideIntoMultiplex(property, by) {
  by.unused = true;

  turnIntoMultiplex(by, multiplexSize(property));
  property.value = by.value;
}

function overrideByMultiplex(property, by) {
  by.unused = true;
  property.multiplex = true;
  property.value = by.value;
}

function overrideSimple(property, by) {
  by.unused = true;
  property.value = by.value;
}

function override(property, by) {
  if (by.multiplex)
    overrideByMultiplex(property, by);
  else if (property.multiplex)
    overrideIntoMultiplex(property, by);
  else
    overrideSimple(property, by);
}

function overrideShorthand(property, by) {
  by.unused = true;

  for (var i = 0, l = property.components.length; i < l; i++) {
    override(property.components[i], by.components[i], property.multiplex);
  }
}

function turnIntoMultiplex(property, size) {
  property.multiplex = true;

  for (var i = 0, l = property.components.length; i < l; i++) {
    var component = property.components[i];
    if (component.multiplex)
      continue;

    var value = component.value.slice(0);

    for (var j = 1; j < size; j++) {
      component.value.push([MULTIPLEX_SEPARATOR]);
      Array.prototype.push.apply(component.value, value);
    }
  }
}

function multiplexSize(component) {
  var size = 0;

  for (var i = 0, l = component.value.length; i < l; i++) {
    if (component.value[i][0] == MULTIPLEX_SEPARATOR)
      size++;
  }

  return size + 1;
}

function lengthOf(property) {
  var fakeAsArray = [[property.name]].concat(property.value);
  return stringifyProperty([fakeAsArray], 0).length;
}

function moreSameShorthands(properties, startAt, name) {
  // Since we run the main loop in `compactOverrides` backwards, at this point some
  // properties may not be marked as unused.
  // We should consider reverting the order if possible
  var count = 0;

  for (var i = startAt; i >= 0; i--) {
    if (properties[i].name == name && !properties[i].unused)
      count++;
    if (count > 1)
      break;
  }

  return count > 1;
}

function mergingIntoFunction(left, right, validator) {
  for (var i = 0, l = left.components.length; i < l; i++) {
    if (anyValue(validator.isValidFunction, left.components[i]))
      return true;
  }

  return false;
}

function anyValue(fn, property) {
  for (var i = 0, l = property.value.length; i < l; i++) {
    if (property.value[i][0] == MULTIPLEX_SEPARATOR)
      continue;

    if (fn(property.value[i][0]))
      return true;
  }

  return false;
}

function wouldResultInLongerValue(left, right) {
  if (!left.multiplex && !right.multiplex || left.multiplex && right.multiplex)
    return false;

  var multiplex = left.multiplex ? left : right;
  var simple = left.multiplex ? right : left;
  var component;

  var multiplexClone = deepClone(multiplex);
  restoreShorthands([multiplexClone]);

  var simpleClone = deepClone(simple);
  restoreShorthands([simpleClone]);

  var lengthBefore = lengthOf(multiplexClone) + 1 + lengthOf(simpleClone);

  if (left.multiplex) {
    component = multiplexClone.components.filter(nameMatchFilter(simpleClone))[0];
    overrideIntoMultiplex(component, simpleClone);
  } else {
    component = simpleClone.components.filter(nameMatchFilter(multiplexClone))[0];
    turnIntoMultiplex(simpleClone, multiplexSize(multiplexClone));
    overrideByMultiplex(component, multiplexClone);
  }

  restoreShorthands([simpleClone]);

  var lengthAfter = lengthOf(simpleClone);

  return lengthBefore < lengthAfter;
}

function isCompactable(property) {
  return property.name in compactable;
}

function noneOverrideHack(left, right) {
  return !left.multiplex &&
    (left.name == 'background' || left.name == 'background-image') &&
    right.multiplex &&
    (right.name == 'background' || right.name == 'background-image') &&
    anyLayerIsNone(right.value);
}

function anyLayerIsNone(values) {
  var layers = intoLayers(values);

  for (var i = 0, l = layers.length; i < l; i++) {
    if (layers[i].length == 1 && layers[i][0][0] == 'none')
      return true;
  }

  return false;
}

function intoLayers(values) {
  var layers = [];

  for (var i = 0, layer = [], l = values.length; i < l; i++) {
    var value = values[i];
    if (value[0] == MULTIPLEX_SEPARATOR) {
      layers.push(layer);
      layer = [];
    } else {
      layer.push(value);
    }
  }

  layers.push(layer);
  return layers;
}

function compactOverrides(properties, compatibility, validator) {
  var mayOverride, right, left, component;
  var i, j, k;

  propertyLoop:
  for (i = properties.length - 1; i >= 0; i--) {
    right = properties[i];

    if (!isCompactable(right))
      continue;

    mayOverride = compactable[right.name].canOverride || canOverride.sameValue;

    for (j = i - 1; j >= 0; j--) {
      left = properties[j];

      if (!isCompactable(left))
        continue;

      if (left.unused || right.unused)
        continue;

      if (left.hack && !right.hack || !left.hack && right.hack)
        continue;

      if (hasInherit(right))
        continue;

      if (noneOverrideHack(left, right))
        continue;

      if (!left.shorthand && right.shorthand && isComponentOf(right, left)) {
        // maybe `left` can be overridden by `right` which is a shorthand?
        if (!right.important && left.important)
          continue;

        if (!sameVendorPrefixesIn([left], right.components))
          continue;

        component = right.components.filter(nameMatchFilter(left))[0];
        mayOverride = (compactable[left.name] && compactable[left.name].canOverride) || canOverride.sameValue;
        if (everyCombination(mayOverride, left, component, validator)) {
          left.unused = true;
        }
      } else if (left.shorthand && !right.shorthand && isComponentOf(left, right)) {
        // maybe `right` can be pulled into `left` which is a shorthand?
        if (right.important && !left.important)
          continue;

        // Pending more clever algorithm in #527
        if (moreSameShorthands(properties, i - 1, left.name))
          continue;

        if (mergingIntoFunction(left, right, validator))
          continue;

        component = left.components.filter(nameMatchFilter(right))[0];
        if (everyCombination(mayOverride, component, right, validator)) {
          var disabledBackgroundMerging =
            !compatibility.properties.backgroundClipMerging && component.name.indexOf('background-clip') > -1 ||
            !compatibility.properties.backgroundOriginMerging && component.name.indexOf('background-origin') > -1 ||
            !compatibility.properties.backgroundSizeMerging && component.name.indexOf('background-size') > -1;
          var nonMergeableValue = compactable[right.name].nonMergeableValue === right.value[0][0];

          if (disabledBackgroundMerging || nonMergeableValue)
            continue;

          if (!compatibility.properties.merging && wouldBreakCompatibility(left, validator))
            continue;

          if (component.value[0][0] != right.value[0][0] && (hasInherit(left) || hasInherit(right)))
            continue;

          if (wouldResultInLongerValue(left, right))
            continue;

          if (!left.multiplex && right.multiplex)
            turnIntoMultiplex(left, multiplexSize(right));

          override(component, right);
          left.dirty = true;
        }
      } else if (left.shorthand && right.shorthand && left.name == right.name) {
        // merge if all components can be merged

        if (!right.important && left.important) {
          right.unused = true;
          continue propertyLoop;
        }

        if (right.important && !left.important) {
          left.unused = true;
          continue;
        }

        for (k = left.components.length - 1; k >= 0; k--) {
          var leftComponent = left.components[k];
          var rightComponent = right.components[k];

          mayOverride = compactable[leftComponent.name].canOverride || canOverride.sameValue;
          if (!everyCombination(mayOverride, leftComponent, rightComponent, validator))
            continue propertyLoop;
          if (!everyCombination(canOverride.twoOptionalFunctions, leftComponent, rightComponent, validator) && validator.isValidFunction(rightComponent))
            continue propertyLoop;
        }

        overrideShorthand(left, right);
        left.dirty = true;
      } else if (left.shorthand && right.shorthand && isComponentOf(left, right)) {
        // border is a shorthand but any of its components is a shorthand too

        if (!left.important && right.important)
          continue;

        component = left.components.filter(nameMatchFilter(right))[0];
        mayOverride = compactable[right.name].canOverride || canOverride.sameValue;
        if (!everyCombination(mayOverride, component, right, validator))
          continue;

        if (left.important && !right.important) {
          right.unused = true;
          continue;
        }

        var rightRestored = compactable[right.name].restore(right, compactable);
        if (rightRestored.length > 1)
          continue;

        component = left.components.filter(nameMatchFilter(right))[0];
        override(component, right);
        right.dirty = true;
      } else if (left.name == right.name) {
        // two non-shorthands should be merged based on understandability

        if (left.important && !right.important) {
          right.unused = true;
          continue;
        }

        mayOverride = compactable[right.name].canOverride || canOverride.sameValue;
        if (!everyCombination(mayOverride, left, right, validator))
          continue;

        left.unused = true;
      }
    }
  }
}

module.exports = compactOverrides;
