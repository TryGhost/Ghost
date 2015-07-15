var util = require('util');

var DEFAULTS = {
  '*': {
    colors: {
      opacity: true // rgba / hsla
    },
    properties: {
      backgroundClipMerging: false, // background-clip to shorthand
      backgroundOriginMerging: false, // background-origin to shorthand
      backgroundSizeMerging: false, // background-size to shorthand
      colors: true, // any kind of color transformations, like `#ff00ff` to `#f0f` or `#fff` into `red`
      iePrefixHack: false, // underscore / asterisk prefix hacks on IE
      ieSuffixHack: true, // \9 suffix hacks on IE6-9
      merging: true, // merging properties into one
      spaceAfterClosingBrace: true, // 'url() no-repeat' to 'url()no-repeat'
      urlQuotes: false, // whether to wrap content of `url()` into quotes or not
      zeroUnits: true // 0[unit] -> 0
    },
    selectors: {
      adjacentSpace: false, // div+ nav Android stock browser hack
      ie7Hack: false, // *+html hack
      special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:dir\([a-z-]*\)|:first(?![a-z-])|:fullscreen|:left|:read-only|:read-write|:right)/ // special selectors which prevent merging
    },
    units: {
      ch: true,
      rem: true,
      vh: true,
      vm: true, // vm is vmin on IE9+ see https://developer.mozilla.org/en-US/docs/Web/CSS/length
      vmax: true,
      vmin: true,
      vw: true
    }
  },
  'ie8': {
    colors: {
      opacity: false
    },
    properties: {
      backgroundClipMerging: false,
      backgroundOriginMerging: false,
      backgroundSizeMerging: false,
      colors: true,
      iePrefixHack: true,
      ieSuffixHack: true,
      merging: false,
      spaceAfterClosingBrace: true,
      urlQuotes: false,
      zeroUnits: true
    },
    selectors: {
      adjacentSpace: false,
      ie7Hack: false,
      special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:root|:nth|:first\-of|:last|:only|:empty|:target|:checked|::selection|:enabled|:disabled|:not)/
    },
    units: {
      ch: false,
      rem: false,
      vh: false,
      vm: false,
      vmax: false,
      vmin: false,
      vw: false
    }
  },
  'ie7': {
    colors: {
      opacity: false
    },
    properties: {
      backgroundClipMerging: false,
      backgroundOriginMerging: false,
      backgroundSizeMerging: false,
      colors: true,
      iePrefixHack: true,
      ieSuffixHack: true,
      merging: false,
      spaceAfterClosingBrace: true,
      urlQuotes: false,
      zeroUnits: true
    },
    selectors: {
      adjacentSpace: false,
      ie7Hack: true,
      special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:focus|:before|:after|:root|:nth|:first\-of|:last|:only|:empty|:target|:checked|::selection|:enabled|:disabled|:not)/
    },
    units: {
      ch: false,
      rem: false,
      vh: false,
      vm: false,
      vmax: false,
      vmin: false,
      vw: false,
    }
  }
};

function Compatibility(source) {
  this.source = source || {};
}

function merge(source, target) {
  for (var key in source) {
    var value = source[key];

    if (typeof value === 'object' && !util.isRegExp(value))
      target[key] = merge(value, target[key] || {});
    else
      target[key] = key in target ? target[key] : value;
  }

  return target;
}

function calculateSource(source) {
  if (typeof source == 'object')
    return source;

  if (!/[,\+\-]/.test(source))
    return DEFAULTS[source] || DEFAULTS['*'];

  var parts = source.split(',');
  var template = parts[0] in DEFAULTS ?
    DEFAULTS[parts.shift()] :
    DEFAULTS['*'];

  source = {};

  parts.forEach(function (part) {
    var isAdd = part[0] == '+';
    var key = part.substring(1).split('.');
    var group = key[0];
    var option = key[1];

    source[group] = source[group] || {};
    source[group][option] = isAdd;
  });

  return merge(template, source);
}

Compatibility.prototype.toOptions = function () {
  return merge(DEFAULTS['*'], calculateSource(this.source));
};

module.exports = Compatibility;
