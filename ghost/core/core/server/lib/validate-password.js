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
function characterOccurrence(stringToTest) {
  const limit = stringToTest.length / 2;
  /** @type {Map<string, number>} */
  const counts = new Map();

  for (let i = 0; i < stringToTest.length; i++) {
    const char = stringToTest[i];
    const count = (counts.get(char) || 0) + 1;
    if (count >= limit) {
      return false;
    }
    counts.set(char, count);
  }

  return true;
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

  // password must be longer than 10 characters
  if (!validator.isLength(password, 10)) {
    return { isValid: false, message: tpl(messages.passwordTooShort, { minLength: 10 }) };
  }

  const invalidValidationResult = {
    isValid: false,
    message: tpl(messages.passwordDoesNotComplySecurity),
  };

  // password must not match with users' email
  if (email && email.toLowerCase() === password.toLowerCase()) {
    return invalidValidationResult;
  }

  // password must not match with site title
  siteTitle = siteTitle ? siteTitle : settingsCache.get('title');
  if (siteTitle && siteTitle.toLowerCase() === password.toLowerCase()) {
    return invalidValidationResult;
  }

  // password must not match with site URL (without protocol, with or without trailing slash)
  let siteUrl = urlUtils.urlFor('home', true);
  siteUrl = siteUrl.replace(/^http(s?):\/\//, '');
  if (
    siteUrl &&
    (siteUrl.toLowerCase() === password.toLowerCase() ||
      siteUrl.toLowerCase().replace(/\/$/, '') === password.toLowerCase())
  ) {
    return invalidValidationResult;
  }

  // disallow password from badPasswords list (e. g. '1234567890')
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
  if (badPasswords.includes(password)) {
    return invalidValidationResult;
  }

  // password must not contain the words 'ghost', 'password', or 'passw0rd'
  const disallowedPasswords = ['password', 'ghost', 'passw0rd'];
  for (const disallowedPassword of disallowedPasswords) {
    if (password.toLowerCase().includes(disallowedPassword)) {
      return invalidValidationResult;
    }
  }

  // dissallow passwords where 50% or more of characters are the same
  if (!characterOccurrence(password)) {
    return invalidValidationResult;
  }

  return { isValid: true };
}

module.exports = validatePassword;
