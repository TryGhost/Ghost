const common = require('../lib/common');
const {extract, hasProvider} = require('oembed-parser');
const Promise = require('bluebird');

let oembed = {
    read(options) {
        let {url} = options;

        if (!url || !url.trim()) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.oembed.noUrlProvided')
            }));
        }

        // build up a list of URL variations to test against because the oembed
        // providers list is not always up to date with scheme or www vs non-www
        let base = url.replace(/^\/\/|^https?:\/\/(?:www\.)?/, '');
        let testUrls = [
            `http://${base}`,
            `https://${base}`,
            `http://www.${base}`,
            `https://www.${base}`
        ];
        let provider;
        for (let testUrl of testUrls) {
            provider = hasProvider(testUrl);
            if (provider) {
                url = testUrl;
                break;
            }
        }

        if (!provider) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.oembed.unknownProvider')
            }));
        }

        return extract(url).catch((err) => {
            return Promise.reject(new common.errors.InternalServerError({
                message: err.message
            }));
        });
    }
};

module.exports = oembed;
