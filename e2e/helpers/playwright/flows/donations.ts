import { FakeStripeCheckoutPage } from '@/helpers/pages';
import { MailPit } from '@/helpers/services/email/mail-pit';
import { Page, expect } from '@playwright/test';
import type { StripeTestService } from '@/helpers/services/stripe';

interface CompleteDonationOptions {
  amount?: string;
  donationMessage?: string;
  email?: string;
  name?: string;
}

export async function completeDonationViaFakeCheckout(
  page: Page,
  stripe: StripeTestService,
  opts: CompleteDonationOptions = {},
): Promise<void> {
  const checkoutPage = new FakeStripeCheckoutPage(page);
  await checkoutPage.waitUntilPaymentReady();

  if (opts.amount) {
    await checkoutPage.changeAmountTo(opts.amount);
  }

  if (opts.email) {
    await checkoutPage.fillEmail(opts.email);
  }

  const amount = await checkoutPage.getAmountInCents();
  const email = await checkoutPage.getEmail();

  await checkoutPage.submitPayment();
  await stripe.completeLatestDonationCheckout({
    amount,
    donationMessage: opts.donationMessage,
    email,
    name: opts.name,
  });

  // The staff notification subject only carries the donor's display name, which tests
  // reuse, and Mailpit is never cleared between them — match the donor address in the body.
  const mailpit = new MailPit();
  await expect
    .poll(
      async () => {
        const candidates = await mailpit.search(
          { subject: opts.name ?? email },
          { timeoutMs: null },
        );
        const messages = await Promise.all(
          candidates.map((candidate) => mailpit.getMessageDetailed(candidate)),
        );

        return messages.some((message) => message.HTML.includes(email));
      },
      { timeout: 10000, message: `No donation notification email found for ${email}` },
    )
    .toBe(true);

  const latestCheckoutSession = stripe.getCheckoutSessions().at(-1);
  const successUrl = latestCheckoutSession?.response.success_url;

  if (!successUrl) {
    throw new Error('Latest Stripe checkout session does not include a success URL');
  }

  await page.goto(successUrl);
}
