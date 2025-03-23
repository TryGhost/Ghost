import {DonationPaymentEvent} from './DonationPaymentEvent';
import {DonationRepository} from './DonationRepository';

type BookshelfModelInstance = unknown;
type BookshelfOptions = unknown;
type BookshelfModel<T extends BookshelfModelInstance> = {
    add(data: Partial<T>, unfilteredOptions?: BookshelfOptions): Promise<T>;
};
type DonationEventModelInstance = BookshelfModelInstance & {
    name: string | null;
    email: string;
    member_id: string | null;
    amount: number;
    currency: string;
    donation_message: string | null;

    attribution_id: string | null;
    attribution_url: string | null;
    attribution_type: string | null;
    referrer_source: string | null;
    referrer_medium: string | null;
    referrer_url: string | null;
}
type DonationPaymentEventBookshelfModel = BookshelfModel<DonationEventModelInstance>;

export class DonationBookshelfRepository implements DonationRepository {
    #Model: DonationPaymentEventBookshelfModel;

    constructor({DonationPaymentEventModel}: {DonationPaymentEventModel: DonationPaymentEventBookshelfModel}) {
        this.#Model = DonationPaymentEventModel;
    }

    async save(event: DonationPaymentEvent) {
        await this.#Model.add({
            name: event.name,
            email: event.email,
            member_id: event.memberId,
            amount: event.amount,
            currency: event.currency,
            donation_message: event.donationMessage,

            attribution_id: event.attributionId,
            attribution_url: event.attributionUrl,
            attribution_type: event.attributionType,
            referrer_source: event.referrerSource,
            referrer_medium: event.referrerMedium,
            referrer_url: event.referrerUrl
        });
    }
}
