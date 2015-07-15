var wrapSingle = require('./wrap-for-optimizing').single;

var Splitter = require('../utils/splitter');
var MULTIPLEX_SEPARATOR = ',';

function _colorFilter(validator) {
  return function (value) {
    return value[0] == 'invert' || validator.isValidColor(value[0]);
  };
}

function _styleFilter(validator) {
  return function (value) {
    return value[0] != 'inherit' && validator.isValidStyle(value[0]);
  };
}

function _wrapDefault(name, property, compactable) {
  var descriptor = compactable[name];
  if (descriptor.doubleValues && descriptor.defaultValue.length == 2)
    return wrapSingle([[name, property.important], [descriptor.defaultValue[0]], [descriptor.defaultValue[1]]]);
  else if (descriptor.doubleValues && descriptor.defaultValue.length == 1)
    return wrapSingle([[name, property.important], [descriptor.defaultValue[0]]]);
  else
    return wrapSingle([[name, property.important], [descriptor.defaultValue]]);
}

function _widthFilter(validator) {
  return function (value) {
    return value[0] != 'inherit' && validator.isValidWidth(value[0]);
  };
}

function background(property, compactable, validator) {
  var image = _wrapDefault('background-image', property, compactable);
  var position = _wrapDefault('background-position', property, compactable);
  var size = _wrapDefault('background-size', property, compactable);
  var repeat = _wrapDefault('background-repeat', property, compactable);
  var attachment = _wrapDefault('background-attachment', property, compactable);
  var origin = _wrapDefault('background-origin', property, compactable);
  var clip = _wrapDefault('background-clip', property, compactable);
  var color = _wrapDefault('background-color', property, compactable);
  var components = [image, position, size, repeat, attachment, origin, clip, color];
  var values = property.value;

  var positionSet = false;
  var clipSet = false;
  var originSet = false;
  var repeatSet = false;

  if (property.value.length == 1 && property.value[0][0] == 'inherit') {
    // NOTE: 'inherit' is not a valid value for background-attachment
    color.value = image.value =  repeat.value = position.value = size.value = origin.value = clip.value = property.value;
    return components;
  }

  for (var i = values.length - 1; i >= 0; i--) {
    var value = values[i];

    if (validator.isValidBackgroundAttachment(value[0])) {
      attachment.value = [value];
    } else if (validator.isValidBackgroundBox(value[0])) {
      if (clipSet) {
        origin.value = [value];
        originSet = true;
      } else {
        clip.value = [value];
        clipSet = true;
      }
    } else if (validator.isValidBackgroundRepeat(value[0])) {
      if (repeatSet) {
        repeat.value.unshift(value);
      } else {
        repeat.value = [value];
        repeatSet = true;
      }
    } else if (validator.isValidBackgroundPositionPart(value[0]) || validator.isValidBackgroundSizePart(value[0])) {
      if (i > 0) {
        var previousValue = values[i - 1];

        if (previousValue[0].indexOf('/') > 0) {
          var twoParts = new Splitter('/').split(previousValue[0]);
          // NOTE: we do this slicing as value may contain metadata too, like for source maps
          size.value = [[twoParts.pop()].concat(previousValue.slice(1)), value];
          values[i - 1] = [twoParts.pop()].concat(previousValue.slice(1));
        } else if (i > 1 && values[i - 2] == '/') {
          size.value = [previousValue, value];
          i -= 2;
        } else if (values[i - 1] == '/') {
          size.value = [value];
        } else {
          if (!positionSet)
            position.value = [];

          position.value.unshift(value);
          positionSet = true;
        }
      } else {
        if (!positionSet)
          position.value = [];

        position.value.unshift(value);
        positionSet = true;
      }
    } else if (validator.isValidBackgroundPositionAndSize(value[0])) {
      var sizeValue = new Splitter('/').split(value[0]);
      // NOTE: we do this slicing as value may contain metadata too, like for source maps
      size.value = [[sizeValue.pop()].concat(value.slice(1))];
      position.value = [[sizeValue.pop()].concat(value.slice(1))];
    } else if ((color.value == compactable[color.name].defaultValue || color.value == 'none') && validator.isValidColor(value[0])) {
      color.value = [value];
    } else if (validator.isValidUrl(value[0]) || validator.isValidFunction(value[0])) {
      image.value = [value];
    }
  }

  if (clipSet && !originSet)
    origin.value = clip.value.slice(0);

  return components;
}

function borderRadius(property, compactable) {
  var values = property.value;
  var splitAt = -1;

  for (var i = 0, l = values.length; i < l; i++) {
    if (values[i][0] == '/') {
      splitAt = i;
      break;
    }
  }

  if (splitAt == -1)
    return fourValues(property, compactable);

  var target = _wrapDefault(property.name, property, compactable);
  target.value = values.slice(0, splitAt);
  target.components = fourValues(target, compactable);

  var remainder = _wrapDefault(property.name, property, compactable);
  remainder.value = values.slice(splitAt + 1);
  remainder.components = fourValues(remainder, compactable);

  for (var j = 0; j < 4; j++) {
    target.components[j].multiplex = true;
    target.components[j].value = target.components[j].value.concat([['/']]).concat(remainder.components[j].value);
  }

  return target.components;
}

function fourValues(property, compactable) {
  var componentNames = compactable[property.name].components;
  var components = [];
  var value = property.value;

  if (value.length < 1)
    return [];

  if (value.length < 2)
    value[1] = value[0];
  if (value.length < 3)
    value[2] = value[0];
  if (value.length < 4)
    value[3] = value[1];

  for (var i = componentNames.length - 1; i >= 0; i--) {
    var component = wrapSingle([[componentNames[i], property.important]]);
    component.value = [value[i]];
    components.unshift(component);
  }

  return components;
}

function multiplex(splitWith) {
  return function (property, compactable, validator) {
    var splitsAt = [];
    var values = property.value;
    var i, j, l, m;

    // find split commas
    for (i = 0, l = values.length; i < l; i++) {
      if (values[i][0] == ',')
        splitsAt.push(i);
    }

    if (splitsAt.length === 0)
      return splitWith(property, compactable, validator);

    var splitComponents = [];

    // split over commas, and into components
    for (i = 0, l = splitsAt.length; i <= l; i++) {
      var from = i === 0 ? 0 : splitsAt[i - 1] + 1;
      var to = i < l ? splitsAt[i] : values.length;

      var _property = _wrapDefault(property.name, property, compactable);
      _property.value = values.slice(from, to);

      splitComponents.push(splitWith(_property, compactable, validator));
    }

    var components = splitComponents[0];

    // group component values from each split
    for (i = 0, l = components.length; i < l; i++) {
      components[i].multiplex = true;

      for (j = 1, m = splitComponents.length; j < m; j++) {
        components[i].value.push([MULTIPLEX_SEPARATOR]);
        Array.prototype.push.apply(components[i].value, splitComponents[j][i].value);
      }
    }

    return components;
  };
}

function listStyle(property, compactable, validator) {
  var type = _wrapDefault('list-style-type', property, compactable);
  var position = _wrapDefault('list-style-position', property, compactable);
  var image = _wrapDefault('list-style-image', property, compactable);
  var components = [type, position, image];

  if (property.value.length == 1 && property.value[0][0] == 'inherit') {
    type.value = position.value = image.value = [property.value[0]];
    return components;
  }

  var values = property.value.slice(0);
  var total = values.length;
  var index = 0;

  // `image` first...
  for (index = 0, total = values.length; index < total; index++) {
    if (validator.isValidUrl(values[index][0]) || values[index][0] == '0') {
      image.value = [values[index]];
      values.splice(index, 1);
      break;
    }
  }

  // ... then `type`...
  for (index = 0, total = values.length; index < total; index++) {
    if (validator.isValidListStyleType(values[index][0])) {
      type.value = [values[index]];
      values.splice(index, 1);
      break;
    }
  }

  // ... and what's left is a `position`
  if (values.length > 0 && validator.isValidListStylePosition(values[0][0]))
    position.value = [values[0]];

  return components;
}

function widthStyleColor(property, compactable, validator) {
  var descriptor = compactable[property.name];
  var components = [
    _wrapDefault(descriptor.components[0], property, compactable),
    _wrapDefault(descriptor.components[1], property, compactable),
    _wrapDefault(descriptor.components[2], property, compactable)
  ];
  var color, style, width;

  for (var i = 0; i < 3; i++) {
    var component = components[i];

    if (component.name.indexOf('color') > 0)
      color = component;
    else if (component.name.indexOf('style') > 0)
      style = component;
    else
      width = component;
  }

  if ((property.value.length == 1 && property.value[0][0] == 'inherit') ||
      (property.value.length == 3 && property.value[0][0] == 'inherit' && property.value[1][0] == 'inherit' && property.value[2][0] == 'inherit')) {
    color.value = style.value = width.value = [property.value[0]];
    return components;
  }

  var values = property.value.slice(0);
  var match, matches;

  // NOTE: usually users don't follow the required order of parts in this shorthand,
  // so we'll try to parse it caring as little about order as possible

  if (values.length > 0) {
    matches = values.filter(_widthFilter(validator));
    match = matches.length > 1 && (matches[0] == 'none' || matches[0] == 'auto') ? matches[1] : matches[0];
    if (match) {
      width.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  if (values.length > 0) {
    match = values.filter(_styleFilter(validator))[0];
    if (match) {
      style.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  if (values.length > 0) {
    match = values.filter(_colorFilter(validator))[0];
    if (match) {
      color.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  return components;
}

module.exports = {
  background: background,
  border: widthStyleColor,
  borderRadius: borderRadius,
  fourValues: fourValues,
  listStyle: listStyle,
  multiplex: multiplex,
  outline: widthStyleColor
};
