var shallowClone = require('./clone').shallow;
var MULTIPLEX_SEPARATOR = ',';
var SIZE_POSITION_SEPARATOR = '/';

function isInheritOnly(values) {
  for (var i = 0, l = values.length; i < l; i++) {
    var value = values[i][0];

    if (value != 'inherit' && value != MULTIPLEX_SEPARATOR && value != SIZE_POSITION_SEPARATOR)
      return false;
  }

  return true;
}

function background(property, compactable, lastInMultiplex) {
  var components = property.components;
  var restored = [];
  var needsOne, needsBoth;

  function restoreValue(component) {
    Array.prototype.unshift.apply(restored, component.value);
  }

  function isDefaultValue(component) {
    var descriptor = compactable[component.name];
    if (descriptor.doubleValues) {
      if (descriptor.defaultValue.length == 1)
        return component.value[0][0] == descriptor.defaultValue[0] && (component.value[1] ? component.value[1][0] == descriptor.defaultValue[0] : true);
      else
        return component.value[0][0] == descriptor.defaultValue[0] && (component.value[1] ? component.value[1][0] : component.value[0][0]) == descriptor.defaultValue[1];
    } else {
      return component.value[0][0] == descriptor.defaultValue;
    }
  }

  for (var i = components.length - 1; i >= 0; i--) {
    var component = components[i];
    var isDefault = isDefaultValue(component);

    if (component.name == 'background-clip') {
      var originComponent = components[i - 1];
      var isOriginDefault = isDefaultValue(originComponent);

      needsOne = component.value[0][0] == originComponent.value[0][0];

      needsBoth = !needsOne && (
        (isOriginDefault && !isDefault) ||
        (!isOriginDefault && !isDefault) ||
        (!isOriginDefault && isDefault && component.value[0][0] != originComponent.value[0][0]));

      if (needsOne) {
        restoreValue(originComponent);
      } else if (needsBoth) {
        restoreValue(component);
        restoreValue(originComponent);
      }

      i--;
    } else if (component.name == 'background-size') {
      var positionComponent = components[i - 1];
      var isPositionDefault = isDefaultValue(positionComponent);

      needsOne = !isPositionDefault && isDefault;

      needsBoth = !needsOne &&
        (isPositionDefault && !isDefault || !isPositionDefault && !isDefault);

      if (needsOne) {
        restoreValue(positionComponent);
      } else if (needsBoth) {
        restoreValue(component);
        restored.unshift([SIZE_POSITION_SEPARATOR]);
        restoreValue(positionComponent);
      } else if (positionComponent.value.length == 1) {
        restoreValue(positionComponent);
      }

      i--;
    } else {
      if (isDefault || compactable[component.name].multiplexLastOnly && !lastInMultiplex)
        continue;

      restoreValue(component);
    }
  }

  if (restored.length === 0 && property.value.length == 1 && property.value[0][0] == '0')
    restored.push(property.value[0]);

  if (restored.length === 0)
    restored.push([compactable[property.name].defaultValue]);

  if (isInheritOnly(restored))
    return [restored[0]];

  return restored;
}

function borderRadius(property, compactable) {
  if (property.multiplex) {
    var horizontal = shallowClone(property);
    var vertical = shallowClone(property);

    for (var i = 0; i < 4; i++) {
      var component = property.components[i];

      var horizontalComponent = shallowClone(property);
      horizontalComponent.value = [component.value[0]];
      horizontal.components.push(horizontalComponent);

      var verticalComponent = shallowClone(property);
      verticalComponent.value = [component.value[2]];
      vertical.components.push(verticalComponent);
    }

    var horizontalValues = fourValues(horizontal, compactable);
    var verticalValues = fourValues(vertical, compactable);

    if (horizontalValues.length == verticalValues.length &&
        horizontalValues[0][0] == verticalValues[0][0] &&
        (horizontalValues.length > 1 ? horizontalValues[1][0] == verticalValues[1][0] : true) &&
        (horizontalValues.length > 2 ? horizontalValues[2][0] == verticalValues[2][0] : true) &&
        (horizontalValues.length > 3 ? horizontalValues[3][0] == verticalValues[3][0] : true)) {
      return horizontalValues;
    } else {
      return horizontalValues.concat([['/']]).concat(verticalValues);
    }
  } else {
    return fourValues(property, compactable);
  }
}

function fourValues(property) {
  var components = property.components;
  var value1 = components[0].value[0];
  var value2 = components[1].value[0];
  var value3 = components[2].value[0];
  var value4 = components[3].value[0];

  if (value1[0] == value2[0] && value1[0] == value3[0] && value1[0] == value4[0]) {
    return [value1];
  } else if (value1[0] == value3[0] && value2[0] == value4[0]) {
    return [value1, value2];
  } else if (value2[0] == value4[0]) {
    return [value1, value2, value3];
  } else {
    return [value1, value2, value3, value4];
  }
}

function multiplex(restoreWith) {
  return function (property, compactable) {
    if (!property.multiplex)
      return restoreWith(property, compactable, true);

    var multiplexSize = 0;
    var restored = [];
    var componentMultiplexSoFar = {};
    var i, l;

    // At this point we don't know what's the multiplex size, e.g. how many background layers are there
    for (i = 0, l = property.components[0].value.length; i < l; i++) {
      if (property.components[0].value[i][0] == MULTIPLEX_SEPARATOR)
        multiplexSize++;
    }

    for (i = 0; i <= multiplexSize; i++) {
      var _property = shallowClone(property);

      // We split multiplex into parts and restore them one by one
      for (var j = 0, m = property.components.length; j < m; j++) {
        var componentToClone = property.components[j];
        var _component = shallowClone(componentToClone);
        _property.components.push(_component);

        // The trick is some properties has more than one value, so we iterate over values looking for
        // a multiplex separator - a comma
        for (var k = componentMultiplexSoFar[_component.name] || 0, n = componentToClone.value.length; k < n; k++) {
          if (componentToClone.value[k][0] == MULTIPLEX_SEPARATOR) {
            componentMultiplexSoFar[_component.name] = k + 1;
            break;
          }

          _component.value.push(componentToClone.value[k]);
        }
      }

      // No we can restore shorthand value
      var lastInMultiplex = i == multiplexSize;
      var _restored = restoreWith(_property, compactable, lastInMultiplex);
      Array.prototype.push.apply(restored, _restored);

      if (i < multiplexSize)
        restored.push([',']);
    }

    return restored;
  };
}

function withoutDefaults(property, compactable) {
  var components = property.components;
  var restored = [];

  for (var i = components.length - 1; i >= 0; i--) {
    var component = components[i];
    var descriptor = compactable[component.name];

    if (component.value[0][0] != descriptor.defaultValue)
      restored.unshift(component.value[0]);
  }

  if (restored.length === 0)
    restored.push([compactable[property.name].defaultValue]);

  if (isInheritOnly(restored))
    return [restored[0]];

  return restored;
}

module.exports = {
  background: background,
  borderRadius: borderRadius,
  fourValues: fourValues,
  multiplex: multiplex,
  withoutDefaults: withoutDefaults
};
