import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, toggleLabsFlag, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Ghost Explore', () => {
    test.beforeEach(async () => {
        toggleLabsFlag('ui60', true);
    });

    test('can join Ghost Explore', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'explore_ping', value: false},
                        {key: 'explore_ping_growth', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'explore_ping', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('explore');
        await expect(section).toBeVisible();

        // Main toggle should be off
        const mainToggle = section.getByTestId('explore-toggle');
        await expect(mainToggle).not.toBeChecked();

        // Enable Ghost Explore
        await mainToggle.click();

        // Verify the API call to enable explore_ping
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{key: 'explore_ping', value: true}]
        });
    });

    test('can choose to share growth data', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'explore_ping', value: true},
                        {key: 'explore_ping_growth', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'explore_ping_growth', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('explore');
        await expect(section).toBeVisible();

        // Main toggle should be on
        const mainToggle = section.getByTestId('explore-toggle');
        await expect(mainToggle).toBeChecked();

        // Preview should be visible
        const preview = section.getByTestId('explore-preview');
        await expect(preview).toBeVisible();
        await expect(preview.getByText('Preview')).toBeVisible();
        await expect(preview.getByText('Test Site')).toBeVisible();
        await expect(preview.getByText('Thoughts, stories and ideas')).toBeVisible();
        await expect(preview.getByText('test.com')).toBeVisible();

        // Growth data toggle should be visible and off
        const growthDataToggle = section.getByTestId('explore-growth-toggle');
        await expect(growthDataToggle).toBeVisible();
        await expect(growthDataToggle).not.toBeChecked();

        // Turn on growth data sharing
        await growthDataToggle.click();

        // Verify the API call to disable explore_ping_growth
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{key: 'explore_ping_growth', value: true}]
        });
    });
});
