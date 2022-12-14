import faker from 'faker';
import moment from 'moment-timezone';
import {Factory} from 'miragejs';

const EVENT_TYPES = [
    'newsletter_event',
    'login_event',
    'subscription_event',
    'payment_event',
    'login_event',
    'signup_event',
    'email_delivered_event',
    'email_opened_event',
    'email_failed_event'
];

/* eslint-disable camelcase */
export default Factory.extend({
    type() { return faker.random.arrayElement([EVENT_TYPES]); },
    createdAt() { return moment.utc().format(); },

    afterCreate(event, server) {
        if (!event.member) {
            event.update({member: server.create('member')});
        }

        if (event.type === 'newsletter_event') {
            event.update({
                data: {
                    source: 'member',
                    subscribed: event.subscribed !== undefined ? event.subscribed : faker.datatype.boolean()
                }
            });
        }

        if (event.type === 'subscription_event') {
            event.update({
                data: {
                    source: 'stripe'
                    // TODO: add from_plan, to_plan, currency, mrr_delta
                }
            });
        }

        if (event.type === 'payment_event') {
            // TODO: add data attributes
        }

        if (event.type === 'signup_event') {
            // TODO: add data attributes
        }
    }
});
