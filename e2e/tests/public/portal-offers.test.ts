import {OffersService} from '@/helpers/services/offers/offers-service';
import {PublicPage} from '@/helpers/pages';
import {createPaidPortalTier, expect, test} from '@/helpers/playwright';

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
});
