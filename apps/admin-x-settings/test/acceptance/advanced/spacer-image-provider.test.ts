import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import type {Page} from '@playwright/test';

test.describe('Spacer image provider settings', async () => {
    const openSpacerImageProviderSettings = async (page: Page) => {
        await page.goto('/');
        await page.getByPlaceholder('Search settings').fill('spacer');
        return page.getByTestId('spacer-image-provider');
    };

    test('Shows the spacer image provider in the Advanced sidebar', async ({page}) => {
        await mockApi({page, requests: globalDataRequests});

        await page.goto('/');
        await page.getByPlaceholder('Search settings').fill('spacer');

        const navItem = page.getByText('Video spacer images').first();
        await expect(navItem).toBeVisible();

        await navItem.click();
        await expect(page.getByTestId('spacer-image-provider')).toBeInViewport();
    });

    test('Supports saving the default spacer image provider', async ({page}) => {
        const defaultTemplate = 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png';
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'spacer_image_url_template', value: defaultTemplate}
            ])}
        }});

        const section = await openSpacerImageProviderSettings(page);

        await section.getByLabel('Disable spacer images').check();
        await section.getByLabel('Use Ghost default spacer images').check();
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'spacer_image_url_template', value: defaultTemplate}
            ]
        });
        await expect(section.getByRole('button', {name: 'Saved'})).toBeVisible();
        await expect(section.getByLabel('Use Ghost default spacer images')).toBeChecked();
    });

    test('Supports disabling the spacer image provider', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'spacer_image_url_template', value: null}
            ])}
        }});

        const section = await openSpacerImageProviderSettings(page);

        await section.getByLabel('Disable spacer images').check();
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'spacer_image_url_template', value: ''}
            ]
        });
        await expect(section.getByRole('button', {name: 'Saved'})).toBeVisible();
        await expect(section.getByLabel('Disable spacer images')).toBeChecked();

        await page.getByTestId('exit-settings').click();
        await expect(page.getByRole('heading', {name: 'Are you sure you want to leave this page?'})).not.toBeVisible();
    });
});
