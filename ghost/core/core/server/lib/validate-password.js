const _ = require('lodash');

const validator = require('@tryghost/validator');

const tpl = require('@tryghost/tpl');
const settingsCache = require('../../shared/settings-cache');
const urlUtils = require('../../shared/url-utils').default;

const messages = {
  passwordTooShort: 'Your password must be at least {minLength} characters long.',
  passwordTooLong: 'Your password is too long.',
  passwordDoesNotComplySecurity: 'Sorry, you cannot use an insecure password.',
};

/**
 * Counts repeated characters in a string. When 50% or more characters are the same,
 * we return false and therefore invalidate the string.
 * @param {string} stringToTest The password string to check.
 * @return {boolean}
 */
function characterOccurance(stringToTest) {
  const chars = {};
  let allowedOccurancy;
  let valid = true;

  stringToTest = _.toString(stringToTest);
  allowedOccurancy = stringToTest.length / 2;

  // Loop through string and accumulate character counts
  _.each(stringToTest, function (char) {
    if (!chars[char]) {
      chars[char] = 1;
    } else {
      chars[char] += 1;
    }
  });

  // check if any of the accumulated chars exceed the allowed occurancy
  // of 50% of the words' length.
  _.forIn(chars, function (charCount) {
    if (charCount >= allowedOccurancy) {
      valid = false;
    }
  });

  return valid;
}

/**
 * Validation against simple password rules
 * Returns false when validation fails and true for a valid password
 * @param {string} password The password string to check.
 * @param {string} email The users email address to validate agains password.
 * @param {string} [siteTitle] Optional siteTitle value, when site title is not set yet, e. g. in setup process.
 * @return {Object} example for returned validation Object:
 * invalid password: `validationResult: {isValid: false, message: 'Sorry, you cannot use an insecure password.'}`
 * valid password: `validationResult: {isValid: true}`
 */
function validatePassword(password, email, siteTitle) {
  // password cannot be longer than 256 code units, for performance
  if (password.length > 256) {
    return { isValid: false, message: tpl(messages.passwordTooLong) };
  }

  const validationResult = { isValid: true };
  const disallowedPasswords = ['password', 'ghost', 'passw0rd'];
  let siteUrl = urlUtils.urlFor('home', true);

  const badPasswords = [
    '1234567890',
    'qwertyuiop',
    'qwertzuiop',
    'asdfghjkl;',
    'abcdefghij',
    '0987654321',
    '1q2w3e4r5t',
    '12345asdfg',
  ];

  siteTitle = siteTitle ? siteTitle : settingsCache.get('title');
  siteUrl = siteUrl.replace(/^http(s?):\/\//, '');

  // password must be longer than 10 characters
  if (!validator.isLength(password, 10)) {
    return { isValid: false, message: tpl(messages.passwordTooShort, { minLength: 10 }) };
  }

  // dissallow password from badPasswords list (e. g. '1234567890')
  _.each(badPasswords, function (badPassword) {
    if (badPassword === password) {
      validationResult.isValid = false;
    }
  });

  // password must not match with users' email
  if (email && email.toLowerCase() === password.toLowerCase()) {
    validationResult.isValid = false;
  }

  // password must not contain the words 'ghost', 'password', or 'passw0rd'
  _.each(disallowedPasswords, function (disallowedPassword) {
    if (password.toLowerCase().indexOf(disallowedPassword) >= 0) {
      validationResult.isValid = false;
    }
  });

  // password must not match with site title
  if (siteTitle && siteTitle.toLowerCase() === password.toLowerCase()) {
    validationResult.isValid = false;
  }

  // password must not match with site URL (without protocol, with or without trailing slash)
  if (
    siteUrl &&
    (siteUrl.toLowerCase() === password.toLowerCase() ||
      siteUrl.toLowerCase().replace(/\/$/, '') === password.toLowerCase())
  ) {
    validationResult.isValid = false;
  }

  // dissallow passwords where 50% or more of characters are the same
  if (!characterOccurance(password)) {
    validationResult.isValid = false;
  }

  // Generic error message for the rules where no dedicated error massage is set
  if (!validationResult.isValid && !validationResult.message) {
    validationResult.message = tpl(messages.passwordDoesNotComplySecurity);
  }

  return validationResult;
}

module.exports = validatePassword;
