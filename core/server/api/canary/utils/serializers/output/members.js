const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:members');
const {unparse} = require('@tryghost/members-csv');


const mapMember = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const stripeSubscriptions = jsonModel && jsonModel.stripe && jsonModel.stripe.subscriptions;
    if (stripeSubscriptions) {
        let compedSubscriptions = stripeSubscriptions.filter(sub => (sub.plan.nickname === 'Complimentary'));
        const hasCompedSubscription = !!(compedSubscriptions.length);

        // NOTE: `frame.options.fields` has to be taken into account in the same way as for `stripe.subscriptions`
        //       at the moment of implementation fields were not fully supported by members endpoints
        Object.assign(jsonModel, {
            comped: hasCompedSubscription
        });
    }

    return jsonModel;
};

module.exports = {
    hasActiveStripeSubscriptions(data, apiConfig, frame) {
        frame.response = data;
    },
    browse(data, apiConfig, frame) {
        debug('browse');

        frame.response = {
            members: data.members.map(member => mapMember(member, frame)),
            meta: data.meta
        };
    },

    add(data, apiConfig, frame) {
        debug('add');

        frame.response = {
            members: [mapMember(data, frame)]
        };
    },

    edit(data, apiConfig, frame) {
        debug('edit');

        frame.response = {
            members: [mapMember(data, frame)]
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
            members: [mapMember(data, frame)]
        };
    },

    exportCSV(data, apiConfig, frame) {
        debug('exportCSV');

        const members = data.members.map((member) => {
            return mapMember(member, frame);
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
    },

    editSubscription(data, apiConfig, frame) {
        debug('editSubscription');
        frame.response = {
            members: [mapMember(data, frame)]
        };
    }
};
