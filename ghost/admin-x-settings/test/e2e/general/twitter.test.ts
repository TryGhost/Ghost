import {expect, test} from '@playwright/test';
import {mockApi} from '../../utils/e2e';

test.describe('Twitter settings', async () => {
    test('Supports editing the twitter card', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            images: {
                upload: {images: [{url: 'http://example.com/image.png', ref: null}]}
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('twitter');

        await section.getByRole('button', {name: 'Edit'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="twitter-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.getByRole('img')).toBeVisible();

        await section.getByLabel('Twitter title').fill('Twititle');
        await section.getByLabel('Twitter description').fill('Twitscription');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Twitter title')).toHaveCount(0);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'twitter_image', value: 'http://example.com/image.png'},
                {key: 'twitter_title', value: 'Twititle'},
                {key: 'twitter_description', value: 'Twitscription'}
            ]
        });
    });
});
