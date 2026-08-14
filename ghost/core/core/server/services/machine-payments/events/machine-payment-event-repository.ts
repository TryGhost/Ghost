import errors from '@tryghost/errors';
import {MachinePaymentEvent, type MachinePaymentEventData} from './machine-payment-event';

type BookshelfModelInstance = unknown;
type BookshelfOptions = unknown;
type BookshelfModel = {
    add: (data: Record<string, unknown>, unfilteredOptions?: BookshelfOptions) => Promise<BookshelfModelInstance>;
    findOne: (data: Record<string, unknown>) => Promise<BookshelfModelInstance | null | undefined>;
};

type UniqueConstraintError = {
    code?: string;
};

const isUniqueConstraintError = (err: unknown): boolean => {
    const code = (err as UniqueConstraintError)?.code;
    return code === 'ER_DUP_ENTRY' || Boolean(code?.startsWith?.('SQLITE_CONSTRAINT'));
};

export class MachinePaymentEventRepository {
    #Model: BookshelfModel;

    constructor({MachinePaymentEventModel}: {MachinePaymentEventModel: BookshelfModel}) {
        this.#Model = MachinePaymentEventModel;
    }

    /**
     * @returns Promise resolving to the event and whether it was newly created
     */
    async save(data: MachinePaymentEventData): Promise<{event: BookshelfModelInstance; created: boolean}> {
        const event = MachinePaymentEvent.create(data);

        const existing = await this.#findByProtocolReference(event.protocol, event.reference);
        if (existing) {
            return {event: existing, created: false};
        }

        try {
            const created = await this.#Model.add({
                post_id: event.postId,
                amount: event.amount,
                currency: event.currency,
                protocol: event.protocol,
                method: event.method,
                stripe_payment_intent_id: event.stripePaymentIntentId,
                reference: event.reference,
                created_at: event.timestamp
            }, {context: {internal: true}});
            return {event: created, created: true};
        } catch (err) {
            if (!isUniqueConstraintError(err)) {
                throw err;
            }

            const raced = await this.#findByProtocolReference(event.protocol, event.reference);
            if (raced) {
                return {event: raced, created: false};
            }

            throw new errors.InternalServerError({
                err: err instanceof Error ? err : undefined,
                message: 'Failed to persist machine payment event after unique constraint conflict'
            });
        }
    }

    async #findByProtocolReference(protocol: string, reference: string) {
        return await this.#Model.findOne({protocol, reference});
    }
}
