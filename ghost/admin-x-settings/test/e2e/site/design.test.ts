import {expect, test} from '@playwright/test';
import {mockApi} from '../../utils/e2e';

test.describe('Theme settings', async () => {
    test('Editing brand settings', async ({page}) => {
        const lastApiRequest = await mockApi({page, responses: {
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

        expect(lastApiRequest.body).toEqual({
            settings: [
                {key: 'description', value: 'new description'}
            ]
        });
    });

    test('Editing custom theme settings', async ({page}) => {
        const lastApiRequest = await mockApi({page});

        await page.goto('/');

        const section = page.getByTestId('design');

        await section.getByRole('button', {name: 'Customize'}).click();

        const modal = page.getByTestId('design-modal');

        await modal.getByRole('tab', {name: 'Site wide'}).click();

        await modal.getByLabel('Navigation layout').selectOption('Logo in the middle');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).not.toBeVisible();

        expect(lastApiRequest.body).toMatchObject({
            custom_theme_settings: [
                {key: 'navigation_color'},
                {key: 'navigation_background_image'},
                {key: 'navigation_layout', value: 'Logo in the middle'},
                {key: 'show_publication_cover'},
                {key: 'email_signup_text'}
            ]
        });
    });
});
