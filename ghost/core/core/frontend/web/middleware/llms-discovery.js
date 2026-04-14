const onHeaders = require('on-headers');
const settingsCache = require('../../../shared/settings-cache');

function appendHeaderValue(existingValue, newValue) {
    if (!existingValue) {
        return newValue;
    }

    const values = Array.isArray(existingValue) ? existingValue : [existingValue];

    if (values.includes(newValue)) {
        return existingValue;
    }

    return values.concat(newValue).join(', ');
}

module.exports = function llmsDiscovery(req, res, next) {
    if (settingsCache.get('is_private') || settingsCache.get('llms_enabled') === false) {
        return next();
    }

    onHeaders(res, function addLlmsDiscoveryHeaders() {
        if (settingsCache.get('is_private') || settingsCache.get('llms_enabled') === false) {
            return;
        }

        const linkHeader = appendHeaderValue(this.getHeader('Link'), '</llms.txt>; rel="llms-txt"');
        this.setHeader('Link', appendHeaderValue(linkHeader, '</llms-full.txt>; rel="llms-full-txt"'));

        if (!this.getHeader('X-Llms-Txt')) {
            this.setHeader('X-Llms-Txt', '/llms.txt');
        }
    });

    next();
};
