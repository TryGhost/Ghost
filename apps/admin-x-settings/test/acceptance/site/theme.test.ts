import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Theme settings', async () => {
    test('Browsing and installing default themes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            installTheme: {method: 'POST', path: /^\/themes\/install\/\?/, response: {
                themes: [{
                    name: 'headline',
                    package: {},
                    active: false,
                    templates: []
                }]
            }},
            activateTheme: {method: 'PUT', path: '/themes/headline/activate/', response: {
                themes: [{
                    name: 'headline',
                    package: {},
                    active: true,
                    templates: []
                }]
            }},
            activeTheme: {
                method: 'GET',
                path: '/themes/active/',
                response: {
                    themes: [{
                        name: 'casper',
                        package: {},
                        active: true,
                        templates: []
                    }]
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        // The default theme is always considered "installed"

        await modal.getByRole('button', {name: /Casper/}).click();

        await expect(modal.getByRole('button', {name: 'Activate Casper'})).toBeVisible();

        await expect(page.locator('iframe[title="Theme preview"]')).toHaveAttribute('src', 'https://demo.ghost.io/');

        await modal.getByRole('button', {name: 'Change theme'}).click();

        // Try installing another theme

        await modal.getByRole('button', {name: /Headline/}).click();

        await modal.getByRole('button', {name: 'Install Headline'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/installed/);

        await page.getByRole('button', {name: 'Activate'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/headline is now your active theme/);

        expect(lastApiRequests.installTheme?.url).toMatch(/\?source=github&ref=TryGhost%2FHeadline/);
    });

    test('Managing installed themes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            activateTheme: {method: 'PUT', path: '/themes/casper/activate/', response: {
                themes: [{
                    ...responseFixtures.themes.themes.find(theme => theme.name === 'casper')!,
                    active: true
                }]
            }},
            deleteTheme: {method: 'DELETE', path: '/themes/edition/', response: {}}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

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

        expect(lastApiRequests.activateTheme?.url).toMatch(/\/themes\/casper\/activate\//);

        // Download the active theme

        await casper.getByRole('button', {name: 'Menu'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Download'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/api\/admin\/themes\/casper\/download/);

        // Delete the inactive theme

        await edition.getByRole('button', {name: 'Menu'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Delete'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Delete'}).click();

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(1);

        expect(lastApiRequests.deleteTheme?.url).toMatch(/\/themes\/edition\/$/);
    });

    test('Uploading a new theme', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            uploadTheme: {method: 'POST', path: '/themes/upload/', response: {
                themes: [{
                    name: 'mytheme',
                    package: {},
                    active: false,
                    templates: []
                }]
            }}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.getByTestId('confirmation-modal').locator('label[for=theme-upload]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/responses/theme.zip`);

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/successful/);

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(3);

        expect(lastApiRequests.uploadTheme).toBeTruthy();
    });

    test('Limits uploading new themes and redirect to /pro', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper'],
                                    error: 'Upgrade to enable custom themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to enable custom themes/);

        const limitModal = page.getByTestId('limit-modal');

        await limitModal.getByRole('button', {name: 'Upgrade'}).click();

        // The route should be updated
        const newPageUrl = page.url();
        const newPageUrlObject = new URL(newPageUrl);
        const decodedUrl = decodeURIComponent(newPageUrlObject.pathname);

        // expect the route to be updated to /pro
        await expect(decodedUrl).toMatch(/\/\{\"route\":\"\/pro\",\"isExternal\":true\}$/);
    });

    test('Prevents overwriting the default theme', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            uploadTheme: {method: 'POST', path: '/themes/upload/', response: {
                themes: [{
                    name: 'mytheme',
                    package: {},
                    active: false,
                    templates: []
                }]
            }}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.getByTestId('confirmation-modal').locator('label[for=theme-upload]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/responses/source.zip`);

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/Upload failed/);
    });

    test('fires Install Theme modal when redirected from markerplace url', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes}
        }});
        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        await page.waitForSelector('[data-testid="theme-modal"]');

        const confirmation = page.getByTestId('confirmation-modal');

        await expect(confirmation).toHaveText(/Install Theme/);
        await expect(confirmation).toHaveText(/By clicking below, Taste will automatically be activated as the theme for your site/);
    });
});
