import {expect, test} from '@playwright/test';
import {mockApi} from '../../utils/e2e';

test.describe('Facebook settings', async () => {
    test('Supports editing the facebook card', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            images: {
                upload: {images: [{url: 'http://example.com/image.png', ref: null}]}
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('facebook');

        await section.getByRole('button', {name: 'Edit'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="facebook-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.getByRole('img')).toBeVisible();

        await section.getByLabel('Facebook title').fill('Facetitle');
        await section.getByLabel('Facebook description').fill('Facescription');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Facebook title')).toHaveCount(0);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'og_image', value: 'http://example.com/image.png'},
                {key: 'og_title', value: 'Facetitle'},
                {key: 'og_description', value: 'Facescription'}
            ]
        });
    });
});
