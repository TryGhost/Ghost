import {FakeStripeCheckoutPage, PublicPage} from '@/helpers/pages';
import {SignUpPage} from '@/portal-pages';
import {createPaidPortalTier, expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

async function getMemberIdentityToken(page: Page): Promise<string> {
    const response = await page.context().request.get('/members/api/session');

    expect(response.ok()).toBe(true);

    const identity = await response.text();
    expect(identity).not.toBe('');

    return identity;
}

function getAlternateCadence(interval: string | undefined): 'month' | 'year' {
    if (interval === 'month') {
        return 'year';
    }

    if (interval === 'year') {
        return 'month';
    }

    throw new Error(`Unsupported subscription cadence: ${interval ?? 'missing'}`);
}

function getLatestCheckoutSuccessUrl(stripeCheckoutCount: {response: {success_url: string}}[]): string {
    const successUrl = stripeCheckoutCount.at(-1)?.response.success_url;

    if (!successUrl) {
        throw new Error('Latest Stripe checkout session does not include a success URL');
    }

    return successUrl;
}

function getTargetPrice(targetCadence: 'month' | 'year', prices: {
    monthly: {id: string};
    yearly: {id: string};
}): {id: string} {
    if (targetCadence === 'month') {
        return prices.monthly;
    }

    return prices.yearly;
}

test.describe('Ghost Public - Stripe Subscription Mutations', () => {
    test.use({stripeEnabled: true});

    test('paid member subscription update via ghost - switches the fake stripe price', async ({page, stripe}) => {
        const memberEmail = `stripe-mutation-${Date.now()}@example.com`;
        const tier = await createPaidPortalTier(page.request, {
            name: `Mutation Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        });

        await expect.poll(() => {
            return stripe!.getProducts().find(item => item.name === tier.name);
        }, {timeout: 10000}).toBeDefined();

        await expect.poll(() => {
            return stripe!.getPrices().filter(item => item.product === stripe!.getProducts().find(product => product.name === tier.name)?.id).length;
        }, {timeout: 10000}).toBe(2);

        const product = stripe!.getProducts().find(item => item.name === tier.name);
        const monthlyPrice = stripe!.getPrices().find((item) => {
            return item.product === product?.id && item.recurring?.interval === 'month';
        });
        const yearlyPrice = stripe!.getPrices().find((item) => {
            return item.product === product?.id && item.recurring?.interval === 'year';
        });

        expect(product).toBeDefined();
        expect(monthlyPrice).toBeDefined();
        expect(yearlyPrice).toBeDefined();

        const publicPage = new PublicPage(page);
        await publicPage.gotoPortalSignup();

        const signUpPage = new SignUpPage(page);
        await signUpPage.waitForPortalToOpen();
        await signUpPage.fillAndSubmitPaidSignup(memberEmail, 'Stripe Mutation Member', tier.name);

        const fakeCheckoutPage = new FakeStripeCheckoutPage(page);
        await fakeCheckoutPage.waitUntilLoaded();
        await stripe!.completeLatestSubscriptionCheckout({name: 'Stripe Mutation Member'});
        await page.goto(getLatestCheckoutSuccessUrl(stripe!.getCheckoutSessions()));

        const subscription = stripe!.getSubscriptions().at(-1);
        expect(subscription).toBeDefined();

        const currentPrice = subscription!.items.data[0]?.price;
        expect(currentPrice).toBeDefined();

        const targetCadence = getAlternateCadence(currentPrice!.recurring?.interval);
        const targetPrice = getTargetPrice(targetCadence, {
            monthly: monthlyPrice!,
            yearly: yearlyPrice!
        });

        expect(targetPrice).toBeDefined();

        const identity = await getMemberIdentityToken(page);
        const response = await page.context().request.put(`/members/api/subscriptions/${subscription!.id}/`, {
            data: {
                identity,
                tierId: tier.id,
                cadence: targetCadence
            }
        });

        expect(response.status()).toBe(204);

        const updatedSubscription = stripe!.getSubscriptions().find(item => item.id === subscription!.id);
        expect(updatedSubscription?.items.data[0]?.price.id).toBe(targetPrice!.id);
        expect(updatedSubscription?.items.data[0]?.price.recurring?.interval).toBe(targetCadence);
    });
});
