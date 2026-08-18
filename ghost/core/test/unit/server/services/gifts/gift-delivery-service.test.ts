import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {Knex} from 'knex';
import {GiftDeliveryService} from '../../../../../core/server/services/gifts/gift-delivery-service';
import type {GiftDeliveryRepository} from '../../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';
import {buildGift, buildGiftDelivery} from './utils';

const DomainEvents = require('@tryghost/domain-events');
const transacting = 'trx' as unknown as Knex.Transaction;

describe('GiftDeliveryService', function () {
    type GiftDeliveryRepositoryStub = {
        [K in keyof GiftDeliveryRepository]: sinon.SinonStub;
    };

    let giftRepository: {
        getById: sinon.SinonStub;
    };
    let giftDeliveryRepository: GiftDeliveryRepositoryStub;
    let giftEmailService: {
        sendGiftDelivery: sinon.SinonStub;
    };
    let dispatchDelivery: sinon.SinonStub;
    let tiersService: {
        api: {
            read: sinon.SinonStub;
        };
    };

    beforeEach(function () {
        giftRepository = {
            getById: sinon.stub().resolves(buildGift({
                recipientName: 'Recipient',
                buyerName: 'Buyer',
                personalMessage: 'Enjoy this gift'
            }))
        };
        giftDeliveryRepository = {
            getById: sinon.stub().resolves(null),
            getByGiftId: sinon.stub().resolves(null),
            findRecoverableForPurchasedGifts: sinon.stub().resolves([]),
            tryStartDelivery: sinon.stub().resolves(buildGiftDelivery({status: 'sending'})),
            markSent: sinon.stub().resolves(true),
            markFailed: sinon.stub().resolves(true),
            markCancelled: sinon.stub().resolves(true),
            cancelPendingForGift: sinon.stub().resolves(false),
            create: sinon.stub().resolves(undefined),
            transaction: sinon.stub()
        };
        giftEmailService = {
            sendGiftDelivery: sinon.stub().resolves({providerMessageId: 'provider-123'})
        };
        dispatchDelivery = sinon.stub(DomainEvents, 'dispatch');
        tiersService = {
            api: {
                read: sinon.stub().resolves({
                    name: 'Bronze',
                    toJSON: () => ({benefits: ['Benefit 1', 'Benefit 2']})
                })
            }
        };
    });

    function createService() {
        return new GiftDeliveryService({
            giftRepository,
            giftDeliveryRepository,
            tiersService,
            giftEmailService
        });
    }

    afterEach(function () {
        sinon.restore();
    });

    it('re-dispatches pending deliveries for purchased gifts at boot', async function () {
        giftDeliveryRepository.findRecoverableForPurchasedGifts.resolves([
            buildGiftDelivery({id: 'delivery_1'}),
            buildGiftDelivery({id: 'delivery_2'})
        ]);
        const service = createService();

        assert.equal(await service.recoverPending(), 2);
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.findRecoverableForPurchasedGifts, sinon.match.date, 1000);
        assert.deepEqual(dispatchDelivery.firstCall.firstArg.data, {deliveryId: 'delivery_1'});
        assert.deepEqual(dispatchDelivery.secondCall.firstArg.data, {deliveryId: 'delivery_2'});
    });

    it('cancels a pending delivery within the gift lifecycle transaction', async function () {
        giftDeliveryRepository.cancelPendingForGift.resolves(true);
        const service = createService();

        assert.equal(await service.cancelPendingForGift('gift-token', {transacting}), true);
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.cancelPendingForGift, 'gift-token', {transacting});
    });

    it('claims, sends, and records mail transport acceptance', async function () {
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'sent');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.tryStartDelivery, 'delivery_1', sinon.match.date, sinon.match.date);
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markSent, 'delivery_1', sinon.match.date, 'provider-123');
        sinon.assert.calledOnceWithExactly(giftEmailService.sendGiftDelivery, sinon.match({
            buyerEmail: 'buyer@example.com',
            buyerName: 'Buyer'
        }));
    });

    it('records transactional transport acceptance without a provider message ID', async function () {
        giftEmailService.sendGiftDelivery.resolves({providerMessageId: null});
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'sent');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markSent, 'delivery_1', sinon.match.date, null);
    });

    it('leaves an accepted handoff in sending when the durable sent fact cannot be persisted', async function () {
        giftDeliveryRepository.markSent.resolves(false);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.notCalled(giftDeliveryRepository.markFailed);
    });

    it('does not retry an accepted handoff when persistence fails with a recoverable-looking code', async function () {
        giftDeliveryRepository.markSent.rejects({code: 'ECONNREFUSED'});
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.notCalled(giftDeliveryRepository.markFailed);
    });

    it('does not send when another worker or lifecycle transition starts the delivery first', async function () {
        giftDeliveryRepository.tryStartDelivery.resolves(null);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'skipped');
        sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
    });

    it('fails a started delivery whose gift is missing', async function () {
        giftRepository.getById.resolves(null);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
        sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
    });

    it('fails a started email delivery without required buyer details', async function () {
        giftRepository.getById.resolves(buildGift({
            buyerEmail: null,
            buyerName: null
        }));
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
        sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
    });

    it('cancels a started delivery when its gift is no longer purchased', async function () {
        giftRepository.getById.resolves(buildGift({
            status: 'refunded',
            refundedAt: new Date()
        }));
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'skipped');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markCancelled, 'delivery_1');
        sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
    });

    it('fails a delivery when the mail transport does not accept it', async function () {
        giftEmailService.sendGiftDelivery.rejects({err: {responseCode: 421}});
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
    });
});
