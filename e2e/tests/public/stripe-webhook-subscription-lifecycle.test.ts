import {APIRequestContext, Page} from '@playwright/test';
import {HomePage, MemberDetailsPage, MembersPage, PortalAccountPage} from '@/helpers/pages';
import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

async function waitForMemberStatus(request: APIRequestContext, email: string, status: string) {
    const membersService = new MembersService(request);

    await expect.poll(async () => {
        try {
            const member = await membersService.getByEmail(email);
            return member.status;
        } catch {
            return null;
        }
    }, {timeout: 10000}).toBe(status);
}

async function waitForCanceledSubscription(request: APIRequestContext, email: string) {
    const membersService = new MembersService(request);

    await expect.poll(async () => {
        try {
            const member = await membersService.getByEmailWithSubscriptions(email);
            return member.subscriptions[0]?.cancel_at_period_end ?? null;
        } catch {
            return null;
        }
    }, {timeout: 10000}).toBe(true);
}

async function openPortalAsMember(page: Page, email: string) {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickMemberByEmail(email);

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.impersonateButton.click();

    await expect(memberDetailsPage.magicLinkInput).not.toHaveValue('');
    const magicLink = await memberDetailsPage.magicLinkInput.inputValue();
    await memberDetailsPage.goto(magicLink);

    const homePage = new HomePage(page);
    await homePage.openAccountPortal();

    const portalAccountPage = new PortalAccountPage(page);
    await portalAccountPage.waitForPortalToOpen();
    return portalAccountPage;
}

test.describe('Portal - Stripe Subscription Lifecycle via Webhooks', () => {
    test.use({stripeEnabled: true});

    test('webhook-seeded paid member - sees billing details in portal', async ({page, stripe}) => {
        const email = `portal-paid-${Date.now()}@example.com`;

        await stripe!.createPaidMemberViaWebhooks({email, name: 'Portal Paid Member'});
        await waitForMemberStatus(page.request, email, 'paid');

        const portalAccountPage = await openPortalAsMember(page, email);

        await expect(portalAccountPage.title).toBeVisible();
        await expect(portalAccountPage.emailText(email)).toBeVisible();
        await expect(portalAccountPage.planPrice('$5.00/month')).toBeVisible();
        await expect(portalAccountPage.billingInfoHeading).toBeVisible();
        await expect(portalAccountPage.cardLast4('4242')).toBeVisible();
    });

    test('cancel-at-period-end webhook - shows canceled state in portal', async ({page, stripe}) => {
        const email = `portal-cancel-${Date.now()}@example.com`;
        const {subscription} = await stripe!.createPaidMemberViaWebhooks({email, name: 'Portal Cancel Member'});

        await waitForMemberStatus(page.request, email, 'paid');
        await stripe!.cancelSubscription({subscription});
        await waitForCanceledSubscription(page.request, email);

        const portalAccountPage = await openPortalAsMember(page, email);

        await expect(portalAccountPage.cancellationNotice).toBeVisible();
        await expect(portalAccountPage.resumeSubscriptionButton).toBeVisible();
        await expect(portalAccountPage.canceledBadge).toBeVisible();
    });

    test('subscription-deleted webhook - shows free membership in portal', async ({page, stripe}) => {
        const email = `portal-free-${Date.now()}@example.com`;
        const {subscription} = await stripe!.createPaidMemberViaWebhooks({email, name: 'Portal Free Member'});

        await waitForMemberStatus(page.request, email, 'paid');
        await stripe!.deleteSubscription({subscription});
        await waitForMemberStatus(page.request, email, 'free');

        const portalAccountPage = await openPortalAsMember(page, email);

        await expect(portalAccountPage.title).toBeVisible();
        await expect(portalAccountPage.emailText(email)).toBeVisible();
        await expect(portalAccountPage.emailNewsletterHeading).toBeVisible();
        await expect(portalAccountPage.billingInfoHeading).toHaveCount(0);
        await expect(portalAccountPage.planPrice('$5.00/month')).toHaveCount(0);
    });
});
