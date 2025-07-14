import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, testUrlValidation, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Social account settings', async () => {
    test('Supports editing social URLs', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'facebook', value: 'fb123'},
                {key: 'twitter', value: '@tw'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        // Check initial values in input fields
        await expect(section.getByLabel(`URL of your publication's Facebook Page`)).toHaveValue('https://www.facebook.com/ghost');
        await expect(section.getByLabel('URL of your X profile')).toHaveValue('https://x.com/ghost');

        await section.getByLabel(`URL of your publication's Facebook Page`).fill('https://www.facebook.com/fb123');
        await section.getByLabel('URL of your X profile').fill('https://x.com/tw');

        await section.getByRole('button', {name: 'Save'}).click();

        // Check updated values in input fields
        await expect(section.getByLabel(`URL of your publication's Facebook Page`)).toHaveValue('https://www.facebook.com/fb123');
        await expect(section.getByLabel('URL of your X profile')).toHaveValue('https://x.com/tw');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'facebook', value: 'fb123'},
                {key: 'twitter', value: '@tw'}
            ]
        });
    });

    test('Formats and validates the URLs', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        // Wait for the inputs to be visible
        const facebookInput = section.getByLabel(`URL of your publication's Facebook Page`);
        await expect(facebookInput).toBeVisible();

        await testUrlValidation(
            facebookInput,
            'facebook.com/username',
            'https://www.facebook.com/username'
        );

        await testUrlValidation(
            facebookInput,
            'testuser',
            'https://www.facebook.com/testuser'
        );

        await testUrlValidation(
            facebookInput,
            'fb123',
            'https://www.facebook.com/fb123'
        );

        await testUrlValidation(
            facebookInput,
            'page/fb123',
            '',
            'Facebook username must be 5-50 characters long and contain only letters, numbers, and periods'
        );

        await testUrlValidation(
            facebookInput,
            'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
            '',
            'The URL must be in a format like https://www.facebook.com/yourPage, https://www.facebook.com/pages/PageName/123456789, or https://www.facebook.com/groups/GroupName'
        );

        await testUrlValidation(
            facebookInput,
            'https://www.facebook.com/groups/savethecrowninn',
            'https://www.facebook.com/groups/savethecrowninn'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/username',
            '',
            'The URL must be in a format like https://www.facebook.com/yourPage, https://www.facebook.com/pages/PageName/123456789, or https://www.facebook.com/groups/GroupName'
        );

        await testUrlValidation(
            facebookInput,
            'page/*(&*(%%))',
            '',
            'Facebook username must be 5-50 characters long and contain only letters, numbers, and periods'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/pages/username',
            '',
            'The URL must be in a format like https://www.facebook.com/yourPage, https://www.facebook.com/pages/PageName/123456789, or https://www.facebook.com/groups/GroupName'
        );

        const twitterInput = section.getByLabel('URL of your X profile');

        await testUrlValidation(
            twitterInput,
            'twitter.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            'testuser',
            'https://x.com/testuser'
        );

        await testUrlValidation(
            twitterInput,
            'http://github.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            '*(&*(%%))',
            '',
            'The URL must be in a format like https://x.com/yourUsername'
        );

        await testUrlValidation(
            twitterInput,
            'thisusernamehasmorethan15characters',
            'thisusernamehasmorethan15characters',
            'Your Username is not a valid Twitter Username'
        );
    });
});
