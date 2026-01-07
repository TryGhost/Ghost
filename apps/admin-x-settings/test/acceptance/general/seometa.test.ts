import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('SEO Meta settings', async () => {
    test('Supports editing metadata in Search tab', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'meta_title', value: 'Alternative title'},
                {key: 'meta_description', value: 'Alternative description'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('seometa');

        // Should start on the Search tab by default
        await section.getByLabel('Meta title').fill('Alternative title');
        await section.getByLabel('Meta description').fill('Alternative description');

        await section.getByRole('button', {name: 'Save'}).click();

        // With hideEditButton=true, fields remain visible but save should succeed
        await expect(section.getByLabel('Meta title')).toBeVisible();
        await expect(section.getByLabel('Meta title')).toHaveValue('Alternative title');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'meta_title', value: 'Alternative title'},
                {key: 'meta_description', value: 'Alternative description'}
            ]
        });
    });

    test('Supports editing Facebook card in Facebook tab', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('seometa');

        // Navigate to Facebook tab
        await section.getByRole('tab', {name: 'Facebook card'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="facebook-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.locator('img[src="http://example.com/image.png"]')).toBeVisible();

        await section.getByLabel('Facebook title').fill('Facetitle');
        await section.getByLabel('Facebook description').fill('Facescription');

        await section.getByRole('button', {name: 'Save'}).click();

        // With hideEditButton=true, fields remain visible but save should succeed
        await expect(section.getByLabel('Facebook title')).toBeVisible();
        await expect(section.getByLabel('Facebook title')).toHaveValue('Facetitle');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'og_image', value: 'http://example.com/image.png'},
                {key: 'og_title', value: 'Facetitle'},
                {key: 'og_description', value: 'Facescription'}
            ]
        });
    });

    test('Supports editing X card in X card tab', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('seometa');

        // Navigate to X card tab
        await section.getByRole('tab', {name: 'X card'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.locator('label[for="twitter-image"]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await expect(section.locator('img[src="http://example.com/image.png"]')).toBeVisible();

        await section.getByLabel('X title').fill('Twititle');
        await section.getByLabel('X description').fill('Twitscription');

        await section.getByRole('button', {name: 'Save'}).click();

        // With hideEditButton=true, fields remain visible but save should succeed
        await expect(section.getByLabel('X title')).toBeVisible();
        await expect(section.getByLabel('X title')).toHaveValue('Twititle');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'twitter_image', value: 'http://example.com/image.png'},
                {key: 'twitter_title', value: 'Twititle'},
                {key: 'twitter_description', value: 'Twitscription'}
            ]
        });
    });

    test('Supports editing all SEO meta data across tabs', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/facebook.png', ref: null}]}},
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');

        const section = page.getByTestId('seometa');

        // Edit metadata in Search tab (should be default)
        await section.getByLabel('Meta title').fill('SEO Title');
        await section.getByLabel('Meta description').fill('SEO Description');

        // Switch to Facebook tab and edit
        await section.getByRole('tab', {name: 'Facebook card'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('label[for="facebook-image"]').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/images/image.png`);

        await section.getByLabel('Facebook title').fill('FB Title');
        await section.getByLabel('Facebook description').fill('FB Description');

        // Switch to X card tab and edit
        await section.getByRole('tab', {name: 'X card'}).click();
        await section.getByLabel('X title').fill('X Title');
        await section.getByLabel('X description').fill('X Description');

        // Save all changes
        await section.getByRole('button', {name: 'Save'}).click();

        // With hideEditButton=true, fields remain visible but save should succeed
        // Verify fields maintain their values after save
        await section.getByRole('tab', {name: 'Search'}).click();
        await expect(section.getByLabel('Meta title')).toHaveValue('SEO Title');

        await section.getByRole('tab', {name: 'Facebook card'}).click();
        await expect(section.getByLabel('Facebook title')).toHaveValue('FB Title');

        await section.getByRole('tab', {name: 'X card'}).click();
        await expect(section.getByLabel('X title')).toHaveValue('X Title');

        // Check that all settings were saved in one request
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'meta_title', value: 'SEO Title'},
                {key: 'meta_description', value: 'SEO Description'},
                {key: 'og_image', value: 'http://example.com/facebook.png'},
                {key: 'og_title', value: 'FB Title'},
                {key: 'og_description', value: 'FB Description'},
                {key: 'twitter_title', value: 'X Title'},
                {key: 'twitter_description', value: 'X Description'}
            ]
        });
    });

    test('Tab navigation works correctly', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('seometa');
        const tabView = section.getByTestId('seo-tabview');

        // Should start on Search tab
        await expect(tabView.getByRole('tab', {name: 'Search'})).toHaveAttribute('aria-selected', 'true');
        await expect(section.getByLabel('Meta title')).toBeVisible();

        // Switch to Facebook tab
        await section.getByRole('tab', {name: 'Facebook card'}).click();
        await expect(tabView.getByRole('tab', {name: 'Facebook card'})).toHaveAttribute('aria-selected', 'true');
        await expect(section.getByLabel('Facebook title')).toBeVisible();
        await expect(section.getByLabel('Meta title')).toHaveCount(0);

        // Switch to X card tab
        await section.getByRole('tab', {name: 'X card'}).click();
        await expect(tabView.getByRole('tab', {name: 'X card'})).toHaveAttribute('aria-selected', 'true');
        await expect(section.getByLabel('X title')).toBeVisible();
        await expect(section.getByLabel('Facebook title')).toHaveCount(0);

        // Switch back to Search tab
        await section.getByRole('tab', {name: 'Search'}).click();
        await expect(tabView.getByRole('tab', {name: 'Search'})).toHaveAttribute('aria-selected', 'true');
        await expect(section.getByLabel('Meta title')).toBeVisible();
        await expect(section.getByLabel('X title')).toHaveCount(0);
    });
});
