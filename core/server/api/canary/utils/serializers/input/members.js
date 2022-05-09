const _ = require('lodash');
const debug = require('@tryghost/debug')('api:canary:utils:serializers:input:members');
const mapNQLKeyValues = require('@tryghost/nql').utils.mapKeyValues;
const labsService = require('../../../../../../shared/labs');

function defaultRelations(frame) {
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['labels'];
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');
        defaultRelations(frame);

        if (!frame.options.order) {
            frame.options.autoOrder = 'created_at DESC, id DESC';
        }

        if (labsService.isSet('multipleNewsletters')) {
            frame.options.mongoTransformer = mapNQLKeyValues({
                key: {
                    from: 'subscribed',
                    to: 'newsletters.status'
                },
                values: [{
                    from: true,
                    to: 'active'
                }, {
                    from: false,
                    to: {$ne: 'active'}
                }]
            });
        }
    },

    read() {
        debug('read');

        this.browse(...arguments);
    },

    exportCSV() {
        debug('exportCSV');

        this.browse(...arguments);
    },

    add(apiConfig, frame) {
        debug('add');
        if (frame.data.members[0].labels) {
            frame.data.members[0].labels.forEach((label, index) => {
                if (_.isString(label)) {
                    frame.data.members[0].labels[index] = {
                        name: label
                    };
                }
            });
        }
        defaultRelations(frame);
    },

    edit(apiConfig, frame) {
        debug('edit');
        this.add(apiConfig, frame);
    },

    async importCSV(apiConfig, frame) {
        debug('importCSV');
        if (!frame.data.labels) {
            frame.data.labels = [];
            return;
        }
        if (typeof frame.data.labels === 'string') {
            frame.data.labels = [{name: frame.data.labels}];
            return;
        }
        if (Array.isArray(frame.data.labels)) {
            frame.data.labels = frame.data.labels.map(name => ({name}));
            return;
        }
    }
};
