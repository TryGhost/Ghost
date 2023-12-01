import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Facebook settings', async () => {
    test('Supports editing the facebook card', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('facebook');

        await section.getByRole('button', {name: 'Edit'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="facebook-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.locator('img[src="http://example.com/image.png"]')).toBeVisible();

        await section.getByLabel('Facebook title').fill('Facetitle');
        await section.getByLabel('Facebook description').fill('Facescription');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Facebook title')).toHaveCount(0);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'og_image', value: 'http://example.com/image.png'},
                {key: 'og_title', value: 'Facetitle'},
                {key: 'og_description', value: 'Facescription'}
            ]
        });
    });
});
