import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, mockSitePreview, responseFixtures} from '../../utils/e2e';

test.describe('Design settings', async () => {
    test('Working with the preview', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: responseFixtures.customThemeSettings},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });
        await mockSitePreview({
            page,
            url: responseFixtures.latestPost.posts[0].url,
            response: '<html><head><style></style></head><body><div>post preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        // Homepage and post preview

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByTestId('design-toolbar').getByRole('tab', {name: 'Post'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('post preview')).toHaveCount(1);

        // Desktop and mobile preview

        await modal.getByRole('button', {name: 'Mobile'}).click();

        await expect(modal.getByTestId('preview-mobile')).toBeVisible();

        await modal.getByRole('button', {name: 'Desktop'}).click();

        await expect(modal.getByTestId('preview-mobile')).not.toBeVisible();

        // Switching preview based on settings tab

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Homepage'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Post'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('post preview')).toHaveCount(1);
    });

    test('Editing brand settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings},
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: responseFixtures.customThemeSettings},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        const lastPreviewRequest = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByLabel('Site description').fill('new description');
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastPreviewRequest.previewHeader).toMatch(/&d=new\+description&/);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'description', value: 'new description'}
            ]
        });
    });

    test('Editing custom theme settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editCustomThemeSettings: {method: 'PUT', path: '/custom_theme_settings/', response: responseFixtures.customThemeSettings},
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: {
                custom_theme_settings: [{
                    type: 'select',
                    options: [
                        'Logo on cover',
                        'Logo in the middle',
                        'Stacked'
                    ],
                    default: 'Logo on cover',
                    id: '648047658d265b0c8b33c591',
                    value: 'Stacked',
                    key: 'navigation_layout'
                }]
            }},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        const lastPreviewRequest = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByRole('tab', {name: 'Site wide'}).click();

        await modal.getByLabel('Navigation layout').selectOption('Logo in the middle');
        await modal.getByRole('button', {name: 'Save'}).click();

        const expectedSettings = {navigation_layout: 'Logo in the middle'};
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify(expectedSettings)]]).toString();
        expect(lastPreviewRequest.previewHeader).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));

        expect(lastApiRequests.editCustomThemeSettings?.body).toMatchObject({
            custom_theme_settings: [
                {key: 'navigation_layout', value: 'Logo in the middle'}
            ]
        });
    });
});
