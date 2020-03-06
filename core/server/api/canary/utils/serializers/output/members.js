const _ = require('lodash');
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

        const fields = [
            'id',
            'email',
            'name',
            'note',
            'subscribed_to_emails',
            'complimentary_plan',
            'stripe_customer_id',
            'created_at',
            'deleted_at',
            'labels'
        ];

        const members = models.members.map((member) => {
            member = mapper.mapMember(member, frame);
            let stripeCustomerId;

            if (member.stripe) {
                stripeCustomerId = _.get(member, 'stripe.subscriptions[0].customer.id');
            }
            let labels = [];
            if (member.labels) {
                labels = `"${member.labels.map(l => l.name).join(',')}"`;
            }

            return {
                id: member.id,
                email: member.email,
                name: member.name,
                note: member.note,
                subscribed_to_emails: member.subscribed,
                complimentary_plan: member.comped,
                stripe_customer_id: stripeCustomerId,
                created_at: JSON.stringify(member.created_at),
                deleted_at: JSON.stringify(member.deleted_at),
                labels: labels
            };
        });

        frame.response = formatCSV(members, fields);
    },

    importCSV(data, apiConfig, frame) {
        debug('importCSV');

        frame.response = data;
    }
};
