import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {limitRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

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

        await expect(section).toBeVisible();

        await expect(section.getByLabel('Newsletter opens')).toBeChecked();
        await expect(section.getByLabel('Newsletter clicks')).toBeChecked();
        await expect(section.getByLabel('Member sources')).toBeChecked();
        await expect(section.getByLabel('Outbound link tagging')).toBeChecked();

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

    test('Supports downloading analytics csv export', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            postsExport: {method: 'GET', path: '/posts/export/?limit=1000', response: 'csv data'}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await section.getByRole('button', {name: 'Export'}).click();

        const hasDownloadUrl = lastApiRequests.postsExport?.url?.includes('/posts/export/?limit=1000');
        expect(hasDownloadUrl).toBe(true);
    });

    test('Supports read only settings', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: updatedSettingsResponse([
                {key: 'members_track_sources', value: false},
                {key: 'email_track_opens', value: false},
                {key: 'email_track_clicks', value: false, is_read_only: true},
                {key: 'outbound_link_tagging', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        const newsletterClicksToggle = await section.getByLabel(/Newsletter clicks/);

        await expect(newsletterClicksToggle).not.toBeChecked();

        await expect(newsletterClicksToggle).toBeDisabled();
    });

    test('Hides web analytics toggle when limitAnalytics is disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        },
                        hostSettings: {
                            limits: {
                                limitAnalytics: {
                                    disabled: true,
                                    error: 'Your current plan doesn\'t support web analytics.'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should not be present when limit is applied
        await expect(section.getByLabel('Web analytics')).not.toBeVisible();

        // Other analytics toggles should still be visible
        await expect(section.getByLabel('Newsletter opens')).toBeVisible();
        await expect(section.getByLabel('Newsletter clicks')).toBeVisible();
        await expect(section.getByLabel('Member sources')).toBeVisible();
        await expect(section.getByLabel('Outbound link tagging')).toBeVisible();
    });
});
