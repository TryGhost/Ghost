const common = require('../../../../../lib/common');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:subscribers');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            subscribers: models.data.map(model => model.toJSON(frame.options)),
            meta: models.meta
        };
    },

    read(models, apiConfig, frame) {
        debug('read');

        if (!models) {
            return Promise.reject(new common.errors.NotFoundError({
                message: common.i18n.t('errors.api.subscribers.subscriberNotFound')
            }));
        }

        frame.response = {
            subscribers: [models.toJSON(frame.options)]
        };
    },

    add(models, apiConfig, frame) {
        debug('add');

        frame.response = {
            subscribers: [models.toJSON(frame.options)]
        };
    },

    edit(models, apiConfig, frame) {
        debug('edit');

        frame.response = {
            subscribers: [models.toJSON(frame.options)]
        };
    },

    destroy(models, apiConfig, frame) {
        frame.response = models;
    },

    exportCSV(models, apiConfig, frame) {
        debug('exportCSV');

        function formatCSV(data) {
            let fields = ['id', 'email', 'created_at', 'deleted_at'],
                csv = `${fields.join(',')}\r\n`,
                subscriber,
                field,
                j,
                i;

            for (j = 0; j < data.length; j = j + 1) {
                subscriber = data[j];

                for (i = 0; i < fields.length; i = i + 1) {
                    field = fields[i];
                    csv += subscriber[field] !== null ? subscriber[field] : '';
                    if (i !== fields.length - 1) {
                        csv += ',';
                    }
                }
                csv += '\r\n';
            }

            return csv;
        }

        frame.response = formatCSV(models.toJSON(frame.options), frame.options);
    },

    importCSV(models, apiConfig, frame) {
        debug('importCSV');

        frame.response = models;
    }
};
