// Validates various CSS property values

var Splitter = require('../utils/splitter');

var widthKeywords = ['thin', 'thick', 'medium', 'inherit', 'initial'];
var allUnits = ['px', '%', 'em', 'in', 'cm', 'mm', 'ex', 'pt', 'pc', 'ch', 'rem', 'vh', 'vm', 'vmin', 'vmax', 'vw'];
var cssUnitRegexStr = '(\\-?\\.?\\d+\\.?\\d*(' + allUnits.join('|') + '|)|auto|inherit)';
var cssCalcRegexStr = '(\\-moz\\-|\\-webkit\\-)?calc\\([^\\)]+\\)';
var cssFunctionNoVendorRegexStr = '[A-Z]+(\\-|[A-Z]|[0-9])+\\(([A-Z]|[0-9]|\\ |\\,|\\#|\\+|\\-|\\%|\\.|\\(|\\))*\\)';
var cssFunctionVendorRegexStr = '\\-(\\-|[A-Z]|[0-9])+\\(([A-Z]|[0-9]|\\ |\\,|\\#|\\+|\\-|\\%|\\.|\\(|\\))*\\)';
var cssVariableRegexStr = 'var\\(\\-\\-[^\\)]+\\)';
var cssFunctionAnyRegexStr = '(' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')';
var cssUnitOrCalcRegexStr = '(' + cssUnitRegexStr + '|' + cssCalcRegexStr + ')';
var cssUnitAnyRegexStr = '(none|' + widthKeywords.join('|') + '|' + cssUnitRegexStr + '|' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')';

var cssFunctionNoVendorRegex = new RegExp('^' + cssFunctionNoVendorRegexStr + '$', 'i');
var cssFunctionVendorRegex = new RegExp('^' + cssFunctionVendorRegexStr + '$', 'i');
var cssVariableRegex = new RegExp('^' + cssVariableRegexStr + '$', 'i');
var cssFunctionAnyRegex = new RegExp('^' + cssFunctionAnyRegexStr + '$', 'i');
var cssUnitRegex = new RegExp('^' + cssUnitRegexStr + '$', 'i');
var cssUnitOrCalcRegex = new RegExp('^' + cssUnitOrCalcRegexStr + '$', 'i');
var cssUnitAnyRegex = new RegExp('^' + cssUnitAnyRegexStr + '$', 'i');

var backgroundRepeatKeywords = ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'inherit'];
var backgroundAttachmentKeywords = ['inherit', 'scroll', 'fixed', 'local'];
var backgroundPositionKeywords = ['center', 'top', 'bottom', 'left', 'right'];
var backgroundSizeKeywords = ['contain', 'cover'];
var backgroundBoxKeywords = ['border-box', 'content-box', 'padding-box'];
var styleKeywords = ['auto', 'inherit', 'hidden', 'none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];
var listStyleTypeKeywords = ['armenian', 'circle', 'cjk-ideographic', 'decimal', 'decimal-leading-zero', 'disc', 'georgian', 'hebrew', 'hiragana', 'hiragana-iroha', 'inherit', 'katakana', 'katakana-iroha', 'lower-alpha', 'lower-greek', 'lower-latin', 'lower-roman', 'none', 'square', 'upper-alpha', 'upper-latin', 'upper-roman'];
var listStylePositionKeywords = ['inside', 'outside', 'inherit'];

function Validator(compatibility) {
  var validUnits = allUnits.slice(0).filter(function (value) {
    return !(value in compatibility.units) || compatibility.units[value] === true;
  });

  var compatibleCssUnitRegexStr = '(\\-?\\.?\\d+\\.?\\d*(' + validUnits.join('|') + '|)|auto|inherit)';
  this.compatibleCssUnitRegex = new RegExp('^' + compatibleCssUnitRegexStr + '$', 'i');
  this.compatibleCssUnitAnyRegex = new RegExp('^(none|' + widthKeywords.join('|') + '|' + compatibleCssUnitRegexStr + '|' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')$', 'i');
}

Validator.prototype.isValidHexColor = function (s) {
  return (s.length === 4 || s.length === 7) && s[0] === '#';
};

Validator.prototype.isValidRgbaColor = function (s) {
  s = s.split(' ').join('');
  return s.length > 0 && s.indexOf('rgba(') === 0 && s.indexOf(')') === s.length - 1;
};

Validator.prototype.isValidHslaColor = function (s) {
  s = s.split(' ').join('');
  return s.length > 0 && s.indexOf('hsla(') === 0 && s.indexOf(')') === s.length - 1;
};

Validator.prototype.isValidNamedColor = function (s) {
  // We don't really check if it's a valid color value, but allow any letters in it
  return s !== 'auto' && (s === 'transparent' || s === 'inherit' || /^[a-zA-Z]+$/.test(s));
};

Validator.prototype.isValidVariable = function (s) {
  return cssVariableRegex.test(s);
};

Validator.prototype.isValidColor = function (s) {
  return this.isValidNamedColor(s) ||
    this.isValidHexColor(s) ||
    this.isValidRgbaColor(s) ||
    this.isValidHslaColor(s) ||
    this.isValidVariable(s) ||
    this.isValidVendorPrefixedValue(s);
};

Validator.prototype.isValidUrl = function (s) {
  // NOTE: at this point all URLs are replaced with placeholders by clean-css, so we check for those placeholders
  return s.indexOf('__ESCAPED_URL_CLEAN_CSS') === 0;
};

Validator.prototype.isValidUnit = function (s) {
  return cssUnitAnyRegex.test(s);
};

Validator.prototype.isValidUnitWithoutFunction = function (s) {
  return cssUnitRegex.test(s);
};

Validator.prototype.isValidAndCompatibleUnit = function (s) {
  return this.compatibleCssUnitAnyRegex.test(s);
};

Validator.prototype.isValidAndCompatibleUnitWithoutFunction = function (s) {
  return this.compatibleCssUnitRegex.test(s);
};

Validator.prototype.isValidFunctionWithoutVendorPrefix = function (s) {
  return cssFunctionNoVendorRegex.test(s);
};

Validator.prototype.isValidFunctionWithVendorPrefix = function (s) {
  return cssFunctionVendorRegex.test(s);
};

Validator.prototype.isValidFunction = function (s) {
  return cssFunctionAnyRegex.test(s);
};

Validator.prototype.isValidBackgroundRepeat = function (s) {
  return backgroundRepeatKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidBackgroundAttachment = function (s) {
  return backgroundAttachmentKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidBackgroundBox = function (s) {
  return backgroundBoxKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidBackgroundPositionPart = function (s) {
  return backgroundPositionKeywords.indexOf(s) >= 0 || cssUnitOrCalcRegex.test(s) || this.isValidVariable(s);
};

Validator.prototype.isValidBackgroundPosition = function (s) {
  if (s === 'inherit')
    return true;

  var parts = s.split(' ');
  for (var i = 0, l = parts.length; i < l; i++) {
    if (parts[i] === '')
      continue;
    if (this.isValidBackgroundPositionPart(parts[i]) || this.isValidVariable(parts[i]))
      continue;

    return false;
  }

  return true;
};

Validator.prototype.isValidBackgroundSizePart = function (s) {
  return backgroundSizeKeywords.indexOf(s) >= 0 || cssUnitRegex.test(s) || this.isValidVariable(s);
};

Validator.prototype.isValidBackgroundPositionAndSize = function (s) {
  if (s.indexOf('/') < 0)
    return false;

  var twoParts = new Splitter('/').split(s);
  return this.isValidBackgroundSizePart(twoParts.pop()) && this.isValidBackgroundPositionPart(twoParts.pop());
};

Validator.prototype.isValidListStyleType = function (s) {
  return listStyleTypeKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidListStylePosition = function (s) {
  return listStylePositionKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidStyle = function (s) {
  return styleKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidWidth = function (s) {
  return this.isValidUnit(s) || widthKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
};

Validator.prototype.isValidVendorPrefixedValue = function (s) {
  return /^-([A-Za-z0-9]|-)*$/gi.test(s);
};

Validator.prototype.areSameFunction = function (a, b) {
  if (!this.isValidFunction(a) || !this.isValidFunction(b))
    return false;

  var f1name = a.substring(0, a.indexOf('('));
  var f2name = b.substring(0, b.indexOf('('));

  return f1name === f2name;
};

module.exports = Validator;
