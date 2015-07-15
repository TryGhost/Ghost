var CleanUp = require('./clean-up');
var Splitter = require('../../utils/splitter');

var RGB = require('../../colors/rgb');
var HSL = require('../../colors/hsl');
var HexNameShortener = require('../../colors/hex-name-shortener');

var DEFAULT_ROUNDING_PRECISION = 2;
var CHARSET_TOKEN = '@charset';
var CHARSET_REGEXP = new RegExp('^' + CHARSET_TOKEN, 'i');

var FONT_NUMERAL_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
var FONT_NAME_WEIGHTS = ['normal', 'bold', 'bolder', 'lighter'];
var FONT_NAME_WEIGHTS_WITHOUT_NORMAL = ['bold', 'bolder', 'lighter'];

function SimpleOptimizer(options) {
  this.options = options;

  var units = ['px', 'em', 'ex', 'cm', 'mm', 'in', 'pt', 'pc', '%'];
  var otherUnits = ['ch', 'rem', 'vh', 'vm', 'vmax', 'vmin', 'vw'];

  otherUnits.forEach(function (unit) {
    if (options.compatibility.units[unit])
      units.push(unit);
  });

  options.unitsRegexp = new RegExp('(^|\\s|\\(|,)0(?:' + units.join('|') + ')(\\W|$)', 'g');

  options.precision = {};
  options.precision.value = options.roundingPrecision === undefined ?
    DEFAULT_ROUNDING_PRECISION :
    options.roundingPrecision;
  options.precision.multiplier = Math.pow(10, options.precision.value);
  options.precision.regexp = new RegExp('(\\d*\\.\\d{' + (options.precision.value + 1) + ',})px', 'g');
}

var valueMinifiers = {
  'background': function (value, index, total) {
    return index == 1 && total == 2 && (value == 'none' || value == 'transparent') ? '0 0' : value;
  },
  'font-weight': function (value) {
    if (value == 'normal')
      return '400';
    else if (value == 'bold')
      return '700';
    else
      return value;
  },
  'outline': function (value, index, total) {
    return index == 1 && total == 2 && value == 'none' ? '0' : value;
  }
};

function isNegative(property, idx) {
  return property[idx] && property[idx][0][0] == '-' && parseFloat(property[idx][0]) < 0;
}

function zeroMinifier(name, value) {
  if (value.indexOf('0') == -1)
    return value;

  if (value.indexOf('-') > -1) {
    value = value
      .replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2')
      .replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2');
  }

  return value
    .replace(/(^|\s)0+([1-9])/g, '$1$2')
    .replace(/(^|\D)\.0+(\D|$)/g, '$10$2')
    .replace(/(^|\D)\.0+(\D|$)/g, '$10$2')
    .replace(/\.([1-9]*)0+(\D|$)/g, function(match, nonZeroPart, suffix) {
      return (nonZeroPart.length > 0 ? '.' : '') + nonZeroPart + suffix;
    })
    .replace(/(^|\D)0\.(\d)/g, '$1.$2');
}

function zeroDegMinifier(_, value) {
  if (value.indexOf('0deg') == -1)
    return value;

  return value.replace(/\(0deg\)/g, '(0)');
}

function whitespaceMinifier(name, value) {
  if (name.indexOf('filter') > -1 || value.indexOf(' ') == -1)
    return value;

  value = value.replace(/\s+/g, ' ');

  if (value.indexOf('calc') > -1)
    value = value.replace(/\) ?\/ ?/g, ')/ ');

  return value
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/, /g, ',');
}

function precisionMinifier(_, value, precisionOptions) {
  if (precisionOptions.value === -1 || value.indexOf('.') === -1)
    return value;

  return value
    .replace(precisionOptions.regexp, function(match, number) {
      return Math.round(parseFloat(number) * precisionOptions.multiplier) / precisionOptions.multiplier + 'px';
    })
    .replace(/(\d)\.($|\D)/g, '$1$2');
}

function unitMinifier(name, value, unitsRegexp) {
  if (/^(?:\-moz\-calc|\-webkit\-calc|calc)\(/.test(value))
    return value;

  if (name == 'flex' || name == 'flex-basis')
    return value;

  return value
    .replace(unitsRegexp, '$1' + '0' + '$2')
    .replace(unitsRegexp, '$1' + '0' + '$2');
}

function multipleZerosMinifier(property) {
  if (property.length == 5 && property[1][0] === '0' && property[2][0] === '0' && property[3][0] === '0' && property[4][0] === '0') {
    if (property[0][0].indexOf('box-shadow') > -1)
      property.splice(3);
    else
      property.splice(2);
  }
}

function colorMininifier(_, value, compatibility) {
  if (value.indexOf('#') === -1 && value.indexOf('rgb') == -1 && value.indexOf('hsl') == -1)
    return HexNameShortener.shorten(value);

  value = value
    .replace(/rgb\((\-?\d+),(\-?\d+),(\-?\d+)\)/g, function (match, red, green, blue) {
      return new RGB(red, green, blue).toHex();
    })
    .replace(/hsl\((-?\d+),(-?\d+)%?,(-?\d+)%?\)/g, function (match, hue, saturation, lightness) {
      return new HSL(hue, saturation, lightness).toHex();
    })
    .replace(/(^|[^='"])#([0-9a-f]{6})/gi, function (match, prefix, color) {
      if (color[0] == color[1] && color[2] == color[3] && color[4] == color[5])
        return prefix + '#' + color[0] + color[2] + color[4];
      else
        return prefix + '#' + color;
    })
    .replace(/(rgb|rgba|hsl|hsla)\(([^\)]+)\)/g, function(match, colorFunction, colorDef) {
      var tokens = colorDef.split(',');
      var applies = (colorFunction == 'hsl' && tokens.length == 3) ||
        (colorFunction == 'hsla' && tokens.length == 4) ||
        (colorFunction == 'rgb' && tokens.length == 3 && colorDef.indexOf('%') > 0) ||
        (colorFunction == 'rgba' && tokens.length == 4 && colorDef.indexOf('%') > 0);
      if (!applies)
        return match;

      if (tokens[1].indexOf('%') == -1)
        tokens[1] += '%';
      if (tokens[2].indexOf('%') == -1)
        tokens[2] += '%';
      return colorFunction + '(' + tokens.join(',') + ')';
    });

  if (compatibility.colors.opacity) {
    value = value.replace(/(?:rgba|hsla)\(0,0%?,0%?,0\)/g, function (match) {
      if (new Splitter(',').split(value).pop().indexOf('gradient(') > -1)
        return match;

      return 'transparent';
    });
  }

  return HexNameShortener.shorten(value);
}

function minifyBorderRadius(property) {
  if (property.length == 4 && property[2][0] == '/' && property[1][0] == property[3][0])
    property.splice(2);
  else if (property.length == 6 && property[3][0] == '/' && property[1][0] == property[4][0] && property[2][0] == property[5][0])
    property.splice(3);
  else if (property.length == 8 && property[4][0] == '/' && property[1][0] == property[5][0] && property[2][0] == property[6][0] && property[3][0] == property[7][0])
    property.splice(4);
  else if (property.length == 10 && property[5][0] == '/' && property[1][0] == property[6][0] && property[2][0] == property[7][0] && property[3][0] == property[8][0] && property[4][0] == property[9][0])
    property.splice(5);
}

function minifyFilter(property) {
  if (property.length < 3) {
    property[1][0] = property[1][0].replace(/progid:DXImageTransform\.Microsoft\.(Alpha|Chroma)(\W)/, function (match, filter, suffix) {
      return filter.toLowerCase() + suffix;
    });
  }

  property[1][0] = property[1][0]
    .replace(/,(\S)/g, ', $1')
    .replace(/ ?= ?/g, '=');
}

function minifyFont(property) {
  var hasNumeral = FONT_NUMERAL_WEIGHTS.indexOf(property[1][0]) > -1 ||
    property[2] && FONT_NUMERAL_WEIGHTS.indexOf(property[2][0]) > -1 ||
    property[3] && FONT_NUMERAL_WEIGHTS.indexOf(property[3][0]) > -1;

  if (hasNumeral)
    return;

  if (property[2] == '/')
    return;

  var normalCount = 0;
  if (property[1][0] == 'normal')
    normalCount++;
  if (property[2] && property[2][0] == 'normal')
    normalCount++;
  if (property[3] && property[3][0] == 'normal')
    normalCount++;

  if (normalCount > 1)
    return;

  var toOptimize;
  if (FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(property[1][0]) > -1)
    toOptimize = 1;
  else if (property[2] && FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(property[2][0]) > -1)
    toOptimize = 2;
  else if (property[3] && FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(property[3][0]) > -1)
    toOptimize = 3;
  else if (FONT_NAME_WEIGHTS.indexOf(property[1][0]) > -1)
    toOptimize = 1;
  else if (property[2] && FONT_NAME_WEIGHTS.indexOf(property[2][0]) > -1)
    toOptimize = 2;
  else if (property[3] && FONT_NAME_WEIGHTS.indexOf(property[3][0]) > -1)
    toOptimize = 3;

  if (toOptimize)
    property[toOptimize][0] = valueMinifiers['font-weight'](property[toOptimize][0]);
}

function optimizeBody(properties, options) {
  var property, name, value, unused;

  for (var i = 0, l = properties.length; i < l; i++) {
    unused = false;
    property = properties[i];

    // FIXME: the check should be gone with #407
    if (typeof property == 'string' && property.indexOf('__ESCAPED_') === 0)
      continue;

    name = property[0][0];

    var hackType = property[0][2];
    if (hackType) {
      if ((hackType == 'star' || hackType == 'underscore') && !options.compatibility.properties.iePrefixHack || hackType == 'suffix' && !options.compatibility.properties.ieSuffixHack)
        unused = true;
    }

    if (name.indexOf('padding') === 0 && (isNegative(property, 1) || isNegative(property, 2) || isNegative(property, 3) || isNegative(property, 4)))
      unused = true;

    if (unused) {
      properties.splice(i, 1);
      i--;
      l--;
      continue;
    }

    for (var j = 1, m = property.length; j < m; j++) {
      value = property[j][0];

      if (valueMinifiers[name])
        value = valueMinifiers[name](value, j, m);

      value = whitespaceMinifier(name, value);
      value = precisionMinifier(name, value, options.precision);
      value = zeroMinifier(name, value);
      if (options.compatibility.properties.zeroUnits) {
        value = zeroDegMinifier(name, value);
        value = unitMinifier(name, value, options.unitsRegexp);
      }
      if (options.compatibility.properties.colors)
        value = colorMininifier(name, value, options.compatibility);

      property[j][0] = value;
    }

    multipleZerosMinifier(property);

    if (name.indexOf('border') === 0 && name.indexOf('radius') > 0)
      minifyBorderRadius(property);
    else if (name == 'filter')
      minifyFilter(property);
    else if (name == 'font')
      minifyFont(property);
  }
}

SimpleOptimizer.prototype.optimize = function(tokens) {
  var self = this;
  var hasCharset = false;
  var options = this.options;
  var ie7Hack = options.compatibility.selectors.ie7Hack;
  var adjacentSpace = options.compatibility.selectors.adjacentSpace;
  var spaceAfterClosingBrace = options.compatibility.properties.spaceAfterClosingBrace;

  function _cleanupCharsets(tokens) {
    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];

      if (token[0] != 'at-rule')
        continue;

      if (CHARSET_REGEXP.test(token[1][0])) {
        if (hasCharset || token[1][0].indexOf(CHARSET_TOKEN) == -1) {
          tokens.splice(i, 1);
          i--;
          l--;
        } else {
          hasCharset = true;
          tokens.splice(i, 1);
          tokens.unshift(['at-rule', [token[1][0].replace(CHARSET_REGEXP, CHARSET_TOKEN)]]);
        }
      }
    }
  }

  function _optimize(tokens) {
    var mayHaveCharset = false;

    for (var i = 0, l = tokens.length; i < l; i++) {
      var token = tokens[i];

      switch (token[0]) {
        case 'selector':
          token[1] = CleanUp.selectors(token[1], !ie7Hack, adjacentSpace);
          optimizeBody(token[2], self.options);
          break;
        case 'block':
          CleanUp.block(token[1], spaceAfterClosingBrace);
          _optimize(token[2]);
          break;
        case 'flat-block':
          CleanUp.block(token[1], spaceAfterClosingBrace);
          optimizeBody(token[2], self.options);
          break;
        case 'at-rule':
          CleanUp.atRule(token[1]);
          mayHaveCharset = true;
      }

      if (token[1].length === 0 || (token[2] && token[2].length === 0)) {
        tokens.splice(i, 1);
        i--;
        l--;
      }
    }

    if (mayHaveCharset)
      _cleanupCharsets(tokens);
  }

  _optimize(tokens);
};

module.exports = SimpleOptimizer;
