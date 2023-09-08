import {DonationPaymentEvent} from './DonationPaymentEvent';

export type DonationRepository = {
    save(event: DonationPaymentEvent): Promise<void>;
}
