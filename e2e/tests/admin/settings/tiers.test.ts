import {HomePage, SignUpPage} from '@/helpers/pages';
import {SettingsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

function slugify(name: string): string {
    return name.toLowerCase().split(' ').join('-');
}

test.describe('Ghost Admin - Tiers', () => {
    test.use({stripeEnabled: true});

    test('create tier not enabled in portal - tier visible but unchecked in portal settings', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        const tierName = `Test Tier ${Date.now()}`;

        await settingsPage.goto();
        await settingsPage.tiersSection.createTier({
            name: tierName,
            monthlyPrice: '100',
            yearlyPrice: '1000'
        });

        await settingsPage.portalSection.openCustomizeModal();
        await expect(settingsPage.portalSection.tierCheckbox(tierName)).not.toBeChecked();
    });

    test('update tier - changes reflected in portal on public site', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        const tierName = `Test Tier ${Date.now()}`;
        const tierSlug = slugify(tierName);
        const updatedName = `Updated Tier ${Date.now()}`;
        const updatedDescription = 'Updated description text';
        const updatedMonthlyPrice = '66';
        const updatedYearlyPrice = '666';

        await settingsPage.goto();
        await settingsPage.tiersSection.createTier({
            name: tierName,
            monthlyPrice: '5',
            yearlyPrice: '50'
        });
        await settingsPage.tiersSection.enableTierInPortal(tierName);

        await settingsPage.tiersSection.openTierModal(tierSlug);
        await settingsPage.tiersSection.editTier({
            name: updatedName,
            description: updatedDescription,
            monthlyPrice: updatedMonthlyPrice,
            yearlyPrice: updatedYearlyPrice
        });

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openPortal();

        const signUpPage = new SignUpPage(page);
        const tierCard = signUpPage.paidTierCardByName(updatedName);
        await expect(tierCard).toBeVisible();

        await signUpPage.switchCadence('yearly');
        await expect(signUpPage.tierAmount(tierCard)).toHaveText(updatedYearlyPrice);
        await expect(signUpPage.tierDescription(tierCard)).toHaveText(updatedDescription);

        await signUpPage.switchCadence('monthly');
        await expect(signUpPage.tierAmount(tierCard)).toHaveText(updatedMonthlyPrice);
    });

    test('archive and unarchive tier - tier moves between active and archived tabs', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        const tierName = `Archive Tier ${Date.now()}`;
        const tierSlug = slugify(tierName);

        await settingsPage.goto();
        await settingsPage.tiersSection.createTier({
            name: tierName,
            monthlyPrice: '5',
            yearlyPrice: '50'
        });

        await settingsPage.tiersSection.archiveTier(tierSlug);
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeHidden();

        await settingsPage.tiersSection.archivedTab.click();
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeVisible();

        await settingsPage.portalSection.openCustomizeModal();
        await expect(settingsPage.portalSection.tierCheckbox(tierName)).toBeHidden();
        await settingsPage.portalSection.closeCustomizeModal();

        await settingsPage.tiersSection.unarchiveTier(tierSlug);

        await settingsPage.tiersSection.activeTab.click();
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeVisible();

        await settingsPage.portalSection.openCustomizeModal();
        await expect(settingsPage.portalSection.tierCheckbox(tierName)).toBeVisible();
        await settingsPage.portalSection.closeCustomizeModal();
    });
});
