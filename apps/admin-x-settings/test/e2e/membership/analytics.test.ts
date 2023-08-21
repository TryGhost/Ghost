import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Analytics settings', async () => {
    test('Supports toggling analytics settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'members_track_sources', value: false},
                {key: 'email_track_opens', value: false},
                {key: 'email_track_clicks', value: false},
                {key: 'outbound_link_tagging', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section.getByLabel(/Newsletter opens/)).toBeChecked();
        await expect(section.getByLabel(/Newsletter clicks/)).toBeChecked();
        await expect(section.getByLabel(/Member sources/)).toBeChecked();
        await expect(section.getByLabel(/Outbound link tagging/)).toBeChecked();

        await section.getByLabel(/Newsletter opens/).uncheck();
        await section.getByLabel(/Newsletter clicks/).uncheck();
        await section.getByLabel(/Member sources/).uncheck();
        await section.getByLabel(/Outbound link tagging/).uncheck();

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'members_track_sources', value: false},
                {key: 'email_track_opens', value: false},
                {key: 'email_track_clicks', value: false},
                {key: 'outbound_link_tagging', value: false}
            ]
        });
    });
});
