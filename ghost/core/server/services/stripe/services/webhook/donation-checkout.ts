import errors from '@tryghost/errors';
import { DonationPaymentEvent } from '../../../donations/donation-payment-event';
import type { StripeTracking, WebhookOutcome } from '../../tracking';
import { FAILURE_CODES } from '../../webhook/failures';
import type { DonationCheckout } from '../../webhook/webhook-event';

/** A member, whose name and email a donation they make is recorded under. */
interface Member {
  id: string;
  get(attribute: 'name'): string | null;
  get(attribute: 'email'): string;
}

export interface DonationCheckoutDeps {
  memberRepository: { get(filter: { customer_id: string }): Promise<Member | null> };
  donationRepository: { save(donation: DonationPaymentEvent): Promise<void> };
  staffServiceEmails: {
    notifyDonationReceived(data: { donationPaymentEvent: DonationPaymentEvent }): Promise<void>;
  };
  tracking: Pick<StripeTracking, 'checkoutCompletion'>;
}

/**
 * Completes a donation's Checkout session by recording the donation under the name and email of
 * the member whose Stripe customer paid it, or else those the donor gave Stripe, and telling the
 * site's staff about it. Records a `stripe_checkout.complete` span.
 */
export async function recordDonation(
  deps: DonationCheckoutDeps,
  { amount, currency, customerId, donor, message, attribution }: DonationCheckout,
): Promise<WebhookOutcome> {
  return deps.tracking.checkoutCompletion(async (attempt) => {
    attempt.completing('donation');
    const member = customerId ? await deps.memberRepository.get({ customer_id: customerId }) : null;
    const email = member?.get('email') ?? donor.email;
    // A donation is recorded under an email address. A member always has one, and Stripe
    // collects one on every payment checkout, so this refuses only a checkout sent without it.
    if (email === null) {
      throw new errors.ValidationError({
        code: FAILURE_CODES.unusableCustomer,
        message: "The donation's checkout has no email address for the donor.",
      });
    }

    const donation = DonationPaymentEvent.create({
      name: member?.get('name') ?? donor.name,
      email,
      memberId: member?.id ?? null,
      amount,
      currency,
      donationMessage: message,
      ...attribution,
    });
    await deps.donationRepository.save(donation);
    await deps.staffServiceEmails.notifyDonationReceived({
      donationPaymentEvent: donation,
    });
    return { result: 'handled' };
  });
}
