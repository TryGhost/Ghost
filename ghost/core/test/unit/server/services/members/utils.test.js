const sinon = require('sinon');
const should = require('should');
const {formattedMemberResponse} = require('../../../../../core/server/services/members/utils');
const labs = require('../../../../../core/shared/labs');

describe('Members Service - utils', function () {
    describe('formattedMemberResponse', function () {
        let labsStub;
        beforeEach(function () {
            labsStub = sinon.stub(labs, 'isSet').returns(true);
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns correct data', async function () {
            const member1 = formattedMemberResponse({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                status: 'free',
                extra: 'property'
            });
            should(member1).deepEqual({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                firstname: 'Jamie',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                subscriptions: [],
                paid: false
            });
        });

        it('formats newsletter data', async function () {
            const member1 = formattedMemberResponse({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                status: 'comped',
                extra: 'property',
                newsletters: [{
                    id: 'newsletter-1',
                    name: 'Daily brief',
                    description: 'One email daily',
                    sender_name: 'Jamie',
                    sender_email: 'jamie@example.com',
                    sort_order: 0
                }]
            });
            should(member1).deepEqual({
                uuid: 'uuid-1',
                email: 'jamie+1@example.com',
                name: 'Jamie Larson',
                firstname: 'Jamie',
                avatar_image: 'https://gravatar.com/avatar/7d8efd2c2a781111599a8cae293cf704?s=250&d=blank',
                subscribed: true,
                subscriptions: [],
                paid: true,
                newsletters: [{
                    id: 'newsletter-1',
                    name: 'Daily brief',
                    description: 'One email daily',
                    sort_order: 0
                }]
            });
        });
    });
});
