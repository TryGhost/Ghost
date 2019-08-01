const Promise = require('bluebird');
const common = require('../../../../../lib/common');

module.exports = {
    read(apiConfig, frame) {
        if (!frame.data.url || !frame.data.url.trim()) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.oembed.noUrlProvided')
            }));
        }
    }
};
