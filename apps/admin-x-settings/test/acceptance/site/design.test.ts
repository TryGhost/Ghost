import {
    chooseOptionInSelect,
    mockApi,
    mockSitePreview,
    responseFixtures,
    toggleLabsFlag,
    updatedSettingsResponse
} from '@tryghost/admin-x-framework/test/acceptance';
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

        const accentColorPicker = modal.getByTestId('accent-color-picker');
        await accentColorPicker.getByRole('button').click();
        await accentColorPicker.getByRole('textbox').fill('#cd5786');
        // set timeout of 1000ms to wait for the debounce
        await page.waitForTimeout(1000);
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();

        // Custom theme setting

        await section.getByRole('button', {name: 'Customize'}).click();

        await modal.getByTestId('design-setting-tabs').getByRole('tab', {name: 'Theme'}).click();

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
        await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await expect(modal.frameLocator('[data-testid="theme-preview"] iframe[data-visible=true]').getByText('homepage preview')).toHaveCount(1);

        const accentColorPicker = modal.getByTestId('accent-color-picker');
        await accentColorPicker.getByRole('button').click();
        await accentColorPicker.getByRole('textbox').fill('#cd5786');

        const previewHeaders = await page.waitForRequest((request) => {
            const headers = request.headers();
            return headers['x-ghost-preview'] !== undefined;
        });

        const matchingHeader = previewHeaders.headers()['x-ghost-preview'];
        expect(matchingHeader).toContain('cd5786');
        await expect(modal.getByTestId('toggle-unsplash-button')).toBeVisible();
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'accent_color', value: '#cd5786'}
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
        const {previewRequests} = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByRole('tab', {name: 'Theme'}).click();
        await chooseOptionInSelect(modal.getByTestId('setting-select-navigation_layout'), 'Logo in the middle');
        const expectedSettings = {navigation_layout: 'Logo in the middle'};
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify(expectedSettings)]]).toString();

        const matchingHeader = previewRequests.find(header => new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`).test(header));

        expect(matchingHeader).toBeDefined();

        await modal.getByRole('button', {name: 'Save'}).click();
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
        await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();
        const previewHeaders = await page.waitForRequest((request) => {
            const headers = request.headers();
            return headers['x-ghost-preview'] !== undefined;
        });
        const previewHeader = previewHeaders.headers()['x-ghost-preview'];
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify({})]]).toString();
        expect(previewHeader).toContain(expectedEncoded);

        const modal = page.getByTestId('design-modal');

        const designSettingTabs = modal.getByTestId('design-setting-tabs');

        await expect(designSettingTabs.getByRole('tab', {name: 'Brand'})).toBeHidden();
        await expect(designSettingTabs.getByRole('tab', {name: 'Theme'})).toBeHidden();

        await expect(designSettingTabs.getByTestId('accent-color-picker')).toBeVisible();
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
        const {previewRequests} = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByRole('tab', {name: 'Theme'}).click();

        const showFeaturedPostsCustomThemeSetting = modal.getByLabel('Show featured posts');

        await expect(showFeaturedPostsCustomThemeSetting).toBeVisible();

        await chooseOptionInSelect(modal.getByTestId('setting-select-navigation_layout'), 'Logo in the middle');
        // set timeout of 1000ms to wait for the debounce
        // await page.waitForTimeout(1000);

        const expectedSettings = {navigation_layout: 'Logo in the middle', show_featured_posts: null};
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify(expectedSettings)]]).toString();

        const matchingHeader = previewRequests.find(header => header.includes(expectedEncoded));

        expect(matchingHeader).toBeDefined();
        await expect(showFeaturedPostsCustomThemeSetting).not.toBeVisible();

        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editCustomThemeSettings?.body).toMatchObject({
            custom_theme_settings: [
                {key: 'navigation_layout', value: 'Logo in the middle'},
                {key: 'show_featured_posts', value: 'false'}
            ]
        });
    });

    test('Custom fonts', async ({page}) => {
        toggleLabsFlag('customFonts', true);
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: {
                custom_theme_settings: []
            }},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        const {lastRequest} = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        const designSettingTabs = modal.getByTestId('design-setting-tabs');

        await expect(designSettingTabs.getByTestId('accent-color-picker')).toBeVisible();

        await expect(designSettingTabs.getByText('Typography')).toBeVisible();
        await expect(designSettingTabs.getByTestId('heading-font-select')).toBeVisible();
        await expect(designSettingTabs.getByTestId('body-font-select')).toBeVisible();

        // select a different heading font
        const headingFontSelect = designSettingTabs.getByTestId('heading-font-select');
        await headingFontSelect.click();
        await headingFontSelect.getByText('Cardo').click();

        // select a different body font
        const bodyFontSelect = designSettingTabs.getByTestId('body-font-select');
        await bodyFontSelect.click();
        await bodyFontSelect.getByText('Inter').click();

        const expectedEncoded = new URLSearchParams([['bf', 'Inter'], ['hf', 'Cardo']]).toString();

        await expect(lastRequest.previewHeader).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));
    });

    test('Custom fonts setting back to default', async ({page}) => {
        toggleLabsFlag('customFonts', true);
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: updatedSettingsResponse([
                {key: 'heading_font', value: 'Caro'},
                {key: 'body_font', value: 'Inter'}
            ])},
            browseCustomThemeSettings: {method: 'GET', path: '/custom_theme_settings/', response: {
                custom_theme_settings: []
            }},
            browseLatestPost: {method: 'GET', path: /^\/posts\/.+limit=1/, response: responseFixtures.latestPost}
        }});
        const {previewRequests} = await mockSitePreview({
            page,
            url: responseFixtures.site.site.url,
            response: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
        });

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        // The fonts should be set to the values in the settings
        await expect(modal.getByTestId('heading-font-select')).toHaveText('Caro');
        await expect(modal.getByTestId('body-font-select')).toHaveText('Inter');

        const designSettingTabs = modal.getByTestId('design-setting-tabs');
        // select a different heading font
        const headingFontSelect = designSettingTabs.getByTestId('heading-font-select');
        await headingFontSelect.click();
        await headingFontSelect.getByText('Theme default').click();

        // select a different body font
        const bodyFontSelect = designSettingTabs.getByTestId('body-font-select');
        await bodyFontSelect.click();
        await bodyFontSelect.getByText('Theme default').click();

        const expectedEncoded = new URLSearchParams([['bf', ''], ['hf', '']]).toString();

        const matchingHeader = previewRequests.find(header => header.includes(expectedEncoded));
        expect(matchingHeader).toBeDefined();
        // expect(lastRequest.previewHeader).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));
    });
});
