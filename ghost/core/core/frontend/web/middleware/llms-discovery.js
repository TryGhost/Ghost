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

function createLlmsDiscovery({settingsCache}) {
    return function llmsDiscovery(req, res, next) {
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
}

module.exports = {createLlmsDiscovery};
