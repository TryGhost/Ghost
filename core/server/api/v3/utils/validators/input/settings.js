const Promise = require('bluebird');
const _ = require('lodash');
const {i18n} = require('../../../../../lib/common');
const {NotFoundError} = require('@tryghost/errors');

module.exports = {
    read(apiConfig, frame) {
        // @NOTE: was removed https://github.com/TryGhost/Ghost/issues/10373
        if (frame.options.key === 'ghost_head' || frame.options.key === 'ghost_foot') {
            return Promise.reject(new NotFoundError({
                message: i18n.t('errors.api.settings.problemFindingSetting', {
                    key: frame.options.key
                })
            }));
        }
    },

    edit(apiConfig, frame) {
        const errors = [];

        _.each(frame.data.settings, (setting) => {
            if (setting.key === 'ghost_head' || setting.key === 'ghost_foot') {
                // @NOTE: was removed https://github.com/TryGhost/Ghost/issues/10373
                errors.push(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: setting.key
                    })
                }));
            }
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
