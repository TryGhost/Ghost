import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Twitter settings', async () => {
    test('Supports editing the twitter card', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('twitter');

        await section.getByRole('button', {name: 'Edit'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="twitter-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.locator('img[src="http://example.com/image.png"]')).toBeVisible();

        await section.getByLabel('X title').fill('Twititle');
        await section.getByLabel('X description').fill('Twitscription');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Twitter title')).toHaveCount(0);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'twitter_image', value: 'http://example.com/image.png'},
                {key: 'twitter_title', value: 'Twititle'},
                {key: 'twitter_description', value: 'Twitscription'}
            ]
        });
    });
});
