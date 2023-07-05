import {expect, test} from '@playwright/test';
import {mockApi} from '../../utils/e2e';

test.describe('Design settings', async () => {
    test('Working with the preview', async ({page}) => {
        await mockApi({page, responses: {
            previewHtml: {
                homepage: '<html><head><style></style></head><body><div>homepage preview</div></body></html>',
                post: '<html><head><style></style></head><body><div>post preview</div></body></html>'
            }
        }});

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
        const lastApiRequests = await mockApi({page, responses: {
            previewHtml: {
                homepage: '<html><head><style></style></head><body><div>homepage preview</div></body></html>'
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await expect(modal.frameLocator('[data-testid="theme-preview"]').getByText('homepage preview')).toHaveCount(1);

        await modal.getByLabel('Site description').fill('new description');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        expect(lastApiRequests.previewHtml.homepage.headers?.['x-ghost-preview']).toMatch(/&d=new\+description&/);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'description', value: 'new description'}
            ]
        });
    });

    test('Editing custom theme settings', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            customThemeSettings: {
                browse: {
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
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByRole('tab', {name: 'Site wide'}).click();

        await modal.getByLabel('Navigation layout').selectOption('Logo in the middle');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        const expectedSettings = {navigation_layout: 'Logo in the middle'};
        const expectedEncoded = new URLSearchParams([['custom', JSON.stringify(expectedSettings)]]).toString();
        expect(lastApiRequests.previewHtml.homepage.headers?.['x-ghost-preview']).toMatch(new RegExp(`&${expectedEncoded.replace(/\+/g, '\\+')}`));

        expect(lastApiRequests.customThemeSettings.edit.body).toMatchObject({
            custom_theme_settings: [
                {key: 'navigation_layout', value: 'Logo in the middle'}
            ]
        });
    });
});
