const assert = require('node:assert/strict');
const sinon = require('sinon');

const ChargeRefundedEventService = require('../../../../../../../core/server/services/stripe/services/webhook/charge-refunded-event-service');

describe('ChargeRefundedEventService', function () {
    let giftService;

    beforeEach(function () {
        giftService = {
            refundGift: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('calls giftService.refundGift with the payment_intent from the charge', async function () {
        giftService.refundGift.resolves(true);

        const service = new ChargeRefundedEventService({giftService});
        await service.handleEvent({payment_intent: 'pi_123', invoice: null});

        sinon.assert.calledOnce(giftService.refundGift);
        sinon.assert.calledWith(giftService.refundGift, 'pi_123');
    });

    it('does not throw when no gift matches the payment intent', async function () {
        giftService.refundGift.resolves(false);

        const service = new ChargeRefundedEventService({giftService});

        await assert.doesNotReject(
            () => service.handleEvent({payment_intent: 'pi_unknown', invoice: null})
        );

        sinon.assert.calledOnce(giftService.refundGift);
    });

    it('extracts id from an expanded payment_intent object', async function () {
        giftService.refundGift.resolves(true);

        const service = new ChargeRefundedEventService({giftService});
        await service.handleEvent({payment_intent: {id: 'pi_expanded'}, invoice: null});

        sinon.assert.calledOnce(giftService.refundGift);
        sinon.assert.calledWith(giftService.refundGift, 'pi_expanded');
    });

    it('skips processing when the charge has no payment_intent', async function () {
        const service = new ChargeRefundedEventService({giftService});

        await service.handleEvent({payment_intent: null, invoice: null});

        sinon.assert.notCalled(giftService.refundGift);
    });

    it('skips processing when the charge has an invoice (subscription refund)', async function () {
        const service = new ChargeRefundedEventService({giftService});

        await service.handleEvent({payment_intent: 'pi_123', invoice: 'in_123'});

        sinon.assert.notCalled(giftService.refundGift);
    });
});
