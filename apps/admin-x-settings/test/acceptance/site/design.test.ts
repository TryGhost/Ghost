import {chooseOptionInSelect, mockApi, mockSitePreview, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';

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

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByTestId('design-toolbar').getByRole('tab', {name: 'Post'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('post preview')).toHaveCount(1);

        // Desktop and mobile preview

        await modal.getByRole('button', {name: 'Mobile'}).click();

        await expect(modal.getByTestId('preview-mobile')).toBeVisible();

        await modal.getByRole('button', {name: 'Desktop'}).click();

        await expect(modal.getByTestId('preview-mobile')).not.toBeVisible();

        // Switching preview based on settings tab

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Homepage'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Post'}).click();

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('post preview')).toHaveCount(1);
    });

    test('Warns when leaving without saving', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings},
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: responseFixtures.customThemeSettings},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});

        await page.goto('/');

        const section = page.getByTestId('design');

        // Brand setting

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByLabel('Site description').fill('new description');
        // set timeout of 500ms to wait for the debounce
        await page.waitForTimeout(1000);
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();

        // Custom theme setting

        await section.getByRole('button', {name: 'Customize'}).click();

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Post'}).click();

        await modal.getByLabel('Email signup text').fill('test');

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();

        expect(lastApiRequests.editSettings).toBeUndefined();
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

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByLabel('Site description').fill('new description');
        await expect(modal.getByTestId('toggle-unsplash-button')).toBeVisible();
        // set timeout of 500ms to wait for the debounce
        await page.waitForTimeout(1000);
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

        await chooseOptionInSelect(modal.getByTestId('setting-select-navigation_layout'), 'Logo in the middle');
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

    test('Rendering with no custom theme settings', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: {
                custom_theme_settings: []
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

        await expect(modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Brand'})).toBeVisible();
        await expect(modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Site wide'})).toBeHidden();
        await expect(modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Homepage'})).toBeHidden();
        await expect(modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Post'})).toBeHidden();

        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify({})]]).toString();
        expect(lastPreviewRequest.previewHeader).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));
    });

    test('Custom theme setting visibility', async ({page}) => {
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
                }, {
                    type: 'boolean',
                    default: 'false',
                    id: '648047658d265b0c8b33c592',
                    value: 'false',
                    key: 'show_featured_posts',
                    visibility: 'navigation_layout:[Stacked]'
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

        const showFeaturedPostsCustomThemeSetting = modal.getByLabel('Show featured posts');

        await expect(showFeaturedPostsCustomThemeSetting).toBeVisible();

        await chooseOptionInSelect(modal.getByTestId('setting-select-navigation_layout'), 'Logo in the middle');

        await expect(showFeaturedPostsCustomThemeSetting).not.toBeVisible();

        await modal.getByRole('button', {name: 'Save'}).click();

        const expectedSettings = {navigation_layout: 'Logo in the middle', show_featured_posts: null};
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify(expectedSettings)]]).toString();
        expect(lastPreviewRequest.previewHeader).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));

        expect(lastApiRequests.editCustomThemeSettings?.body).toMatchObject({
            custom_theme_settings: [
                {key: 'navigation_layout', value: 'Logo in the middle'},
                {key: 'show_featured_posts', value: 'false'}
            ]
        });
    });
});
