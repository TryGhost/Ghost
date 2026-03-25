const assert = require('node:assert/strict');
const sinon = require('sinon');

const GiftService = require('../../../../../../../core/server/services/members/members-api/services/gift-service');

describe('GiftService', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createService() {
        return new GiftService({
            MemberGift: {},
            memberRepository: {},
            productRepository: {}
        });
    }

    function createGift({durationMonths, amount, redeemedAt, currency = 'usd'} = {}) {
        return {
            id: 'gift_123',
            get: sinon.stub().callsFake((key) => {
                const values = {
                    duration_months: durationMonths,
                    amount,
                    redeemed_at: redeemedAt,
                    currency
                };

                return values[key];
            })
        };
    }

    it('uses 31-day proration math for 1-month gifts', function () {
        const service = createService();
        const gift = createGift({
            durationMonths: 1,
            amount: 3100,
            redeemedAt: '2026-03-01T00:00:00.000Z'
        });

        const proration = service.getProrationForGift(gift, {
            now: new Date('2026-03-11T00:00:00.000Z')
        });

        assert.equal(proration.totalDays, 31);
        assert.equal(proration.elapsedDays, 10);
        assert.equal(proration.remainingDays, 21);
        assert.equal(proration.remainingAmount, 2100);
    });

    it('uses duration_months * 31 for multi-month gifts', function () {
        const service = createService();
        const gift = createGift({
            durationMonths: 3,
            amount: 9300,
            redeemedAt: '2026-03-01T00:00:00.000Z'
        });

        const proration = service.getProrationForGift(gift, {
            now: new Date('2026-04-10T00:00:00.000Z')
        });

        assert.equal(proration.totalDays, 93);
        assert.equal(proration.elapsedDays, 40);
        assert.equal(proration.remainingDays, 53);
        assert.equal(proration.remainingAmount, 5300);
    });

    it('clamps the remaining days and amount at zero', function () {
        const service = createService();
        const gift = createGift({
            durationMonths: 1,
            amount: 3100,
            redeemedAt: '2026-03-01T00:00:00.000Z'
        });

        const proration = service.getProrationForGift(gift, {
            now: new Date('2026-05-01T00:00:00.000Z')
        });

        assert.equal(proration.remainingDays, 0);
        assert.equal(proration.remainingAmount, 0);
    });
});
