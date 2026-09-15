import { DonationPaymentEvent } from './donation-payment-event';

type DonationRepository = {
  save(event: DonationPaymentEvent): Promise<void>;
  existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean>;
};

type BookshelfModelInstance = unknown;
type BookshelfOptions = unknown;
type BookshelfModel<T extends BookshelfModelInstance> = {
  add(data: Partial<T>, unfilteredOptions?: BookshelfOptions): Promise<T>;
  findOne(data: Partial<T>, options?: BookshelfOptions): Promise<T | null>;
};
type DonationEventModelInstance = BookshelfModelInstance & {
  name: string | null;
  email: string;
  member_id: string | null;
  amount: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  donation_message: string | null;

  attribution_id: string | null;
  attribution_url: string | null;
  attribution_type: string | null;
  referrer_source: string | null;
  referrer_medium: string | null;
  referrer_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};
type DonationPaymentEventBookshelfModel = BookshelfModel<DonationEventModelInstance>;

export class DonationBookshelfRepository implements DonationRepository {
  #Model: DonationPaymentEventBookshelfModel;

  constructor({
    DonationPaymentEventModel,
  }: {
    DonationPaymentEventModel: DonationPaymentEventBookshelfModel;
  }) {
    this.#Model = DonationPaymentEventModel;
  }

  async existsByCheckoutSessionId(checkoutSessionId: string): Promise<boolean> {
    const existing = await this.#Model.findOne(
      {
        stripe_checkout_session_id: checkoutSessionId,
      },
      { require: false },
    );

    return !!existing;
  }

  async save(event: DonationPaymentEvent) {
    await this.#Model.add({
      name: event.name,
      email: event.email,
      member_id: event.memberId,
      amount: event.amount,
      currency: event.currency,
      stripe_checkout_session_id: event.stripeCheckoutSessionId,
      donation_message: event.donationMessage,

      attribution_id: event.attributionId,
      attribution_url: event.attributionUrl,
      attribution_type: event.attributionType,
      referrer_source: event.referrerSource,
      referrer_medium: event.referrerMedium,
      referrer_url: event.referrerUrl,
      utm_source: event.utmSource,
      utm_medium: event.utmMedium,
      utm_campaign: event.utmCampaign,
      utm_term: event.utmTerm,
      utm_content: event.utmContent,
    });
  }
}
