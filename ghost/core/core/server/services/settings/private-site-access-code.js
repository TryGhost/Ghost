const crypto = require('crypto');

const ACCESS_CODE_WORDS = [
    'anchor', 'aurora', 'beacon', 'birch', 'bright', 'cedar', 'cloud', 'comet', 'copper', 'coral',
    'ember', 'fern', 'field', 'forest', 'golden', 'green', 'harbor', 'hidden', 'horizon', 'juniper',
    'lagoon', 'lunar', 'maple', 'meadow', 'midnight', 'north', 'ocean', 'olive', 'paper', 'pine',
    'quiet', 'river', 'sage', 'signal', 'silver', 'solstice', 'sparrow', 'stone', 'studio', 'summit',
    'sunrise', 'thistle', 'valley', 'violet', 'willow', 'window', 'winter', 'wild'
];

/**
 * Generates a short trial private-site access code in the `word###` format.
 *
 * @returns {string}
 */
function generatePrivateSiteAccessCode() {
    const word = ACCESS_CODE_WORDS[crypto.randomInt(ACCESS_CODE_WORDS.length)];
    const number = crypto.randomInt(1000).toString().padStart(3, '0');
    return `${word}${number}`;
}

module.exports = {ACCESS_CODE_WORDS, generatePrivateSiteAccessCode};
