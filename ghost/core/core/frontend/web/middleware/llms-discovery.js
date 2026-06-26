const onHeaders = require('on-headers');

function appendHeaderValue(existingValue, newValue) {
    if (!existingValue) {
        return newValue;
    }

    const raw = Array.isArray(existingValue) ? existingValue : [existingValue];
    const values = raw.flatMap(v => v.split(',').map(s => s.trim()));

    if (values.includes(newValue)) {
        return raw.join(', ');
    }

    return raw.concat(newValue).join(', ');
}

function createLlmsDiscovery({settingsCache, labs}) {
    function isDiscoveryEnabled() {
        return labs.isSet('llmsTxt') && !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
    }

    return function llmsDiscovery(req, res, next) {
        if (!isDiscoveryEnabled()) {
            return next();
        }

        onHeaders(res, function addLlmsDiscoveryHeaders() {
            if (!isDiscoveryEnabled()) {
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
}

module.exports = {createLlmsDiscovery};
