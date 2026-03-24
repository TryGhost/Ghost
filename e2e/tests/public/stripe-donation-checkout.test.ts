import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {FakeStripeCheckoutPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

interface CheckoutSessionResponse {
    url: string;
}

// This is a harness smoke test for the e2e Stripe tooling rather than a long-term
// product-facing spec. Migrated donation tests should carry the readable behavior
// coverage, and this should stay thin or be removed if it becomes redundant.
// TODO: REMOVE TEST

test.describe('Ghost Public - Stripe Donation Checkout', () => {
    test.use({stripeEnabled: true});

    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    test('donation checkout uses fake stripe payment mode - completed webhook sends staff email', async ({page, stripe}) => {
        const donorName = `Donation Donor ${Date.now()}`;
        const donorEmail = `donation-${Date.now()}@example.com`;
        const donationMessage = `Keep building ${Date.now()}`;
        const personalNote = 'Leave a note for the publisher';

        const response = await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                type: 'donation',
                customerEmail: donorEmail,
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel',
                personalNote
            }
        });

        expect(response.ok()).toBe(true);

        const sessionResponse = await response.json() as CheckoutSessionResponse;
        const products = stripe!.getProducts();
        const prices = stripe!.getPrices();
        const sessions = stripe!.getCheckoutSessions();

        expect(products).toHaveLength(1);
        expect(prices).toHaveLength(1);
        expect(sessions).toHaveLength(1);

        const price = prices[0];
        const session = sessions[0];

        expect(price.type).toBe('one_time');
        expect(price.currency).toBe('usd');
        expect(price.unit_amount).toBeNull();
        expect(price.custom_unit_amount?.enabled).toBe(true);
        expect(price.custom_unit_amount?.preset).toBe(500);

        expect(session.request.line_items?.[0]?.price).toBe(price.id);
        expect(session.request.submit_type).toBe('pay');
        expect(session.request.invoice_creation?.enabled).toBe(true);
        expect(session.request.invoice_creation?.invoice_data?.metadata.ghost_donation).toBe('true');
        expect(session.request.custom_fields?.[0]?.key).toBe('donation_message');
        expect(session.request.custom_fields?.[0]?.label?.custom).toBe(personalNote);
        expect(session.response.mode).toBe('payment');
        expect(session.response.customer).toBeNull();
        expect(session.response.customer_email).toBe(donorEmail);
        expect(session.response.metadata.ghost_donation).toBe('true');
        expect(sessionResponse.url).toBe(session.response.url);

        const fakeCheckoutPage = new FakeStripeCheckoutPage(page);
        await fakeCheckoutPage.goto(sessionResponse.url);
        await fakeCheckoutPage.waitUntilDonationReady();

        await stripe!.completeLatestDonationCheckout({
            donationMessage,
            email: donorEmail,
            name: donorName
        });

        const messages = await emailClient.search({
            subject: donorName
        }, {
            timeoutMs: 10000
        });
        expect(messages.length).toBeGreaterThan(0);
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);

        expect(latestMessage.Subject).toContain('One-time payment received');
        expect(latestMessage.Subject).toContain(donorName);
        expect(latestMessage.Text).toContain(donationMessage);
    });
});
