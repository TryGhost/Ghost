import {MembersListPage} from '@/admin-pages';
import {PortalOfferPage} from '@/portal-pages';
import {PublicPage} from '@/public-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {StripeTestService} from '@/helpers/services/stripe';
import {completeOfferSignupViaPortal, createPaidPortalTier, expect, test} from '@/helpers/playwright';
import {createMemberFactory, createOfferFactory} from '@/data-factory';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';
import type {APIRequestContext, Page} from '@playwright/test';

usePerTestIsolation();

async function createOfferAndRedeem(page: Page, request: APIRequestContext, stripe: StripeTestService, opts: {
    offerName: string;
    offerCode: string;
    memberEmail: string;
    memberName: string;
}) {
    const offerFactory = createOfferFactory(request);
    const settingsService = new SettingsService(request);
    const suffix = Date.now();

    await settingsService.updateSettings([{key: 'portal_button', value: true}]);

    const tier = await createPaidPortalTier(request, {
        name: `Tier ${suffix}`,
        currency: 'usd',
        monthly_price: 600,
        yearly_price: 6000
    }, {stripe});

    const offer = await offerFactory.create({
        name: `${opts.offerName} ${suffix}`,
        code: `${opts.offerCode}-${suffix}`,
        cadence: 'month',
        amount: 10,
        duration: 'once',
        type: 'percent',
        tierId: tier.id
    });

    const publicPage = new PublicPage(page);
    await publicPage.gotoOfferCode(offer.code);
    const offerPage = new PortalOfferPage(page);
    await offerPage.waitForOfferPage();
    await completeOfferSignupViaPortal(page, stripe, {
        emailAddress: opts.memberEmail,
        name: opts.memberName
    });

    return {offer, suffix};
}

test.describe('Ghost Admin - Members Offer Multiselect Filter', () => {
    test.use({stripeEnabled: true});

    test('opens offer filter and selects an offer to filter members', async ({page, stripe}) => {
        const {suffix} = await createOfferAndRedeem(page, page.request, stripe!, {
            offerName: 'Summer Sale',
            offerCode: 'summer-sale',
            memberEmail: 'offer-member@example.com',
            memberName: 'Offer Member'
        });

        const memberFactory = createMemberFactory(page.request);
        await memberFactory.create({name: 'Free Member', email: 'free@example.com'});

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.addMultiselectFilter('Offer', [`Summer Sale ${suffix}`]);

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Offer Member')).toBeVisible();
    });

    test('searches for an offer in the combobox and selects it', async ({page, stripe}) => {
        const {suffix} = await createOfferAndRedeem(page, page.request, stripe!, {
            offerName: 'Unique-Searchable-Offer',
            offerCode: 'searchable-offer',
            memberEmail: 'search-member@example.com',
            memberName: 'Searched Member'
        });

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await membersPage.filterButton.click();
        await page.getByRole('option', {name: 'Offer', exact: true}).click();

        await membersPage.searchMultiselectOptions('Unique-Searchable');
        await page.getByRole('option', {name: `Unique-Searchable-Offer ${suffix}`, exact: true}).click();

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Searched Member')).toBeVisible();
    });
});
