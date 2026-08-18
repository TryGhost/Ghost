import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
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
            recordCancelledAcceptance: sinon.stub().resolves(false),
            markFailed: sinon.stub().resolves(true),
            markCancelled: sinon.stub().resolves(true),
            cancelPendingForGift: sinon.stub().resolves(false),
            create: sinon.stub().resolves(undefined)
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

    it('dispatches an immediate send for a pending delivery after purchase', async function () {
        giftDeliveryRepository.getByGiftId.resolves(buildGiftDelivery({id: 'delivery_1', recipientEmail: 'recipient@example.com'}));
        const service = createService();

        assert.equal(await service.dispatchForGift('gift_1'), 'recipient@example.com');
        assert.deepEqual(dispatchDelivery.firstCall.firstArg.data, {deliveryId: 'delivery_1'});
    });

    it('recovers pending deliveries for purchased gifts one at a time', async function () {
        giftDeliveryRepository.findRecoverableForPurchasedGifts.resolves([
            buildGiftDelivery({id: 'delivery_1'}),
            buildGiftDelivery({id: 'delivery_2'})
        ]);
        giftDeliveryRepository.tryStartDelivery
            .withArgs('delivery_1').resolves(buildGiftDelivery({id: 'delivery_1', status: 'sending'}))
            .withArgs('delivery_2').resolves(buildGiftDelivery({id: 'delivery_2', status: 'sending'}));
        let inFlight = 0;
        let maxInFlight = 0;
        giftEmailService.sendGiftDelivery.callsFake(async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise<void>((resolve) => {
                setImmediate(resolve);
            });
            inFlight -= 1;
            return {providerMessageId: 'provider-123'};
        });
        const service = createService();

        assert.equal(await service.recoverPending(), 2);
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.findRecoverableForPurchasedGifts, sinon.match.date, 1000);
        sinon.assert.notCalled(dispatchDelivery);
        sinon.assert.calledTwice(giftEmailService.sendGiftDelivery);
        assert.equal(maxInFlight, 1);
        sinon.assert.calledWith(giftDeliveryRepository.markSent, 'delivery_1');
        sinon.assert.calledWith(giftDeliveryRepository.markSent, 'delivery_2');
    });

    it('keeps recovering remaining deliveries when one send throws', async function () {
        const errorLog = sinon.stub(logging, 'error');
        giftDeliveryRepository.findRecoverableForPurchasedGifts.resolves([
            buildGiftDelivery({id: 'delivery_1'}),
            buildGiftDelivery({id: 'delivery_2'})
        ]);
        giftDeliveryRepository.tryStartDelivery
            .withArgs('delivery_1').rejects(new Error('db down'))
            .withArgs('delivery_2').resolves(buildGiftDelivery({id: 'delivery_2', status: 'sending'}));
        const service = createService();

        assert.equal(await service.recoverPending(), 2);
        sinon.assert.calledOnce(giftEmailService.sendGiftDelivery);
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.recovery_failed'},
            deliveryId: 'delivery_1'
        }), sinon.match.string);
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
        const errorLog = sinon.stub(logging, 'error');
        giftDeliveryRepository.markSent.resolves(false);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.notCalled(giftDeliveryRepository.markFailed);
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.acceptance_persistence.failed'},
            deliveryId: 'delivery_1'
        }), sinon.match.string);
    });

    it('records acceptance details on a delivery cancelled while its email was in flight', async function () {
        const infoLog = sinon.stub(logging, 'info');
        const errorLog = sinon.stub(logging, 'error');
        giftDeliveryRepository.markSent.resolves(false);
        giftDeliveryRepository.recordCancelledAcceptance.resolves(true);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'skipped');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.recordCancelledAcceptance, 'delivery_1', sinon.match.date, 'provider-123');
        sinon.assert.notCalled(giftDeliveryRepository.markFailed);
        sinon.assert.notCalled(errorLog);
        sinon.assert.calledOnceWithExactly(infoLog, sinon.match({
            event: {name: 'gift_delivery.cancelled_during_send'},
            deliveryId: 'delivery_1'
        }), sinon.match.string);
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
        const errorLog = sinon.stub(logging, 'error');
        const transportError = new Error('421 Try again later');
        giftEmailService.sendGiftDelivery.rejects(transportError);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.acceptance_failed'},
            err: transportError,
            deliveryId: 'delivery_1'
        }), sinon.match.string);
    });

    it('logs only the underlying error when the bulk mailer rejects with the rendered message', async function () {
        const errorLog = sinon.stub(logging, 'error');
        const transportError = new Error('Mailgun unavailable');
        giftEmailService.sendGiftDelivery.rejects({error: transportError, messageData: {html: '<p>secret link</p>'}});
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.acceptance_failed'},
            err: transportError
        }), sinon.match.string);
        assert.equal(JSON.stringify(errorLog.firstCall.args).includes('secret link'), false);
    });

    it('fails a delivery with a structured log when its tier cannot be read', async function () {
        const errorLog = sinon.stub(logging, 'error');
        tiersService.api.read.rejects(new Error('tiers unavailable'));
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.tier_read_failed'},
            deliveryId: 'delivery_1'
        }), sinon.match.string);
    });

    it('fails a delivery with a structured log when its tier is missing', async function () {
        const errorLog = sinon.stub(logging, 'error');
        tiersService.api.read.resolves(null);
        const service = createService();

        const result = await service.send('delivery_1');

        assert.equal(result, 'failed');
        sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
        sinon.assert.calledOnceWithExactly(errorLog, sinon.match({
            event: {name: 'gift_delivery.tier_missing'},
            deliveryId: 'delivery_1'
        }), sinon.match.string);
    });
});
