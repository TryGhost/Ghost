module.exports = (event, model) => {
    const _ = require('lodash');
    const {sequence} = require('@tryghost/promise');
    const api = require('../../api').endpoints;
    const apiFramework = require('@tryghost/api-framework');

    const resourceName = event.match(/(\w+)\./)[1];
    const docName = `${resourceName}s`;

    const POST_FORMATS = ['html', 'plaintext'];
    const POST_WITH_RELATED = ['tags', 'authors'];
    const MEMBER_WITH_RELATED = [
        'labels',
        'products',
        'stripeSubscriptions',
        'newsletters'
    ];

    const ops = [];

    if (Object.keys(model.attributes).length) {
        ops.push(async () => {
            let frame = {options: {previous: false, context: {user: true}}};

            // @NOTE: below options are lost during event processing, a more holistic approach would be
            //       to pass them somehow along with the model
            if (['posts', 'pages'].includes(docName)) {
                frame.options.formats = POST_FORMATS;
                frame.options.withRelated = POST_WITH_RELATED;
                model._originalOptions = {
                    withRelated: POST_WITH_RELATED
                };
            }

            if (docName === 'members') {
                await model.load(MEMBER_WITH_RELATED);
            }

            return apiFramework
                .serializers
                .handle
                .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame)
                .then(() => {
                    const result = frame.response[docName][0];

                    // Replace full subscription data with minimal references
                    // to avoid exposing Stripe customer/payment details in webhooks
                    if (docName === 'members') {
                        const stripeSubscriptions = model.related('stripeSubscriptions');
                        result.subscriptions = stripeSubscriptions.map((sub) => {
                            return {
                                id: sub.get('subscription_id'),
                                stripe_price_id: sub.get('stripe_price_id'),
                                status: sub.get('status')
                            };
                        });
                    }

                    return result;
                });
        });
    } else {
        ops.push(() => {
            return Promise.resolve({});
        });
    }

    if (Object.keys(model._previousAttributes).length) {
        ops.push(() => {
            const frame = {options: {previous: true, context: {user: true}}};

            if (['posts', 'pages'].includes(docName)) {
                frame.options.formats = POST_FORMATS;
                frame.options.withRelated = POST_WITH_RELATED;
            }

            return apiFramework
                .serializers
                .handle
                .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame)
                .then(() => {
                    return frame.response[docName][0];
                });
        });
    } else {
        ops.push(() => {
            return Promise.resolve({});
        });
    }

    return sequence(ops)
        .then((results) => {
            const current = results[0];
            const previous = results[1];

            const changed = model._changed ? Object.keys(model._changed) : {};

            const payload = {
                [docName.replace(/s$/, '')]: {
                    current: current,
                    previous: _.pick(previous, changed)
                }
            };

            return payload;
        });
};
