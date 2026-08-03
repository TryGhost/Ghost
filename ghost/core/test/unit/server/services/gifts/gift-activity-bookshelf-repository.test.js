const assert = require('node:assert/strict');
const sinon = require('sinon');
const GiftActivityBookshelfRepository = require('../../../../../core/server/services/gifts/gift-activity-bookshelf-repository');

describe('GiftActivityBookshelfRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('maps purchase rows to stable activity facts', async function () {
        const findPage = sinon.stub().resolves({
            data: [{
                toJSON: () => ({
                    id: 'gift_1',
                    buyer_member_id: 'member_1',
                    buyer: {id: 'member_1', email: 'buyer@example.com'},
                    tier: {name: 'Gold'},
                    cadence: 'year',
                    duration: 1,
                    amount: 12000,
                    currency: 'usd',
                    purchased_at: '2026-07-30T00:00:00.000Z',
                    token: 'private-token'
                })
            }],
            meta: {pagination: {page: 1}}
        });
        const repository = new GiftActivityBookshelfRepository({
            GiftModel: {findPage}
        });

        const result = await repository.browsePurchases({
            order: 'created_at desc, id desc'
        }, {type: 'unused'});

        sinon.assert.calledOnceWithMatch(findPage, {
            withRelated: ['buyer', 'tier'],
            filter: 'buyer_member_id:-null+custom:true',
            order: 'purchased_at desc, id desc',
            useBasicCount: true
        });
        assert.deepEqual(result.data, [{
            id: 'gift_1',
            member: {id: 'member_1', email: 'buyer@example.com'},
            member_id: 'member_1',
            tier_name: 'Gold',
            cadence: 'year',
            duration: 1,
            amount: 12000,
            currency: 'usd',
            created_at: '2026-07-30T00:00:00.000Z'
        }]);
        assert.equal(result.data[0].token, undefined);
    });

    it('maps redemption rows to stable activity facts', async function () {
        const findPage = sinon.stub().resolves({
            data: [{
                toJSON: () => ({
                    id: 'gift_1',
                    redeemer_member_id: 'member_2',
                    redeemer: {id: 'member_2', email: 'recipient@example.com'},
                    tier: {name: 'Gold'},
                    cadence: 'month',
                    duration: 3,
                    amount: 3000,
                    currency: 'eur',
                    redeemed_at: '2026-08-01T00:00:00.000Z'
                })
            }],
            meta: {}
        });
        const repository = new GiftActivityBookshelfRepository({
            GiftModel: {findPage}
        });

        const result = await repository.browseRedemptions({
            order: 'created_at asc'
        }, {});

        sinon.assert.calledOnceWithMatch(findPage, {
            withRelated: ['redeemer', 'tier'],
            filter: 'redeemer_member_id:-null+custom:true',
            order: 'redeemed_at asc',
            useBasicCount: true
        });
        assert.deepEqual(result.data[0], {
            id: 'gift_1',
            member: {id: 'member_2', email: 'recipient@example.com'},
            member_id: 'member_2',
            tier_name: 'Gold',
            cadence: 'month',
            duration: 3,
            amount: 3000,
            currency: 'eur',
            created_at: '2026-08-01T00:00:00.000Z'
        });
    });
});
