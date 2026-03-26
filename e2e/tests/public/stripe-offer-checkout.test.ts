import {MembersService} from '@/helpers/services/members/members-service';
import {createOfferFactory, createTierFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

interface CheckoutSessionResponse {
    url: string;
}

// This is a harness smoke test for the e2e Stripe tooling rather than a long-term
// product-facing spec. Migrated offer tests should carry the readable behavior
// coverage, and this should stay thin or be removed if it becomes redundant.
// TODO: REMOVE TEST

test.describe('Ghost Public - Stripe Offer Checkout', () => {
    test.use({stripeEnabled: true});

    test('offer checkout creates a fake stripe coupon - redeemed offer is linked to the subscription', async ({page, stripe}) => {
        const offerFactory = createOfferFactory(page.request);
        const tierFactory = createTierFactory(page.request);
        const membersService = new MembersService(page.request);
        const tierName = `Offer Tier ${Date.now()}`;
        const memberEmail = `offer-checkout-${Date.now()}@example.com`;

        const tier = await tierFactory.create({
            name: tierName,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        });

        const offer = await offerFactory.create({
            name: 'Spring Offer',
            code: `spring-offer-${Date.now()}`,
            cadence: 'month',
            amount: 10,
            duration: 'repeating',
            duration_in_months: 3,
            type: 'percent',
            tierId: tier.id
        });

        const response = await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                customerEmail: memberEmail,
                offerId: offer.id,
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel'
            }
        });

        expect(response.ok()).toBe(true);

        const sessionResponse = await response.json() as CheckoutSessionResponse;
        const session = stripe!.getCheckoutSessions().at(-1);

        expect(session).toBeDefined();
        expect(sessionResponse.url).toBe(session?.response.url);
        expect(session?.response.metadata.offer).toBe(offer.id);

        const couponId = session?.request.discounts?.[0]?.coupon;
        expect(couponId).toBeDefined();

        const coupon = stripe!.getCoupons().find(item => item.id === couponId);
        expect(coupon).toBeDefined();
        expect(coupon?.duration).toBe('repeating');
        expect(coupon?.duration_in_months).toBe(3);
        expect(coupon?.percent_off).toBe(10);
        expect(session?.request.subscription_data?.items).toHaveLength(1);

        const createdMember = await stripe!.completeLatestSubscriptionCheckout({name: 'Offer Member'});
        expect(createdMember.subscription.discount?.coupon.id).toBe(coupon?.id);
        expect(createdMember.subscription.discount?.end).not.toBeNull();

        const member = await membersService.getByEmailWithSubscriptions(memberEmail);
        const subscription = member.subscriptions[0];

        expect(subscription.offer?.id).toBe(offer.id);
        expect(subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
        expect(subscription.next_payment?.original_amount).toBe(600);
        expect(subscription.next_payment?.amount).toBe(540);
        expect(subscription.next_payment?.discount?.offer_id).toBe(offer.id);
    });
});
