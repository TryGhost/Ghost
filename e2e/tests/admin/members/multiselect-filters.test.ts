import {Member, MemberFactory, createMemberFactory, createOfferFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {PortalOfferPage} from '@/portal-pages';
import {PublicPage} from '@/public-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {StripeTestService} from '@/helpers/services/stripe';
import {completeOfferSignupViaPortal, createPaidPortalTier, expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';
import type {APIRequestContext, Page} from '@playwright/test';

usePerTestIsolation();

async function seedMembersAndNavigate(
    memberFactory: MemberFactory,
    page: Page,
    members: Partial<Member>[]
): Promise<MembersListPage> {
    await memberFactory.createMany(members);
    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await expect(membersPage.memberRows).toHaveCount(members.length);
    return membersPage;
}

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

test.describe('Ghost Admin - Members Label Multiselect Filter', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('opens label filter and selects a label to filter members', async ({page}) => {
        const membersPage = await seedMembersAndNavigate(memberFactory, page, [
            {name: 'VIP Member', email: 'vip@example.com', labels: ['VIP']},
            {name: 'Regular Member', email: 'regular@example.com'}
        ]);

        await membersPage.addMultiselectFilter('Label', ['VIP']);

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('VIP Member')).toBeVisible();
    });

    test('selects multiple labels to filter members by any matching label', async ({page}) => {
        const membersPage = await seedMembersAndNavigate(memberFactory, page, [
            {name: 'Both Labels', email: 'both@example.com', labels: ['VIP', 'Premium']},
            {name: 'VIP Only', email: 'vip@example.com', labels: ['VIP']},
            {name: 'Premium Only', email: 'premium@example.com', labels: ['Premium']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        await membersPage.addMultiselectFilter('Label', ['VIP', 'Premium']);

        await expect(membersPage.memberRows).toHaveCount(3);
        await expect(membersPage.getMemberByName('Both Labels')).toBeVisible();
        await expect(membersPage.getMemberByName('VIP Only')).toBeVisible();
        await expect(membersPage.getMemberByName('Premium Only')).toBeVisible();
    });

    test('searches for a label in the combobox and selects it', async ({page}) => {
        const membersPage = await seedMembersAndNavigate(memberFactory, page, [
            {name: 'Targeted Member', email: 'targeted@example.com', labels: ['Searchable-Label']},
            {name: 'Other Member', email: 'other@example.com', labels: ['Different-Label']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        await membersPage.filterButton.click();
        await page.getByRole('option', {name: 'Label', exact: true}).click();

        await membersPage.searchMultiselectOptions('Searchable');
        await page.getByRole('option', {name: 'Searchable-Label', exact: true}).click();

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Targeted Member')).toBeVisible();
    });

    test('deselects a label from the combobox to update results', async ({page}) => {
        const membersPage = await seedMembersAndNavigate(memberFactory, page, [
            {name: 'VIP Member', email: 'vip@example.com', labels: ['VIP']},
            {name: 'Premium Member', email: 'premium@example.com', labels: ['Premium']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        await membersPage.addMultiselectFilter('Label', ['VIP', 'Premium']);
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openFilterValue('Label');
        await membersPage.selectMultiselectOption('VIP');
        await page.keyboard.press('Escape');

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Premium Member')).toBeVisible();
    });

    test('edits a label name inline from the filter combobox', async ({page}) => {
        const membersPage = await seedMembersAndNavigate(memberFactory, page, [
            {name: 'Labelled Member', email: 'labelled@example.com', labels: ['Old-Name']},
            {name: 'Other Member', email: 'other@example.com'}
        ]);

        await membersPage.addMultiselectFilter('Label', ['Old-Name']);
        await membersPage.openFilterValue('Label');

        await page.getByRole('button', {name: 'Edit label Old-Name'}).click();

        await membersPage.editLabelInput.fill('New-Name');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        await expect(page.getByRole('option', {name: /New-Name/})).toBeVisible();
    });

    test('deletes a label inline from the filter combobox with confirmation', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Labelled Member', email: 'labelled@example.com', labels: ['Delete-Me']},
            {name: 'Other Member', email: 'other@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await membersPage.addMultiselectFilter('Label', ['Delete-Me']);
        await membersPage.openFilterValue('Label');

        await page.getByRole('button', {name: 'Edit label Delete-Me'}).click();

        await page.getByRole('button', {name: 'Delete', exact: true}).click();
        await page.getByRole('button', {name: 'Delete', exact: true}).click();

        await expect(page.getByRole('option', {name: /Delete-Me/})).toBeHidden();
    });
});

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
