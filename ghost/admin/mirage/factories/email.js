import {Factory, trait} from 'miragejs';

export default Factory.extend({
    emailCount: 0,
    error: null,
    html: null,
    plaintext: null,
    stats: null,
    status: 'sending',
    subject: null,

    submittedAtUTC: '2019-11-06T12:44:30.000Z',
    uuid(i) { return `email-${i}`; },

    createdAtUTC: '2019-11-06T12:44:30.000Z',
    updatedAtUTC: '2019-11-06T12:44:30.000Z',

    sent: trait({
        status: 'sent',
        stats: JSON.stringify({
            delivered: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            unsubscribed: 0,
            complaints: 0
        })
    }),

    failed: trait({
        status: 'failed',
        error: 'Narp! This was an expected test failure',
        stats: null
    })
});
