import {type AdminOffer, type HttpClient, type OfferCreateInput, createOfferFactory} from '@/data-factory';
import {FakeStripeCheckoutPage, HomePage, PortalAccountPage} from '@/helpers/pages';
import {MembersService} from '@/helpers/services/members/members-service';
import {PortalOfferPage} from '@/portal-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createPaidPortalTier} from './tiers';
import {faker} from '@faker-js/faker';
import type {MemberSubscription} from '@/helpers/services/members/members-service';
import type {Page} from '@playwright/test';
import type {StripeTestService} from '@/helpers/services/stripe';

export type PortalSignupOfferInput = Pick<OfferCreateInput, 'amount' | 'duration' | 'duration_in_months' | 'type'> & {
    codePrefix: string;
    tierNamePrefix: string;
};

export async function createPortalSignupOffer(
    request: HttpClient,
    stripe: StripeTestService,
    input: PortalSignupOfferInput
): Promise<AdminOffer> {
    const offerFactory = createOfferFactory(request);
    const settingsService = new SettingsService(request);
    const suffix = Date.now();
    const tierName = `${input.tierNamePrefix} ${suffix}`;

    await settingsService.updateSettings([{key: 'portal_button', value: true}]);

    const tier = await createPaidPortalTier(request, {
        name: tierName,
        currency: 'usd',
        monthly_price: 600,
        yearly_price: 6000
    }, {
        stripe
    });

    return await offerFactory.create({
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

export async function completeOfferSignupViaPortal(page: Page, stripe: StripeTestService, opts?: {emailAddress?: string; name?: string}): Promise<{emailAddress: string; name: string}> {
    const offerPage = new PortalOfferPage(page);
    const emailAddress = opts?.emailAddress ?? `test${faker.string.uuid()}@ghost.org`;
    const name = opts?.name ?? faker.person.fullName();

    await offerPage.fillAndSubmit(emailAddress, name);
    await offerPage.continueIfVisible();

    const fakeCheckoutPage = new FakeStripeCheckoutPage(page);
    await fakeCheckoutPage.waitUntilLoaded();
    await stripe.completeLatestSubscriptionCheckout({name});

    const latestCheckoutSession = stripe.getCheckoutSessions().at(-1);
    const successUrl = latestCheckoutSession?.response.success_url;

    if (!successUrl) {
        throw new Error('Latest Stripe checkout session does not include a success URL');
    }

    await page.goto(successUrl);

    return {emailAddress, name};
}

export async function redeemOfferViaPortal(page: Page, stripe: StripeTestService, opts?: {
    emailAddress?: string;
    name?: string;
}): Promise<{
    accountPage: PortalAccountPage;
    emailAddress: string;
    name: string;
    subscription: MemberSubscription;
}> {
    const membersService = new MembersService(page.request);
    const {emailAddress, name} = await completeOfferSignupViaPortal(page, stripe, opts);

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.openAccountPortal();

    const accountPage = new PortalAccountPage(page);
    await accountPage.waitForPortalToOpen();
    await accountPage.emailText(emailAddress).waitFor({state: 'visible'});

    const member = await membersService.getByEmailWithSubscriptions(emailAddress);
    const subscription = member.subscriptions[0];

    if (!subscription) {
        throw new Error(`Expected redeemed offer member ${emailAddress} to have a subscription`);
    }

    return {
        accountPage,
        emailAddress,
        name,
        subscription
    };
}
