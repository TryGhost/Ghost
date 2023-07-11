import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '../../utils/e2e';

test.describe('Theme settings', async () => {
    test('Browsing and installing default themes', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            themes: {
                install: {
                    themes: [{
                        name: 'headline',
                        package: {},
                        active: false,
                        templates: []
                    }]
                },
                activate: {
                    themes: [{
                        name: 'headline',
                        package: {},
                        active: true,
                        templates: []
                    }]
                }
            }
        }});

        await page.goto('/');

        const designSection = page.getByTestId('design');

        await designSection.getByRole('button', {name: 'Customize'}).click();

        const designModal = page.getByTestId('design-modal');

        await designModal.getByTestId('change-theme').click();

        const modal = page.getByTestId('theme-modal');

        // // The default theme is always considered "installed"

        await modal.getByRole('button', {name: /Casper/}).click();

        await expect(modal.getByRole('button', {name: 'Update Casper'})).toBeVisible();

        await expect(page.locator('iframe[title="Theme preview"]')).toHaveAttribute('src', 'https://demo.ghost.io/');

        await modal.getByRole('button', {name: 'Change theme'}).click();

        // Try installing another theme

        await modal.getByRole('button', {name: /Headline/}).click();

        await modal.getByRole('button', {name: 'Install Headline'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/successfully installed/);

        await page.getByRole('button', {name: 'Activate'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/headline is now your active theme/);

        expect(lastApiRequests.themes.install.url).toMatch(/\?source=github&ref=TryGhost%2FHeadline/);
    });

    test('Managing installed themes', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            themes: {
                activate: {
                    themes: [{
                        ...responseFixtures.themes.themes.find(theme => theme.name === 'casper')!,
                        active: true
                    }]
                }
            }
        }});

        await page.goto('/');

        const designSection = page.getByTestId('design');

        await designSection.getByRole('button', {name: 'Customize'}).click();

        const designModal = page.getByTestId('design-modal');

        await designModal.getByTestId('change-theme').click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('tab', {name: 'Installed'}).click();

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(2);

        const casper = modal.getByTestId('theme-list-item').filter({hasText: /casper/});
        const edition = modal.getByTestId('theme-list-item').filter({hasText: /edition/});

        // Activate the inactive theme

        await expect(casper.getByRole('button', {name: 'Activate'})).toBeVisible();
        await expect(edition).toHaveText(/Active/);

        await casper.getByRole('button', {name: 'Activate'}).click();

        await expect(casper).toHaveText(/Active/);
        await expect(edition.getByRole('button', {name: 'Activate'})).toBeVisible();

        expect(lastApiRequests.themes.activate.url).toMatch(/\/themes\/casper\/activate\//);

        // Download the active theme

        await casper.getByRole('button', {name: 'Menu'}).click();
        await casper.getByRole('button', {name: 'Download'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/api\/admin\/themes\/casper\/download/);

        await page.locator('[data-testid="menu-overlay"]:visible').click();

        // Delete the inactive theme

        await edition.getByRole('button', {name: 'Menu'}).click();
        await edition.getByRole('button', {name: 'Delete'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Delete'}).click();

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(1);

        expect(lastApiRequests.themes.delete.url).toMatch(/\/themes\/edition\/$/);
    });
});
