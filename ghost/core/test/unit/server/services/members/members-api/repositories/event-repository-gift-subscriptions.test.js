const assert = require('node:assert/strict');
const sinon = require('sinon');
const EventRepository = require('../../../../../../../core/server/services/members/members-api/repositories/event-repository');

describe('EventRepository gift-subscription adapter', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createRepository() {
        const service = {
            browsePurchaseActivity: sinon.stub().resolves({
                data: [{id: 'gift_1', member_id: 'member_1'}],
                meta: {pagination: {page: 1}}
            }),
            browseRedemptionActivity: sinon.stub().resolves({
                data: [{id: 'gift_1', member_id: 'member_2'}],
                meta: {pagination: {page: 1}}
            })
        };
        const repository = new EventRepository({
            giftSubscriptions: {service}
        });

        return {repository, service};
    }

    it('adds the public purchase event identity to module facts', async function () {
        const {repository, service} = createRepository();
        const options = {order: 'created_at desc, id desc'};
        const filter = {type: 'unused'};

        const result = await repository.getGiftPurchaseEvents(options, filter);

        sinon.assert.calledOnceWithExactly(service.browsePurchaseActivity, options, filter);
        assert.deepEqual(result, {
            data: [{
                type: 'gift_purchase_event',
                data: {id: 'gift_1', member_id: 'member_1'}
            }],
            meta: {pagination: {page: 1}}
        });
    });

    it('adds the public redemption event identity to module facts', async function () {
        const {repository, service} = createRepository();

        const result = await repository.getGiftRedemptionEvents({}, {});

        assert.deepEqual(result.data, [{
            type: 'gift_redemption_event',
            data: {id: 'gift_1', member_id: 'member_2'}
        }]);
        sinon.assert.calledOnce(service.browseRedemptionActivity);
    });
});
