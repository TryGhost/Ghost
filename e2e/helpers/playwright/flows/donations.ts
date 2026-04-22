import {FakeStripeCheckoutPage} from '@/helpers/pages';
import {Page} from '@playwright/test';
import type {StripeTestService} from '@/helpers/services/stripe';

interface CompleteDonationOptions {
    amount?: string;
    donationMessage?: string;
    email?: string;
    name?: string;
}

export async function completeDonationViaFakeCheckout(page: Page, stripe: StripeTestService, opts: CompleteDonationOptions = {}): Promise<void> {
    const checkoutPage = new FakeStripeCheckoutPage(page);
    await checkoutPage.waitUntilDonationReady();

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
        name: opts.name
    });

    const latestCheckoutSession = stripe.getCheckoutSessions().at(-1);
    const successUrl = latestCheckoutSession?.response.success_url;

    if (!successUrl) {
        throw new Error('Latest Stripe checkout session does not include a success URL');
    }

    await page.goto(successUrl);
}
