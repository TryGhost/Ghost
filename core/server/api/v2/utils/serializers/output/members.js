const common = require('../../../../../lib/common');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:members');

module.exports = {
    browse(data, apiConfig, frame) {
        debug('browse');

        frame.response = data;
    },

    read(data, apiConfig, frame) {
        debug('read');

        if (!data) {
            return Promise.reject(new common.errors.NotFoundError({
                message: common.i18n.t('errors.api.members.memberNotFound')
            }));
        }

        frame.response = {
            members: [data]
        };
    }
};
