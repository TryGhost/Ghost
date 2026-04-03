import {type AdminOffer, createOfferFactory} from '@/data-factory';
import {PortalOfferPage, PublicPage} from '@/helpers/pages';
import {createPaidPortalTier, createPortalSignupOffer, expect, redeemOfferViaPortal, test} from '@/helpers/playwright';

const MEMBER_NAME = 'Testy McTesterson';

type OfferLandingExpectation = {
    title: string;
    discountLabel: string | RegExp;
    message: string | RegExp;
    updatedPrice?: string | RegExp;
};

type RedeemedOfferResult = Awaited<ReturnType<typeof redeemOfferViaPortal>>;

type DiscountOfferExpectation = {
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number | null;
    priceLabel: string;
    timingLabel: string;
};

async function expectOfferLandingPage(offerPage: PortalOfferPage, expected: OfferLandingExpectation): Promise<void> {
    await offerPage.waitForOfferPage();
    await expect(offerPage.offerTitle).toHaveText(expected.title);
    await expect(offerPage.discountLabel).toContainText(expected.discountLabel);
    await expect(offerPage.offerMessage).toContainText(expected.message);

    if (expected.updatedPrice) {
        await expect(offerPage.updatedPrice).toContainText(expected.updatedPrice);
    }
}

function expectOfferMetadata(result: RedeemedOfferResult, offer: AdminOffer): void {
    expect(result.subscription.offer?.id).toBe(offer.id);
    expect(result.subscription.offer_redemptions?.some(item => item.id === offer.id)).toBe(true);
}

async function expectTrialOfferRedemption(result: RedeemedOfferResult, offer: AdminOffer): Promise<void> {
    await expect(result.accountPage.freeTrialLabel).toBeVisible();
    expectOfferMetadata(result, offer);
    expect(result.subscription.status).toBe('trialing');
}

async function expectDiscountOfferRedemption(
    result: RedeemedOfferResult,
    offer: AdminOffer,
    expected: DiscountOfferExpectation
): Promise<void> {
    await expect(result.accountPage.offerLabel).toContainText(expected.priceLabel);
    await expect(result.accountPage.offerLabel).toContainText(expected.timingLabel);

    expectOfferMetadata(result, offer);
    expect(result.subscription.offer?.duration).toBe(expected.duration);

    if (expected.durationInMonths !== undefined) {
        expect(result.subscription.offer?.duration_in_months).toBe(expected.durationInMonths);
    }
}

test.describe('Ghost Public - Portal Offers', () => {
    test.use({stripeEnabled: true});

    test('archived offer link opens site - does not open portal offer flow', async ({page, stripe}) => {
        const offerFactory = createOfferFactory(page.request);
        const publicPage = new PublicPage(page);
        const tier = await createPaidPortalTier(page.request, {
            name: `Archived Offer Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        }, {
            stripe: stripe!
        });
        const offer = await offerFactory.create({
            name: 'Archived Offer',
            code: `archived-offer-${Date.now()}`,
            cadence: 'month',
            amount: 10,
            duration: 'once',
            type: 'percent',
            tierId: tier.id
        });

        await offerFactory.update(offer.id, {status: 'archived'});

        await publicPage.gotoOfferCode(offer.code);
        await publicPage.portalRoot.waitFor({state: 'attached'});

        await expect(publicPage.portalPopupFrame).toHaveCount(0);
        await expect(page).not.toHaveURL(/#\/portal\/offers\//);
    });

    test('retention offer link opens site - does not open portal offer flow', async ({page}) => {
        const offerFactory = createOfferFactory(page.request);
        const publicPage = new PublicPage(page);
        const offer = await offerFactory.create({
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
        const offer = await createPortalSignupOffer(page.request, stripe!, {
            amount: 14,
            codePrefix: 'trial-offer',
            duration: 'trial',
            tierNamePrefix: 'Trial Offer Tier',
            type: 'trial'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await expectOfferLandingPage(offerPage, {
            title: offer.display_title ?? offer.name,
            discountLabel: '14 days free',
            message: 'Try free for 14 days'
        });

        const redemption = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expectTrialOfferRedemption(redemption, offer);
    });

    test('one-time discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createPortalSignupOffer(page.request, stripe!, {
            amount: 10,
            codePrefix: 'once-offer',
            duration: 'once',
            tierNamePrefix: 'One-time Offer Tier',
            type: 'percent'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await expectOfferLandingPage(offerPage, {
            title: offer.display_title ?? offer.name,
            discountLabel: '10% off',
            message: '10% off for first month',
            updatedPrice: /\$5\.40/
        });

        const redemption = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expectDiscountOfferRedemption(redemption, offer, {
            duration: 'once',
            priceLabel: '$5.40/month',
            timingLabel: 'Ends'
        });
    });

    test('repeating discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createPortalSignupOffer(page.request, stripe!, {
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
        await expectOfferLandingPage(offerPage, {
            title: offer.display_title ?? offer.name,
            discountLabel: '10% off',
            message: '10% off for first 3 months',
            updatedPrice: /\$5\.40/
        });

        const redemption = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expectDiscountOfferRedemption(redemption, offer, {
            duration: 'repeating',
            durationInMonths: 3,
            priceLabel: '$5.40/month',
            timingLabel: 'Ends'
        });
    });

    test('forever discount offer opens in portal - redemption shows discounted plan label', async ({page, stripe}) => {
        const offer = await createPortalSignupOffer(page.request, stripe!, {
            amount: 10,
            codePrefix: 'forever-offer',
            duration: 'forever',
            tierNamePrefix: 'Forever Offer Tier',
            type: 'percent'
        });

        const publicPage = new PublicPage(page);
        await publicPage.gotoOfferCode(offer.code);

        const offerPage = new PortalOfferPage(page);
        await expectOfferLandingPage(offerPage, {
            title: offer.display_title ?? offer.name,
            discountLabel: '10% off',
            message: '10% off forever',
            updatedPrice: /\$5\.40/
        });

        const redemption = await redeemOfferViaPortal(page, stripe!, {name: MEMBER_NAME});
        await expectDiscountOfferRedemption(redemption, offer, {
            duration: 'forever',
            priceLabel: '$5.40/month',
            timingLabel: 'Forever'
        });
    });
});
