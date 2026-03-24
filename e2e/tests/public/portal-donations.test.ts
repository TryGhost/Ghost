import {
    FakeStripeCheckoutPage,
    HomePage,
    SignUpPage,
    SupportNotificationPage,
    SupportSuccessPage
} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {
    completeDonationViaFakeCheckout,
    expect,
    signInAsMember,
    test
} from '@/helpers/playwright';
import {createMemberFactory} from '@/data-factory';

test.describe('Ghost Public - Portal Donations', () => {
    test.use({stripeEnabled: true});

    test('anonymous donation completes in portal - shows donation success page', async ({page, stripe}) => {
        const homePage = new HomePage(page);
        await homePage.gotoPortalSupport();

        const checkoutPage = new FakeStripeCheckoutPage(page);
        await checkoutPage.waitUntilDonationReady();
        await expect(checkoutPage.totalAmount).toHaveText('$5.00');

        await completeDonationViaFakeCheckout(page, stripe!, {
            amount: '12.50',
            email: `member-donation-${Date.now()}@ghost.org`,
            name: 'Test Member Donations'
        });

        const supportSuccessPage = new SupportSuccessPage(page);
        await supportSuccessPage.waitForPortalToOpen();
        await expect(supportSuccessPage.title).toBeVisible();

        await supportSuccessPage.signUpButton.click();

        const signUpPage = new SignUpPage(page);
        await expect(signUpPage.emailInput).toBeVisible();
    });

    test('free member donation completes in portal - shows donation notification', async ({page, stripe}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({
            email: `test.member.donations.${Date.now()}@example.com`,
            name: 'Test Member Donations',
            note: 'Test Member',
            status: 'free'
        });

        await signInAsMember(page, member);

        const homePage = new HomePage(page);
        await homePage.gotoPortalSupport();

        const checkoutPage = new FakeStripeCheckoutPage(page);
        await checkoutPage.waitUntilDonationReady();
        await expect(checkoutPage.emailInput).toHaveValue(member.email);

        await completeDonationViaFakeCheckout(page, stripe!, {
            amount: '12.50',
            name: member.name ?? 'Test Member Donations'
        });

        const notificationPage = new SupportNotificationPage(page);
        await expect(notificationPage.successMessage).toBeVisible();
    });

    test('fixed donation amount and currency open donation checkout - shows fixed euro amount', async ({page, stripe}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setDonationsSuggestedAmount(9800);
        await settingsService.setDonationsCurrency('EUR');

        const homePage = new HomePage(page);
        await homePage.gotoPortalSupport();

        const checkoutPage = new FakeStripeCheckoutPage(page);
        await checkoutPage.waitUntilDonationReady();
        await expect(checkoutPage.totalAmount).toHaveText('€98.00');

        await completeDonationViaFakeCheckout(page, stripe!, {
            email: `member-donation-fixed-${Date.now()}@ghost.org`,
            name: 'Fixed Amount Donor'
        });

        const supportSuccessPage = new SupportSuccessPage(page);
        await supportSuccessPage.waitForPortalToOpen();
        await expect(supportSuccessPage.title).toBeVisible();
    });
});
