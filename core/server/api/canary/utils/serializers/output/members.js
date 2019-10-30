const common = require('../../../../../lib/common');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:members');
const mapper = require('./utils/mapper');

module.exports = {
    browse(data, apiConfig, frame) {
        debug('browse');

        frame.response = mapper.mapMember(data, frame);
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

        function formatCSV(data) {
            let csv = `${fields.join(',')}\r\n`,
                entry,
                field,
                j,
                i;

            for (j = 0; j < data.length; j = j + 1) {
                entry = data[j];

                for (i = 0; i < fields.length; i = i + 1) {
                    field = fields[i];
                    csv += entry[field] !== null ? entry[field] : '';
                    if (i !== fields.length - 1) {
                        csv += ',';
                    }
                }
                csv += '\r\n';
            }

            return csv;
        }

        frame.response = formatCSV(models.members);
    },

    importCSV(data, apiConfig, frame) {
        debug('importCSV');

        frame.response = data;
    }
};
