import {TiersService} from '@/helpers/services/tiers/tiers-service';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

interface CheckoutSessionResponse {
    url: string;
}

// This is a harness smoke test for the e2e Stripe tooling rather than a long-term
// product-facing spec. Migrated Stripe tests should carry the readable behavior
// coverage, and this should stay thin or be removed if it becomes redundant.
// TODO: REMOVE TEST

test.describe('Ghost Public - Stripe Checkout Initiation', () => {
    test.use({stripeEnabled: true});

    test('paid tier syncs to fake stripe - checkout returns a fake session url', async ({page, stripe}) => {
        const tiersService = new TiersService(page.request);
        const memberFactory = createMemberFactory(page.request);
        const tierName = `Stripe Tier ${Date.now()}`;
        const member = await memberFactory.create({
            status: 'free',
            email: `stripe-checkout-${Date.now()}@example.com`
        });

        const tier = await tiersService.createTier({
            name: tierName,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });

        await expect.poll(() => stripe!.getProducts().length, {timeout: 10000}).toBe(1);
        await expect.poll(() => stripe!.getPrices().length, {timeout: 10000}).toBe(2);

        const product = stripe!.getProducts().find(item => item.name === tierName);
        const monthlyPrice = stripe!.getPrices().find(item => item.nickname === 'Monthly');
        const yearlyPrice = stripe!.getPrices().find(item => item.nickname === 'Yearly');

        expect(product).toBeDefined();
        expect(monthlyPrice).toBeDefined();
        expect(yearlyPrice).toBeDefined();
        expect(monthlyPrice?.product).toBe(product?.id);
        expect(monthlyPrice?.unit_amount).toBe(500);
        expect(monthlyPrice?.recurring?.interval).toBe('month');
        expect(yearlyPrice?.product).toBe(product?.id);
        expect(yearlyPrice?.unit_amount).toBe(5000);
        expect(yearlyPrice?.recurring?.interval).toBe('year');

        const response = await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                tierId: tier.id,
                cadence: 'month',
                customerEmail: member.email,
                metadata: {
                    requestSrc: 'e2e'
                },
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel'
            }
        });

        expect(response.ok()).toBe(true);

        const sessionResponse = await response.json() as CheckoutSessionResponse;

        await expect.poll(() => stripe!.getCustomers().length, {timeout: 10000}).toBe(1);
        await expect.poll(() => stripe!.getCheckoutSessions().length, {timeout: 10000}).toBe(1);

        const customer = stripe!.getCustomers()[0];
        const session = stripe!.getCheckoutSessions()[0];

        expect(customer.email).toBe(member.email);
        expect(session.response.customer).toBe(customer.id);
        expect(session.response.customer_email).toBeNull();
        expect(session.request.subscription_data?.items[0]?.plan).toBe(monthlyPrice?.id);
        expect(session.response.metadata.requestSrc).toBe('e2e');
        expect(sessionResponse.url).toBe(session.response.url);

        await page.goto(sessionResponse.url);
        await expect(page.getByRole('heading', {name: 'Fake Stripe Checkout'})).toBeVisible();
    });
});
