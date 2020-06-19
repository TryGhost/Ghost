const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:members');
const mapper = require('./utils/mapper');
const {unparse} = require('@tryghost/members-csv');

module.exports = {
    hasActiveStripeSubscriptions(data, apiConfig, frame) {
        frame.response = data;
    },
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
            return Promise.reject(new errors.NotFoundError({
                message: i18n.t('errors.api.members.memberNotFound')
            }));
        }

        frame.response = {
            members: [mapper.mapMember(data, frame)]
        };
    },

    exportCSV(data, apiConfig, frame) {
        debug('exportCSV');

        const members = data.members.map((member) => {
            return mapper.mapMember(member, frame);
        });

        frame.response = unparse(members);
    },

    importCSV(data, apiConfig, frame) {
        debug('importCSV');
        frame.response = data;
    },

    stats(data, apiConfig, frame) {
        debug('stats');
        frame.response = data;
    }
};
