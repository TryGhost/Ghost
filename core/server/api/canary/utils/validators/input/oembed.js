const Promise = require('bluebird');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');

module.exports = {
    read(apiConfig, frame) {
        if (!frame.data.url || !frame.data.url.trim()) {
            return Promise.reject(new errors.BadRequestError({
                message: i18n.t('errors.api.oembed.noUrlProvided')
            }));
        }
    }
};
