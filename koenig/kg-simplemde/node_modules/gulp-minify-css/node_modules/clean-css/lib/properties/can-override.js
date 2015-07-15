// Functions that decide what value can override what.
// The main purpose is to disallow removing CSS fallbacks.
// A separate implementation is needed for every different kind of CSS property.
// -----
// The generic idea is that properties that have wider browser support are 'more understandable'
// than others and that 'less understandable' values can't override more understandable ones.

// Use when two tokens of the same property can always be merged
function always() {
  return true;
}

function backgroundImage(property1, property2, validator) {
  // The idea here is that 'more understandable' values override 'less understandable' values, but not vice versa
  // Understandability: (none | url | inherit) > (same function) > (same value)

  // (none | url)
  var image1 = property1.value[0][0];
  var image2 = property2.value[0][0];

  if (image2 == 'none' || image2 == 'inherit' || validator.isValidUrl(image2))
    return true;
  if (image1 == 'none' || image1 == 'inherit' || validator.isValidUrl(image1))
    return false;

  // Functions with the same name can override each other; same values can override each other
  return sameFunctionOrValue(property1, property2, validator);
}

function border(property1, property2, validator) {
  return color(property1.components[2], property2.components[2], validator);
}

// Use for color properties (color, background-color, border-color, etc.)
function color(property1, property2, validator) {
  // The idea here is that 'more understandable' values override 'less understandable' values, but not vice versa
  // Understandability: (hex | named) > (rgba | hsla) > (same function name) > anything else
  // NOTE: at this point rgb and hsl are replaced by hex values by clean-css

  var color1 = property1.value[0][0];
  var color2 = property2.value[0][0];

  // (hex | named)
  if (validator.isValidNamedColor(color2) || validator.isValidHexColor(color2))
    return true;
  if (validator.isValidNamedColor(color1) || validator.isValidHexColor(color1))
    return false;

  // (rgba|hsla)
  if (validator.isValidRgbaColor(color2) || validator.isValidHslaColor(color2))
    return true;
  if (validator.isValidRgbaColor(color1) || validator.isValidHslaColor(color1))
    return false;

  // Functions with the same name can override each other; same values can override each other
  return sameFunctionOrValue(property1, property2, validator);
}

function twoOptionalFunctions(property1, property2, validator) {
  var value1 = property1.value[0][0];
  var value2 = property2.value[0][0];

  return !(validator.isValidFunction(value1) ^ validator.isValidFunction(value2));
}

function sameValue(property1, property2) {
  var value1 = property1.value[0][0];
  var value2 = property2.value[0][0];

  return value1 === value2;
}

function sameFunctionOrValue(property1, property2, validator) {
  var value1 = property1.value[0][0];
  var value2 = property2.value[0][0];

  // Functions with the same name can override each other
  if (validator.areSameFunction(value1, value2))
    return true;

  return value1 === value2;
}

// Use for properties containing CSS units (margin-top, padding-left, etc.)
function unit(property1, property2, validator) {
  // The idea here is that 'more understandable' values override 'less understandable' values, but not vice versa
  // Understandability: (unit without functions) > (same functions | standard functions) > anything else
  // NOTE: there is no point in having different vendor-specific functions override each other or standard functions,
  //       or having standard functions override vendor-specific functions, but standard functions can override each other
  // NOTE: vendor-specific property values are not taken into consideration here at the moment
  var value1 = property1.value[0][0];
  var value2 = property2.value[0][0];

  if (validator.isValidAndCompatibleUnitWithoutFunction(value1) && !validator.isValidAndCompatibleUnitWithoutFunction(value2))
    return false;

  if (validator.isValidUnitWithoutFunction(value2))
    return true;
  if (validator.isValidUnitWithoutFunction(value1))
    return false;

  // Standard non-vendor-prefixed functions can override each other
  if (validator.isValidFunctionWithoutVendorPrefix(value2) && validator.isValidFunctionWithoutVendorPrefix(value1)) {
    return true;
  }

  // Functions with the same name can override each other; same values can override each other
  return sameFunctionOrValue(property1, property2, validator);
}

module.exports = {
  always: always,
  backgroundImage: backgroundImage,
  border: border,
  color: color,
  sameValue: sameValue,
  sameFunctionOrValue: sameFunctionOrValue,
  twoOptionalFunctions: twoOptionalFunctions,
  unit: unit
};
