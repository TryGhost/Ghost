import {FakeStripeCheckoutPage, HomePage, PortalAccountPage, PortalAccountPlanPage} from '@/helpers/pages';
import {signInAsMember} from './sign-in';
import type {Member} from '@/data-factory';
import type {Page} from '@playwright/test';
import type {StripeTestService} from '@/helpers/services/stripe';

function getLatestCheckoutSuccessUrl(stripe: StripeTestService): string {
    const successUrl = stripe.getCheckoutSessions().at(-1)?.response.success_url;

    if (!successUrl) {
        throw new Error('Latest Stripe checkout session does not include a success URL');
    }

    return successUrl;
}

export async function completePaidUpgradeViaPortal(page: Page, stripe: StripeTestService, member: Member, opts: {
    cadence: 'monthly' | 'yearly';
    tierName: string;
}): Promise<void> {
    await signInAsMember(page, member);

    const homePage = new HomePage(page);
    await homePage.openAccountPortal();

    const portalAccountPage = new PortalAccountPage(page);
    await portalAccountPage.waitForPortalToOpen();
    await portalAccountPage.openPlanSelection();

    const accountPlanPage = new PortalAccountPlanPage(page);
    await accountPlanPage.waitUntilLoaded();
    await accountPlanPage.switchCadence(opts.cadence);
    await accountPlanPage.selectTier(opts.tierName);

    const fakeCheckoutPage = new FakeStripeCheckoutPage(page);
    await fakeCheckoutPage.waitUntilLoaded();
    await stripe.completeLatestSubscriptionCheckout({name: member.name ?? undefined});
    await page.goto(getLatestCheckoutSuccessUrl(stripe));
}

export async function switchPlanViaPortal(page: Page, opts: {
    cadence: 'monthly' | 'yearly';
    tierName: string;
}): Promise<void> {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.openAccountPortal();

    const portalAccountPage = new PortalAccountPage(page);
    await portalAccountPage.waitForPortalToOpen();
    await portalAccountPage.openPlanSelection();

    const accountPlanPage = new PortalAccountPlanPage(page);
    await accountPlanPage.waitUntilLoaded();
    await accountPlanPage.switchCadence(opts.cadence);
    await accountPlanPage.selectTier(opts.tierName);
    await accountPlanPage.confirmAction();
}
