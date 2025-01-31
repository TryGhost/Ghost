const security = require('@tryghost/security');
const debug = require('@tryghost/debug')('frontend');

function fixAnyNonStandardChars(path) {
    let returnString = path;
    try {
        returnString = decodeURIComponent(path)
            .split('/')
            .map (part => security.string.safe(part))
            .join('/');
    } catch (err) {
        debug('Could not decode path', path, err);
    }
    return returnString;
}

module.exports = {fixAnyNonStandardChars};