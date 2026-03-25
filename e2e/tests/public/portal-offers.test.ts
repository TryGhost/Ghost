import {OffersService} from '@/helpers/services/offers/offers-service';
import {PortalOfferPage, PublicPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createPaidPortalTier, expect, redeemOfferViaPortal, test} from '@/helpers/playwright';
import type {AdminOffer, OfferCreateInput} from '@/helpers/services/offers/offers-service';
import type {HttpClient} from '@/data-factory';
import type {StripeTestService} from '@/helpers/services/stripe';

const MEMBER_NAME = 'Testy McTesterson';

type SignupOfferInput = Pick<OfferCreateInput, 'amount' | 'duration' | 'duration_in_months' | 'type'> & {
    codePrefix: string;
    tierNamePrefix: string;
};

// TODO: Move this setup into an OfferFactory-backed helper that owns tier creation,
// portal settings, and Stripe sync instead of keeping it local to the test file.
async function createSignupOffer(request: HttpClient, stripe: StripeTestService, input: SignupOfferInput): Promise<AdminOffer> {
    const offersService = new OffersService(request);
    const settingsService = new SettingsService(request);
    const suffix = Date.now();
    const tierName = `${input.tierNamePrefix} ${suffix}`;

    await settingsService.updateSettings([{key: 'portal_button', value: true}]);

    const tier = await createPaidPortalTier(request, {
        name: tierName,
        currency: 'usd',
        monthly_price: 600,
        yearly_price: 6000
    });
    await waitForTierStripeSync(stripe, tierName);

    return await offersService.createOffer({
        name: 'Black Friday Special',
        code: `${input.codePrefix}-${suffix}`,
        cadence: 'month',
        amount: input.amount,
        duration: input.duration,
        duration_in_months: input.duration_in_months ?? null,
        tierId: tier.id,
        type: input.type
    });
}

async function waitForTierStripeSync(stripe: StripeTestService, tierName: string): Promise<void> {
    await expect.poll(() => {
        const product = stripe.getProducts().find(item => item.name === tierName);
        if (!product) {
            return 0;
        }

        return stripe.getPrices().filter(item => item.product === product.id).length;
    }, {timeout: 10000}).toBe(2);
}

test.describe('Ghost Public - Portal Offers', () => {
    test.use({stripeEnabled: true});

    test('archived offer link opens site - does not open portal offer flow', async ({page}) => {
        const publicPage = new PublicPage(page);
        const offersService = new OffersService(page.request);
        const tier = await createPaidPortalTier(page.request, {
            name: `Archived Offer Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        });
        const offer = await offersService.createOffer({
            name: 'Archived Offer',
            code: `archived-offer-${Date.now()}`,
            cadence: 'month',
            amount: 10,
            duration: 'once',
            type: 'percent',
            tierId: tier.id
        });

        await offersService.updateOffer(offer.id, {status: 'archived'});

        await publicPage.gotoOfferCode(offer.code);
        await publicPage.portalRoot.waitFor({state: 'attached'});

        await expect(publicPage.portalPopupFrame).toHaveCount(0);
        await expect(page).not.toHaveURL(/#\/portal\/offers\//);
    });

    test('retention offer link opens site - does not open portal offer flow', async ({page}) => {
        const publicPage = new PublicPage(page);
        const offersService = new OffersService(page.request);
        const offer = await offersService.createOffer({
            name: 'Retention Offer',
            code: `retention-offer-${Date.now()}`,
            cadence: 'month',
            amount: 10,
            duration: 'once',
            type: 'percent',
            redemption_type: 'retention',
            tierId: null
        });

        await publicPage.gotoOfferCode(offer.code);
        await publicPage.portalRoot.waitFor({state: 'attached'});

        await expect(publicPage.portalPopupFrame).toHaveCount(0);
        await expect(page).not.toHaveURL(/#\/portal\/offers\//);
    });

    test('free trial offer opens in portal - redemption shows free trial state', async ({page, stripe}) => {
        const offer = await createSignupOffer(page.request, stripe!, {
            amount: 14,
            codePrefix: 'trial-offer',
            duration: 'trial',
            tierNamePrefix: 'Trial Offer Tier',
            type: 'trial'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await offerPage.waitForOfferPage(offer.name);
        await expect(offerPage.headingWithText(offer.name)).toBeVisible();
        await expect(offerPage.text('14 days free')).toBeVisible();
        await expect(offerPage.text('Try free for 14 days')).toBeVisible();

        const {accountPage, subscription} = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expect(accountPage.freeTrialLabel).toBeVisible();
        expect(subscription.offer?.id).toBe(offer.id);
        expect(subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
        expect(subscription.status).toBe('trialing');
    });

    test('one-time discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createSignupOffer(page.request, stripe!, {
            amount: 10,
            codePrefix: 'once-offer',
            duration: 'once',
            tierNamePrefix: 'One-time Offer Tier',
            type: 'percent'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await offerPage.waitForOfferPage(offer.name);
        await expect(offerPage.headingWithText(offer.name)).toBeVisible();
        await expect(offerPage.text(/^10% off$/)).toBeVisible();
        await expect(offerPage.text(/\$5\.40/)).toBeVisible();
        await expect(offerPage.text('10% off for first month')).toBeVisible();

        const {accountPage, subscription} = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expect(accountPage.offerLabel).toContainText('$5.40/month');
        await expect(accountPage.offerLabel).toContainText('Ends');
        expect(subscription.offer?.id).toBe(offer.id);
        expect(subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
        expect(subscription.offer?.duration).toBe('once');
    });

    test('repeating discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createSignupOffer(page.request, stripe!, {
            amount: 10,
            codePrefix: 'repeating-offer',
            duration: 'repeating',
            duration_in_months: 3,
            tierNamePrefix: 'Repeating Offer Tier',
            type: 'percent'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await offerPage.waitForOfferPage(offer.name);
        await expect(offerPage.headingWithText(offer.name)).toBeVisible();
        await expect(offerPage.text(/^10% off$/)).toBeVisible();
        await expect(offerPage.text(/\$5\.40/)).toBeVisible();
        await expect(offerPage.text('10% off for first 3 months')).toBeVisible();

        const {accountPage, subscription} = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expect(accountPage.offerLabel).toContainText('$5.40/month');
        await expect(accountPage.offerLabel).toContainText('Ends');
        expect(subscription.offer?.id).toBe(offer.id);
        expect(subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
        expect(subscription.offer?.duration).toBe('repeating');
        expect(subscription.offer?.duration_in_months).toBe(3);
    });

    test('forever discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createSignupOffer(page.request, stripe!, {
            amount: 10,
            codePrefix: 'forever-offer',
            duration: 'forever',
            tierNamePrefix: 'Forever Offer Tier',
            type: 'percent'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await offerPage.waitForOfferPage(offer.name);
        await expect(offerPage.headingWithText(offer.name)).toBeVisible();
        await expect(offerPage.text(/^10% off$/)).toBeVisible();
        await expect(offerPage.text(/\$5\.40/)).toBeVisible();
        await expect(offerPage.text('10% off forever')).toBeVisible();

        const {accountPage, subscription} = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expect(accountPage.offerLabel).toContainText('$5.40/month');
        await expect(accountPage.offerLabel).toContainText('Forever');
        expect(subscription.offer?.id).toBe(offer.id);
        expect(subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
        expect(subscription.offer?.duration).toBe('forever');
    });
});
