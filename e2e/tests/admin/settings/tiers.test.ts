import {HomePage} from '@/helpers/pages';
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

        // Open Portal settings and verify the tier is visible but unchecked
        await settingsPage.portalSection.openCustomizeModal();
        const tierCheckbox = settingsPage.portalSection.portalModal.getByLabel(tierName).first();
        await tierCheckbox.waitFor();
        await expect(tierCheckbox).not.toBeChecked();
    });

    test('update tier - changes reflected in portal on public site', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        const tierName = `Test Tier ${Date.now()}`;
        const tierSlug = slugify(tierName);
        const updatedName = `Updated Tier ${Date.now()}`;
        const updatedDescription = 'Updated description text';
        const updatedMonthlyPrice = '66';
        const updatedYearlyPrice = '666';

        // Create a tier and enable in portal
        await settingsPage.goto();
        await settingsPage.tiersSection.createTier({
            name: tierName,
            monthlyPrice: '5',
            yearlyPrice: '50'
        });
        await settingsPage.tiersSection.enableTierInPortal(tierName);

        // Update the tier
        await settingsPage.tiersSection.openTierModal(tierSlug);
        await settingsPage.tiersSection.editTier({
            name: updatedName,
            description: updatedDescription,
            monthlyPrice: updatedMonthlyPrice,
            yearlyPrice: updatedYearlyPrice
        });

        // Go to public site and open Portal
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openPortal();

        // Find the updated tier card in portal frame
        const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
        const tierCard = portalFrame.locator('[data-test-tier="paid"]').filter({hasText: updatedName}).first();
        await expect(tierCard).toBeVisible();

        // Check yearly price and description
        await portalFrame.getByTestId('yearly-switch').click();
        await expect(tierCard.getByTestId('product-amount')).toHaveText(updatedYearlyPrice);
        await expect(tierCard.getByTestId('product-description')).toHaveText(updatedDescription);

        // Check monthly price
        await portalFrame.getByTestId('monthly-switch').click();
        await expect(tierCard.getByTestId('product-amount')).toHaveText(updatedMonthlyPrice);
    });

    test('archive and unarchive tier - tier moves between active and archived tabs', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        const tierName = `Archive Tier ${Date.now()}`;
        const tierSlug = slugify(tierName);

        // Create a tier
        await settingsPage.goto();
        await settingsPage.tiersSection.createTier({
            name: tierName,
            monthlyPrice: '5',
            yearlyPrice: '50'
        });

        // Archive the tier
        await settingsPage.tiersSection.archiveTier(tierSlug);

        // Archived tier should not be in active tiers
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeHidden();

        // Archived tier should appear in the archived tab
        await settingsPage.tiersSection.archivedTab.click();
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeVisible();

        // Archived tier should not be in portal settings
        await settingsPage.portalSection.openCustomizeModal();
        await settingsPage.portalSection.portalModal.getByRole('checkbox').first().waitFor();
        await expect(settingsPage.portalSection.portalModal.getByLabel(tierName).first()).toBeHidden();
        await settingsPage.portalSection.portalModal.getByRole('button', {name: 'Close'}).click();

        // Unarchive the tier
        await settingsPage.tiersSection.unarchiveTier(tierSlug);

        // Unarchived tier should be back in active tiers
        await settingsPage.tiersSection.activeTab.click();
        await expect(settingsPage.tiersSection.tierCard(tierSlug)).toBeVisible();

        // Unarchived tier should be back in portal settings
        await settingsPage.portalSection.openCustomizeModal();
        await settingsPage.portalSection.portalModal.getByRole('checkbox').first().waitFor();
        await expect(settingsPage.portalSection.portalModal.getByLabel(tierName).first()).toBeVisible();
        await settingsPage.portalSection.portalModal.getByRole('button', {name: 'Close'}).click();
    });
});
