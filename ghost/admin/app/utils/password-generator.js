/*
 * copied from https://github.com/bermi/password-generator
 * Copyright(c) 2011-2015 Bermi Ferrer <bermi@bermilabs.com>
 * MIT Licensed
 */

// copied from the NPM module because the switch away from polyfilling `global`
// via webpack in ember-auto-import resulted in an error finding 'crypto'
// Module not found: Error: Can't resolve 'crypto'

const vowel = /[aeiou]$/i;
const consonant = /[bcdfghjklmnpqrstvwxyz]$/i;

function rand(min, max) {
    var key, value, arr = new Uint8Array(max);
    getRandomValues(arr);
    for (key in arr) {
        if (Object.prototype.hasOwnProperty.call(arr, key)) {
            value = arr[key];
            if (value > min && value < max) {
                return value;
            }
        }
    }
    return rand(min, max);
}

function getRandomValues(buf) {
    window.crypto.getRandomValues(buf);
}

export default function generatePassword(length, memorable, pattern, prefix) {
    var char = '', n, i, validChars = [];
    if (length === null || typeof (length) === 'undefined') {
        length = 10;
    }
    if (memorable === null || typeof (memorable) === 'undefined') {
        memorable = true;
    }
    if (pattern === null || typeof (pattern) === 'undefined') {
        pattern = /\w/;
    }
    if (prefix === null || typeof (prefix) === 'undefined') {
        prefix = '';
    }

    // Non memorable passwords will pick characters from a pre-generated
    // list of characters
    if (!memorable) {
        for (i = 33; 126 > i; i += 1) {
            char = String.fromCharCode(i);
            if (char.match(pattern)) {
                validChars.push(char);
            }
        }

        if (!validChars.length) {
            throw new Error('Could not find characters that match the ' +
                'password pattern ' + pattern + '. Patterns must match individual ' +
                'characters, not the password as a whole.');
        }
    }

    while (prefix.length < length) {
        if (memorable) {
            if (prefix.match(consonant)) {
                pattern = vowel;
            } else {
                pattern = consonant;
            }
            n = rand(33, 126);
            char = String.fromCharCode(n);
        } else {
            char = validChars[rand(0, validChars.length)];
        }

        if (memorable) {
            char = char.toLowerCase();
        }
        if (char.match(pattern)) {
            prefix = '' + prefix + char;
        }
    }

    return prefix;
}
