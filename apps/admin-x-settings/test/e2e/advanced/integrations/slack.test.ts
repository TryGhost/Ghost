import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../../utils/acceptance';

test.describe('Slack integration', async () => {
    test('Supports updating Slack settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'slack_url', value: 'https://hooks.slack.com/services/123456789/123456789/123456789'},
                {key: 'slack_username', value: 'My site'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const slackElement = section.getByText('Slack').last();
        await slackElement.hover();
        await section.getByRole('button', {name: 'Configure'}).click();

        const slackModal = page.getByTestId('slack-modal');

        await slackModal.getByLabel('Webhook URL').fill('https://hooks.slack.com/services/123456789/123456789/123456789');
        await slackModal.getByLabel('Username').fill('My site');
        await slackModal.getByRole('button', {name: 'Save & close'}).click();

        await expect(slackModal).toHaveCount(0);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'slack_url', value: 'https://hooks.slack.com/services/123456789/123456789/123456789'},
                {key: 'slack_username', value: 'My site'}
            ]
        });
    });

    test('Supports testing Slack messages', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'slack_url', value: 'https://hooks.slack.com/services/123456789/123456789/123456789'},
                {key: 'slack_username', value: 'My site'}
            ])},
            testSlack: {method: 'POST', path: '/slack/test/', responseStatus: 204, response: ''}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const slackElement = section.getByText('Slack').last();
        await slackElement.hover();
        await section.getByRole('button', {name: 'Configure'}).click();

        const slackModal = page.getByTestId('slack-modal');

        await slackModal.getByLabel('Webhook URL').fill('https://hooks.slack.com/services/123456789/123456789/123456789');
        await slackModal.getByLabel('Username').fill('My site');
        await slackModal.getByRole('button', {name: 'Send test notification'}).click();

        await expect(page.getByTestId('toast-neutral')).toHaveText(/Check your Slack channel for the test message/);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'slack_url', value: 'https://hooks.slack.com/services/123456789/123456789/123456789'},
                {key: 'slack_username', value: 'My site'}
            ]
        });
        expect(lastApiRequests.testSlack).toBeTruthy();
    });
});
