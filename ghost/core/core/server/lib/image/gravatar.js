const crypto = require('crypto');
const tpl = require('@tryghost/tpl');

class Gravatar {
    constructor({config, request}) {
        this.config = config;
        this.request = request;
    }

    url(email, options) {
        if (options.default) {
            // tpl errors on token `{default}` so we use `{_default}` instead
            // but still allow the option to be passed as `default`
            options._default = options.default;
        }
        const defaultOptions = {
            size: 250,
            _default: 'blank',
            rating: 'g'
        };
        const emailHash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
        const gravatarUrl = this.config.get('gravatar').url;
        return tpl(gravatarUrl, Object.assign(defaultOptions, options, {hash: emailHash}));
    }

    async lookup(userData, timeout) {
        if (this.config.isPrivacyDisabled('useGravatar')) {
            return Promise.resolve();
        }

        // test existence using a default 404, but return a different default
        // so we still have a fallback if the image gets removed from Gravatar
        const testUrl = this.url(userData.email, {default: 404, rating: 'x'});
        const imageUrl = this.url(userData.email, {default: 'mp', rating: 'x'});

        try {
            await this.request(testUrl, {timeout: {request: timeout || 2 * 1000}});
            return {
                image: imageUrl
            };
        } catch (err) {
            if (err.statusCode === 404) {
                return {
                    image: undefined
                };
            }

            // ignore error, just resolve with no image url
        }
    }
}

module.exports = Gravatar;
