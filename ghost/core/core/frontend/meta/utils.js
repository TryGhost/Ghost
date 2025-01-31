const security = require('@tryghost/security');
const debug = require('@tryghost/debug')('frontend');

function fixAnyNonStandardChars(pathOrUrl) {
    let path = pathOrUrl;
    try { path = new URL(pathOrUrl).pathname; } catch {}
    let origin = '';
    try { origin = new URL(pathOrUrl).origin; } catch {}

    let returnString = pathOrUrl;

    try {
        returnString = origin + decodeURIComponent(path)
            .split('/')
            .map (part => security.string.safe(part))
            .join('/');
    } catch (err) {
        debug('Could not decode path', path, err);
    }
    return returnString;
}

module.exports = {fixAnyNonStandardChars};