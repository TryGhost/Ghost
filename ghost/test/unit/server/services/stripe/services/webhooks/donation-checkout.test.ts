import { assert, describe, it } from 'vitest';
import { createMeter } from '../../../../../../../core/server/lib/tracing/create-meter';
import { createTracer } from '../../../../../../../core/server/lib/tracing/create-tracer';
import type { DonationPaymentEvent } from '../../../../../../../core/server/services/donations/donation-payment-event';
import {
  recordDonation,
  type DonationCheckoutDeps,
} from '../../../../../../../core/server/services/stripe/services/webhook/donation-checkout';
import { stripeTracking } from '../../../../../../../core/server/services/stripe/tracking';

const shipNothing = { transport: { metric: async () => null }, logging: { error() {} } };
const tracking = stripeTracking({
  tracer: createTracer(shipNothing),
  meter: createMeter(shipNothing),
});

describe('recordDonation', function () {
  // The staff email goes out once the donation is saved, and a failure to send it fails the
  // webhook. The webhook outcome tests can't make it fail, as the mailer logs a failed send
  // rather than throwing.
  it('rejects with the staff notification failure after saving the donation', async function () {
    const failure = new Error('staff email failed');
    const saved: DonationPaymentEvent[] = [];
    let notified: DonationPaymentEvent | undefined;
    const deps: DonationCheckoutDeps = {
      memberRepository: { get: async () => null },
      donationRepository: {
        save: async (donation) => {
          saved.push(donation);
        },
      },
      staffServiceEmails: {
        notifyDonationReceived: async ({ donationPaymentEvent }) => {
          notified = donationPaymentEvent;
          throw failure;
        },
      },
      tracking,
    };

    let thrown: unknown;
    try {
      await recordDonation(deps, {
        amount: 1000,
        currency: 'usd',
        customerId: null,
        donor: { name: 'A reader', email: 'reader@example.com' },
        message: null,
        attribution: {
          attributionId: null,
          attributionUrl: null,
          attributionType: null,
          referrerSource: null,
          referrerMedium: null,
          referrerUrl: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
        },
      });
    } catch (err) {
      thrown = err;
    }

    assert.equal(thrown, failure);
    assert.equal(saved.length, 1);
    assert.equal(notified, saved[0]);
  });
});
