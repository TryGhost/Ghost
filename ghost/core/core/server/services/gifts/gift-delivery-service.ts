import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type {GiftRepository, RepositoryTransactionOptions} from './gift-bookshelf-repository';
import type {GiftDeliveryOutcomeRecordResult, GiftDeliveryRepository} from './gift-delivery-bookshelf-repository';
import type {GiftDeliveryData} from './gift-delivery-schema';
import type {GiftCadence} from './gift-schema';
import {SendGiftDeliveryEvent} from './events/send-gift-delivery-event';

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
        buyerName: string | null;
        personalMessage: string | null;
        token: string;
        tierName: string;
        benefits: string[];
        cadence: GiftCadence;
        duration: number;
        expiresAt: Date;
    }): Promise<{providerMessageId: string | null}>;
    sendDeliveryFailureNotification(data: {
        buyerEmail: string;
        recipientEmail: string;
        token: string;
        expiresAt: Date;
    }): Promise<void>;
}

interface GiftDeliveryServiceDeps {
    giftRepository: Pick<GiftRepository, 'getById'>;
    giftDeliveryRepository: GiftDeliveryRepository;
    tiersService: TiersService;
    giftEmailService: GiftEmailService;
    giftEmailAnalytics: {
        schedule(): Promise<void>;
    };
}

export class GiftDeliveryService {
    private readonly deps: GiftDeliveryServiceDeps;

    constructor(deps: GiftDeliveryServiceDeps) {
        this.deps = deps;
    }

    async createForPurchase({giftId, recipientEmail}: {giftId: string; recipientEmail: string}, options: RepositoryTransactionOptions = {}): Promise<void> {
        const delivery: GiftDeliveryData = {
            id: new ObjectID().toHexString(),
            giftId,
            recipientEmail,
            status: 'pending',
            startedAt: null,
            emailSentAt: null,
            emailProviderMessageId: null,
            outcome: 'unknown',
            outcomeAt: null,
            outcomeError: null
        };

        await this.deps.giftDeliveryRepository.create(delivery, options);

        const dispatch = () => DomainEvents.dispatch(SendGiftDeliveryEvent.create({deliveryId: delivery.id}));
        if (options.transacting) {
            options.transacting.executionPromise.then(dispatch, () => {});
        } else {
            dispatch();
        }
    }

    async cancelPendingForGift(token: string, options: RepositoryTransactionOptions = {}): Promise<boolean> {
        return this.deps.giftDeliveryRepository.cancelPendingForGift(token, options);
    }

    async send(id: string): Promise<'sent' | 'skipped' | 'failed'> {
        const delivery = await this.deps.giftDeliveryRepository.tryStartDelivery(id, new Date());

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

        let tier: Tier | null;
        try {
            tier = await this.deps.tiersService.api.read(gift.tierId);
        } catch (err) {
            logging.error(err);
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        if (!tier) {
            logging.error(`Tier not found for gift delivery: ${gift.tierId}`);
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        let result: {providerMessageId: string | null};
        try {
            result = await this.deps.giftEmailService.sendGiftDelivery({
                recipientEmail: delivery.recipientEmail,
                recipientName: gift.recipientName,
                buyerName: gift.buyerName,
                personalMessage: gift.personalMessage,
                token: gift.token,
                tierName: tier.name,
                benefits: tier.toJSON().benefits,
                cadence: gift.cadence,
                duration: gift.duration,
                expiresAt: gift.expiresAt
            });
        } catch (err) {
            logging.error(err);
            await this.deps.giftDeliveryRepository.markFailed(delivery.id);
            return 'failed';
        }

        let persisted: boolean;
        try {
            persisted = await this.deps.giftDeliveryRepository.markSent(
                delivery.id,
                new Date(),
                result.providerMessageId
            );
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery.acceptance_persistence.failed'},
                err,
                deliveryId: delivery.id
            }, 'Failed to persist accepted gift delivery');
            return 'failed';
        }

        if (!persisted) {
            logging.error({
                event: {name: 'gift_delivery.acceptance_persistence.failed'},
                deliveryId: delivery.id
            }, 'Failed to persist accepted gift delivery');
            return 'failed';
        }

        if (result.providerMessageId) {
            try {
                await this.deps.giftEmailAnalytics.schedule();
            } catch (err) {
                logging.error('Failed to schedule gift delivery analytics', err);
            }
        }

        return 'sent';
    }

    async recordOutcome(data: {providerMessageId: string; outcome: 'delivered' | 'temporary_failed' | 'permanent_failed'; timestamp: Date; error: string | null}): Promise<GiftDeliveryOutcomeRecordResult> {
        const result = await this.deps.giftDeliveryRepository.recordOutcome(data);

        if (result === 'recorded' && data.outcome === 'permanent_failed') {
            await this.notifyBuyerOfDeliveryFailure(data.providerMessageId);
        }

        return result;
    }

    private async notifyBuyerOfDeliveryFailure(providerMessageId: string): Promise<void> {
        try {
            const delivery = await this.deps.giftDeliveryRepository.getByProviderMessageId(providerMessageId);
            if (!delivery) {
                return;
            }

            const gift = await this.deps.giftRepository.getById(delivery.giftId);
            if (!gift || gift.status !== 'purchased' || gift.expiresAt.getTime() <= Date.now()) {
                return;
            }

            await this.deps.giftEmailService.sendDeliveryFailureNotification({
                buyerEmail: gift.buyerEmail,
                recipientEmail: delivery.recipientEmail,
                token: gift.token,
                expiresAt: gift.expiresAt
            });

            logging.info({
                event: {name: 'gift_delivery.failure_notification.sent'},
                giftId: delivery.giftId,
                deliveryId: delivery.id
            }, 'Sent gift delivery failure notification to buyer');
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery.failure_notification.failed'},
                err,
                providerMessageId
            }, 'Failed to send gift delivery failure notification to buyer');
        }
    }
}
