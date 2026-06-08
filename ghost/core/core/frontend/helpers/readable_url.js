// # Readable URL helper
// Usage: `{{readable_url "https://google.com"}}`
//
// Returns a human readable URL for the given URL, e.g. google.com for https://www.google.com?query=1#section

const logging = require('@tryghost/logging');
const sentry = require('../../shared/sentry');
const errors = require('@tryghost/errors');
const {SafeString} = require('../services/handlebars');

function captureError(message) {
    const error = new errors.IncorrectUsageError({message});
    sentry.captureException(error);
    logging.error(error);
}

module.exports = function readableUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') {
        captureError(`Expected a string, received ${inputUrl}.`);
        return new SafeString('');
    }

    try {
        const url = new URL(inputUrl);
        const readable = url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/$/, '');

        return new SafeString(readable);
    } catch (e) {
        captureError(`The string "${inputUrl}" could not be parsed as URL.`);
        return new SafeString(inputUrl);
    }
};
