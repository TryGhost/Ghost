import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const settingsWithClaude = (value: string | null) => ({
    ...responseFixtures.settings,
    settings: [
        ...responseFixtures.settings.settings,
        {key: 'claude_api_key', value}
    ]
});

test.describe('Claude integration', async () => {
    test('saves a Claude API key and marks the integration active', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                method: 'GET',
                path: /^\/settings\/\?group=/,
                response: settingsWithClaude(null)
            },
            editSettings: {
                method: 'PUT',
                path: '/settings/',
                response: settingsWithClaude('••••••••')
            }
        }});

        await page.goto('/');
        const integration = page.getByTestId('claude-integration');
        await expect(integration).toContainText('Claude');
        await expect(integration.getByText('Active')).toBeHidden();

        await integration.hover();
        await integration.getByRole('button', {name: 'Configure'}).click();

        const modal = page.getByTestId('claude-modal');
        const apiKeyInput = modal.getByLabel('Claude API key');
        await expect(apiKeyInput).toHaveAttribute('type', 'password');
        await apiKeyInput.fill('test-claude-key');
        await modal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'claude_api_key', value: 'test-claude-key'}
            ]
        });

        await modal.getByRole('button', {name: 'Close'}).click();
        await expect(integration.getByText('Active')).toBeVisible();
    });

    test('clears a configured Claude API key', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                method: 'GET',
                path: /^\/settings\/\?group=/,
                response: settingsWithClaude('••••••••')
            },
            editSettings: {
                method: 'PUT',
                path: '/settings/',
                response: settingsWithClaude(null)
            }
        }});

        await page.goto('/');
        const integration = page.getByTestId('claude-integration');
        await expect(integration.getByText('Active')).toBeVisible();

        await integration.hover();
        await integration.getByRole('button', {name: 'Configure'}).click();

        const modal = page.getByTestId('claude-modal');
        await expect(modal.getByLabel('Claude API key')).toHaveValue('');
        await modal.getByRole('button', {name: 'Clear API key'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'claude_api_key', value: null}
            ]
        });

        await modal.getByRole('button', {name: 'Close'}).click();
        await expect(integration.getByText('Active')).toBeHidden();
    });
});
