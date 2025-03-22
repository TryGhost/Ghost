const security = require('@tryghost/security');
const debug = require('@tryghost/debug')('frontend');

function fixAnyNonStandardChars(pathOrUrl) {
    let path = pathOrUrl;
    let origin = '';

    try { 
        path = new URL(pathOrUrl).pathname; 
        origin = new URL(pathOrUrl).origin; 
    } catch { 
        /* no problem, just means the existing pathOrUrl is not a URL */ 
    }

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