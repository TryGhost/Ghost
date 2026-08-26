import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type {GiftRepository, RepositoryTransactionOptions} from './gift-bookshelf-repository';
import type {GiftDeliveryRepository} from './gift-delivery-bookshelf-repository';
import type {GiftDeliveryData} from './gift-delivery-schema';
import type {GiftCadence} from './gift-schema';
import {SendGiftDeliveryEvent} from './events/send-gift-delivery-event';
import {GIFT_DELIVERY_STALE_AFTER_MS} from './constants';

const DomainEvents = require('@tryghost/domain-events');

interface Tier {
    name: string;
    toJSON(): {
        benefits: string[];
    };
}

interface TiersService {
    api: {
        read(idString: string): Promise<Tier | null>;
    };
}

interface GiftEmailService {
    sendGiftDelivery(data: {
        recipientEmail: string;
        recipientName: string | null;
        buyerEmail: string;
        buyerName: string;
        personalMessage: string | null;
        token: string;
        tierName: string;
        benefits: string[];
        cadence: GiftCadence;
        duration: number;
        expiresAt: Date;
    }): Promise<{providerMessageId: string | null}>;
}

interface GiftDeliveryServiceDeps {
    giftRepository: Pick<GiftRepository, 'getById'>;
    giftDeliveryRepository: GiftDeliveryRepository;
    tiersService: TiersService;
    giftEmailService: GiftEmailService;
}

export interface GiftDeliveryRecoveryResult {
    sentCount: number;
    skippedCount: number;
    failedCount: number;
}

export class GiftDeliveryService {
    private readonly deps: GiftDeliveryServiceDeps;

    constructor(deps: GiftDeliveryServiceDeps) {
        this.deps = deps;
    }

    async createForCheckout({giftId, recipientEmail}: {giftId: string; recipientEmail: string}, options: RepositoryTransactionOptions = {}): Promise<string> {
        const delivery: GiftDeliveryData = {
            id: new ObjectID().toHexString(),
            giftId,
            recipientEmail,
            status: 'pending',
            startedAt: null,
            emailSentAt: null,
            emailProviderMessageId: null
        };

        await this.deps.giftDeliveryRepository.create(delivery, options);
        return delivery.id;
    }

    async dispatchForGift(giftId: string): Promise<string | null> {
        const delivery = await this.deps.giftDeliveryRepository.getByGiftId(giftId);
        if (!delivery || delivery.status !== 'pending') {
            return delivery?.recipientEmail ?? null;
        }

        DomainEvents.dispatch(SendGiftDeliveryEvent.create({deliveryId: delivery.id}));
        return delivery.recipientEmail;
    }

    async recoverPending(limit = 1000): Promise<GiftDeliveryRecoveryResult> {
        const staleBefore = new Date(Date.now() - GIFT_DELIVERY_STALE_AFTER_MS);
        const deliveries = await this.deps.giftDeliveryRepository.findRecoverableForPurchasedGifts(staleBefore, limit);
        const result: GiftDeliveryRecoveryResult = {
            sentCount: 0,
            skippedCount: 0,
            failedCount: 0
        };

        // Sequential on purpose: recovery can find many deliveries at once and each
        // send holds a mail transport call, so fanning out through events would open
        // them all concurrently
        for (const delivery of deliveries) {
            try {
                const deliveryResult = await this.send(delivery.id);
                result[`${deliveryResult}Count`] += 1;
            } catch (err) {
                result.failedCount += 1;
                logging.error({
                    event: {name: 'gift_delivery.recovery_failed'},
                    err,
                    deliveryId: delivery.id
                }, 'Failed to recover gift delivery');
            }
        }

        return result;
    }

    async cancelPendingForGift(token: string, options: RepositoryTransactionOptions = {}): Promise<boolean> {
        return this.deps.giftDeliveryRepository.cancelPendingForGift(token, options);
    }

    async send(id: string): Promise<'sent' | 'skipped' | 'failed'> {
        const now = new Date();
        const staleBefore = new Date(now.getTime() - GIFT_DELIVERY_STALE_AFTER_MS);
        const delivery = await this.deps.giftDeliveryRepository.tryStartDelivery(id, now, staleBefore);

        if (!delivery) {
            return 'skipped';
        }

        const gift = await this.deps.giftRepository.getById(delivery.giftId);
        if (!gift) {
            logging.error({
                event: {name: 'gift_delivery.gift_missing'},
                deliveryId: delivery.id,
                giftId: delivery.giftId
            }, 'Started gift delivery has no gift');
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        if (gift.status !== 'purchased') {
            await this.deps.giftDeliveryRepository.markCancelled(delivery.id);
            return 'skipped';
        }

        if (!gift.buyerEmail || !gift.buyerName) {
            logging.error({
                event: {name: 'gift_delivery.buyer_details_missing'},
                deliveryId: delivery.id,
                giftId: delivery.giftId
            }, 'Gift delivery is missing required buyer details');
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        let tier: Tier | null;
        try {
            tier = await this.deps.tiersService.api.read(gift.tierId);
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery.tier_read_failed'},
                err,
                deliveryId: delivery.id,
                giftId: delivery.giftId,
                tierId: gift.tierId
            }, 'Failed to read tier for gift delivery');
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        if (!tier) {
            logging.error({
                event: {name: 'gift_delivery.tier_missing'},
                deliveryId: delivery.id,
                giftId: delivery.giftId,
                tierId: gift.tierId
            }, 'Tier not found for gift delivery');
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        let result: {providerMessageId: string | null};
        try {
            result = await this.deps.giftEmailService.sendGiftDelivery({
                recipientEmail: delivery.recipientEmail,
                recipientName: gift.recipientName,
                buyerEmail: gift.buyerEmail,
                buyerName: gift.buyerName,
                personalMessage: gift.personalMessage,
                token: gift.token,
                tierName: tier.name,
                benefits: tier.toJSON().benefits,
                cadence: gift.cadence,
                duration: gift.duration,
                expiresAt: gift.expiresAt!
            });
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery.acceptance_failed'},
                // The bulk mailer rejects with {error, messageData}; the rendered
                // message and recipient must stay out of the logs
                err: isMailgunRejection(err) ? err.error : err,
                deliveryId: delivery.id,
                giftId: delivery.giftId
            }, 'Mail transport did not accept gift delivery');
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        const sentAt = new Date();
        let persisted: boolean;
        let cancelledDuringSend = false;
        try {
            persisted = await this.deps.giftDeliveryRepository.markSent(delivery.id, sentAt, result.providerMessageId);
        } catch (err) {
            logging.warn({
                event: {name: 'gift_delivery.acceptance_persistence.retrying'},
                err,
                deliveryId: delivery.id
            }, 'Retrying accepted gift delivery persistence');

            try {
                persisted = await this.deps.giftDeliveryRepository.markSent(delivery.id, sentAt, result.providerMessageId);
            } catch (retryErr) {
                logging.error({
                    event: {name: 'gift_delivery.acceptance_persistence.failed'},
                    err: retryErr,
                    deliveryId: delivery.id
                }, 'Failed to persist accepted gift delivery');

                try {
                    await this.deps.giftDeliveryRepository.markFailed(delivery.id);
                } catch (markFailedErr) {
                    logging.error({
                        event: {name: 'gift_delivery.acceptance_terminal_persistence.failed'},
                        err: markFailedErr,
                        deliveryId: delivery.id
                    }, 'Failed to move accepted gift delivery out of recovery');
                }
                return 'failed';
            }
        }

        if (!persisted) {
            cancelledDuringSend = await this.deps.giftDeliveryRepository.recordCancelledAcceptance(delivery.id, sentAt, result.providerMessageId);
        }

        if (persisted) {
            return 'sent';
        }

        if (cancelledDuringSend) {
            logging.info({
                event: {name: 'gift_delivery.cancelled_during_send'},
                deliveryId: delivery.id,
                giftId: delivery.giftId
            }, 'Gift delivery was cancelled while its email was in flight');
            return 'skipped';
        }

        logging.error({
            event: {name: 'gift_delivery.acceptance_persistence.failed'},
            deliveryId: delivery.id
        }, 'Failed to persist accepted gift delivery');
        return 'failed';
    }
}

function isMailgunRejection(err: unknown): err is {error: unknown; messageData: unknown} {
    return typeof err === 'object' && err !== null && 'error' in err && 'messageData' in err;
}
