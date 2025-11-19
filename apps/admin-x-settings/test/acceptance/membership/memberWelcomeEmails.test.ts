import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Member welcome emails', async () => {
    test('Can toggle member welcome emails on', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'member_welcome_emails_enabled', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'member_welcome_emails_enabled', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('member-welcome-emails');
        const toggle = section.getByRole('switch');

        await expect(section).toBeVisible();
        await expect(toggle).not.toBeChecked();
        await expect(toggle).toBeEnabled();

        await expect(section.getByText('Disabled')).toBeVisible();

        await toggle.click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'member_welcome_emails_enabled', value: true}
            ]
        });
    });

    test('Can toggle member welcome emails off', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'member_welcome_emails_enabled', value: true}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'member_welcome_emails_enabled', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('member-welcome-emails');
        const toggle = section.getByRole('switch');

        await expect(section).toBeVisible();
        await expect(toggle).toBeChecked();
        await expect(toggle).toBeEnabled();

        await expect(section.getByText('Enabled')).toBeVisible();

        await toggle.click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'member_welcome_emails_enabled', value: false}
            ]
        });
    });
});

