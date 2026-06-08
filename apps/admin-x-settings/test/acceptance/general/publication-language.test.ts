import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Publication language settings', async () => {
    test('Supports selecting a language from the dropdown', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'locale', value: 'fr'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const localeSelect = section.getByTestId('locale-select');

        // Verify initial value is shown in the select trigger
        await expect(localeSelect).toContainText('English (en)');

        // Open dropdown and select French
        await localeSelect.click();
        await page.getByTestId('select-option').filter({hasText: 'French (fr)'}).click();

        await section.getByRole('button', {name: 'Save'}).click();

        // Verify the selection is shown
        await expect(localeSelect).toContainText('French (fr)');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'locale', value: 'fr'}
            ]
        });
    });

    test('Supports entering a custom locale via Other option', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'locale', value: 'en-GB'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const localeSelect = section.getByTestId('locale-select');

        // Open dropdown and select "Other..."
        await localeSelect.click();
        await page.getByTestId('select-option').filter({hasText: 'Other'}).click();

        // Enter custom locale in the text input
        await section.getByLabel('Site language').fill('en-GB');

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'locale', value: 'en-GB'}
            ]
        });
    });

    test('Shows validation error for invalid custom locale', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const localeSelect = section.getByTestId('locale-select');

        // Open dropdown and select "Other..."
        await localeSelect.click();
        await page.getByTestId('select-option').filter({hasText: 'Other'}).click();

        // Enter invalid locale
        await section.getByLabel('Site language').fill('invalid--locale');

        // Should show validation error
        await expect(section.getByText('Invalid locale format')).toBeVisible();
    });

    test('Can switch back from custom input to dropdown', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const localeSelect = section.getByTestId('locale-select');

        // Open dropdown and select "Other..."
        await localeSelect.click();
        await page.getByTestId('select-option').filter({hasText: 'Other'}).click();

        // Click "Choose from list" to go back
        await section.getByRole('button', {name: 'Choose from list'}).click();

        // Verify dropdown is visible again
        await expect(localeSelect).toBeVisible();
    });

    test('Displays custom locale value when loading with non-predefined locale', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                method: 'GET',
                path: /^\/settings\/\?group=/,
                response: updatedSettingsResponse([
                    {key: 'locale', value: 'cy'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');

        // Should show the custom locale in the text field
        await expect(section.getByLabel('Site language')).toHaveValue('cy');
    });
});
