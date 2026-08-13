import {FakeStripeCheckoutPage, PortalGiftPage} from '@/helpers/pages';
import {createPaidPortalTier, expect, test} from '@/helpers/playwright';

test.describe('Ghost Public - Portal Gifts', () => {
    test.use({
        labs: {giftSubCustomization: true},
        stripeEnabled: true
    });

    test('a buyer completes a 3-month gift through Stripe checkout', async ({page, stripe}) => {
        const tierName = `Three Month Gift ${Date.now()}`;
        await createPaidPortalTier(page.request, {
            name: tierName,
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        }, {stripe: stripe!});

        await page.goto('/#/portal/gift');

        const portalGiftPage = new PortalGiftPage(page);
        await portalGiftPage.waitForPortalToOpen();
        const buyerEmail = `gift-buyer-${Date.now()}@example.com`;

        await portalGiftPage.buyerEmailInput.fill(buyerEmail);
        await portalGiftPage.durationOption('3 months').click();
        const tier = portalGiftPage.tierOption(tierName);
        await tier.click();

        await expect(tier).toContainText('$15');
        await expect(portalGiftPage.giftCardValue).toHaveText('$15');
        await portalGiftPage.continueButton.click();

        const checkoutPage = new FakeStripeCheckoutPage(page);
        await checkoutPage.waitUntilPaymentReady();
        await expect(checkoutPage.totalAmount).toHaveText('$15.00');
        await checkoutPage.submitPayment();
        await stripe!.completeLatestGiftCheckout({
            email: buyerEmail,
            name: 'Test Gift Buyer'
        });

        const checkoutSession = stripe!.getCheckoutSessions().at(-1);
        expect(checkoutSession).toBeDefined();

        await page.goto(checkoutSession!.response.success_url);
        await portalGiftPage.waitForPortalToOpen();

        await expect(portalGiftPage.successTitle).toBeVisible();
        await expect(portalGiftPage.giftCardDuration).toHaveText('3 months');
        await expect(portalGiftPage.giftRedeemLink).toContainText('/gift/');
    });
});
