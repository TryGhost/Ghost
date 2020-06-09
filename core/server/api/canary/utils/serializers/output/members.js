const _ = require('lodash');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:members');
const mapper = require('./utils/mapper');
const papaparse = require('papaparse');

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
            return Promise.reject(new errors.NotFoundError({
                message: i18n.t('errors.api.members.memberNotFound')
            }));
        }

        frame.response = {
            members: [mapper.mapMember(data, frame)]
        };
    },

    exportCSV(models, apiConfig, frame) {
        debug('exportCSV');

        const members = models.members.map((member) => {
            member = mapper.mapMember(member, frame);
            let stripeCustomerId;

            if (member.stripe) {
                stripeCustomerId = _.get(member, 'stripe.subscriptions[0].customer.id');
            }
            let labels = [];
            if (member.labels) {
                labels = `${member.labels.map(l => l.name).join(',')}`;
            }

            return {
                id: member.id,
                email: member.email,
                name: member.name,
                note: member.note,
                subscribed_to_emails: member.subscribed,
                complimentary_plan: member.comped,
                stripe_customer_id: stripeCustomerId,
                created_at: member.created_at,
                deleted_at: member.deleted_at,
                labels: labels
            };
        });

        frame.response = papaparse.unparse(members);
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
