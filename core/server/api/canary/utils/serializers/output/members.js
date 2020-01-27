const common = require('../../../../../lib/common');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:members');
const mapper = require('./utils/mapper');
const {formatCSV} = require('../../../../../lib/fs');

module.exports = {
    browse(data, apiConfig, frame) {
        debug('browse');

        frame.response = {
            members: data.members.map(member => mapper.mapMember(member, frame)),
            meta: data.meta
        };
    },

    add(data, apiConfig, frame) {
        debug('add');

        frame.response = {
            members: [mapper.mapMember(data, frame)]
        };
    },

    edit(data, apiConfig, frame) {
        debug('edit');

        frame.response = {
            members: [mapper.mapMember(data, frame)]
        };
    },

    read(data, apiConfig, frame) {
        debug('read');

        if (!data) {
            return Promise.reject(new common.errors.NotFoundError({
                message: common.i18n.t('errors.api.members.memberNotFound')
            }));
        }

        frame.response = {
            members: [mapper.mapMember(data, frame)]
        };
    },

    exportCSV(models, apiConfig, frame) {
        debug('exportCSV');

        const fields = ['id', 'email', 'name', 'note', 'created_at', 'deleted_at'];

        frame.response = formatCSV(models.members, fields);
    },

    importCSV(data, apiConfig, frame) {
        debug('importCSV');

        frame.response = data;
    }
};
