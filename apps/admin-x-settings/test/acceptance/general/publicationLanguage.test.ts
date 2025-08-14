import {chooseOptionInSelect, globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.describe('Publication language settings', async () => {
    test('Supports selecting a predefined locale', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'locale', value: 'ja'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        
        // Find the select element by its testId
        const select = section.getByTestId('locale-select');

        // Initial value should be English (en)
        await expect(select).toContainText('English (en)');

        // Select Japanese from the dropdown
        await chooseOptionInSelect(select, 'Japanese (ja)');

        await section.getByRole('button', {name: 'Save'}).click();

        // Verify the new value is displayed
        await expect(select).toContainText('Japanese (ja)');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'locale', value: 'ja'}
            ]
        });
    });

    test('Supports entering a custom locale', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'locale', value: 'en-GB'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const select = section.getByTestId('locale-select');

        // Select "Other..." option
        await chooseOptionInSelect(select, 'Other...');

        // Now we should see a text input field
        await section.getByPlaceholder('e.g. en-GB, fr-CA').fill('en-GB');

        await section.getByRole('button', {name: 'Save'}).click();

        // Verify the custom value is saved
        await expect(section.getByPlaceholder('e.g. en-GB, fr-CA')).toHaveValue('en-GB');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'locale', value: 'en-GB'}
            ]
        });
    });

    test.skip('Validates invalid locale formats', async ({page}) => {
        // TODO: Fix validation error display in tests
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const select = section.getByTestId('locale-select');

        // Select "Other..." option
        await chooseOptionInSelect(select, 'Other...');

        // Enter an invalid locale
        const input = section.getByPlaceholder('e.g. en-GB, fr-CA');
        await input.fill('English');

        // Validation should show immediately on change
        // Look for the error in the hint text specifically
        const hintText = section.locator('.text-red');
        await expect(hintText).toContainText('Invalid locale format. Examples: en, en-US, zh-Hant, sr-Latn, x-private');

        // Also verify that Save is disabled or shows error
        await section.getByRole('button', {name: 'Save'}).click();
        
        // The validation error should persist
        await expect(section).toContainText('Invalid locale format. Examples: en, en-US, zh-Hant, sr-Latn, x-private');
    });

    test('Can switch back from custom input to dropdown', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');
        const select = section.getByTestId('locale-select');

        // Select "Other..." option
        await chooseOptionInSelect(select, 'Other...');

        // Should see the custom input and "Choose from list" link
        await expect(section.getByText('Choose from list')).toHaveCount(1);

        // Click to go back to dropdown
        await section.getByText('Choose from list').click();

        // Should see the dropdown again with English selected
        await expect(select).toContainText('English (en)');
    });

    test('Shows existing custom locale in text input', async ({page}) => {
        // Create a modified settings response with a custom locale
        const customSettings = JSON.parse(JSON.stringify(responseFixtures.settings));
        const localeIndex = customSettings.settings.findIndex((s: any) => s.key === 'locale');
        if (localeIndex >= 0) {
            customSettings.settings[localeIndex].value = 'en-AU';
        } else {
            customSettings.settings.push({key: 'locale', value: 'en-AU'});
        }

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: customSettings
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');

        // Should show the custom locale in the text input since en-AU is not in the predefined list
        const input = section.getByPlaceholder('e.g. en-GB, fr-CA');
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('en-AU');
    });
});
