const sinon = require('sinon');
const should = require('should');
const {formattedMemberResponse} = require('../../../../../core/server/services/members/utils');
const labs = require('../../../../../core/shared/labs');

describe('Members Service - utils', function () {
    describe('formattedMemberResponse', function () {
        beforeEach(function () {
            sinon.stub(labs, 'isSet').returns(true);
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns correct data', async function () {
            const member1 = formattedMemberResponse({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                expertise: null,
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                status: 'free',
                extra: 'property',
                enable_comment_notifications: true,
                email_suppression: {
                    suppressed: false,
                    info: null
                },
                unsubscribe_url: undefined,
                created_at: '2020-01-01T00:00:00.000Z'
            });
            should(member1).deepEqual({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                expertise: null,
                firstname: 'Jamie',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                unsubscribe_url: undefined,
                subscribed: true,
                subscriptions: [],
                paid: false,
                enable_comment_notifications: true,
                email_suppression: {
                    suppressed: false,
                    info: null
                },
                created_at: '2020-01-01T00:00:00.000Z'
            });
        });

        it('formats newsletter data', async function () {
            const member1 = formattedMemberResponse({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                expertise: 'Hello world',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                status: 'comped',
                extra: 'property',
                newsletters: [{
                    id: 'newsletter-1',
                    uuid: 'uuid-1',
                    name: 'Daily brief',
                    description: 'One email daily',
                    sender_name: 'Jamie',
                    sender_email: 'jamie@example.com',
                    sort_order: 0
                }],
                enable_comment_notifications: false,
                unsubscribe_url: undefined,
                created_at: '2020-01-01T00:00:00.000Z'
            });
            should(member1).deepEqual({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                expertise: 'Hello world',
                firstname: 'Jamie',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                subscriptions: [],
                paid: true,
                newsletters: [{
                    id: 'newsletter-1',
                    uuid: 'uuid-1',
                    name: 'Daily brief',
                    description: 'One email daily',
                    sort_order: 0
                }],
                enable_comment_notifications: false,
                unsubscribe_url: undefined,
                created_at: '2020-01-01T00:00:00.000Z'
            });
        });
    });
});
