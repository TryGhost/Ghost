import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Analytics settings', async () => {
    test('Supports toggling analytics settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: true},
                        {key: 'web_analytics_enabled', value: true},
                        {key: 'web_analytics_configured', value: true}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'web_analytics', value: false},
                {key: 'members_track_sources', value: false},
                {key: 'email_track_opens', value: false},
                {key: 'email_track_clicks', value: false},
                {key: 'outbound_link_tagging', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        await expect(section.getByLabel('Web analytics')).toBeChecked();
        await expect(section.getByLabel('Newsletter opens')).toBeChecked();
        await expect(section.getByLabel('Newsletter clicks')).toBeChecked();
        await expect(section.getByLabel('Member sources')).toBeChecked();
        await expect(section.getByLabel('Outbound link tagging')).toBeChecked();

        await section.getByLabel(/Web analytics/).uncheck();
        await section.getByLabel(/Newsletter opens/).uncheck();
        await section.getByLabel(/Newsletter clicks/).uncheck();
        await section.getByLabel(/Member sources/).uncheck();
        await section.getByLabel(/Outbound link tagging/).uncheck();

        await section.getByRole('button', {name: 'Save'}).click();

        const body = lastApiRequests.editSettings?.body as {settings: Array<{key: string, value: boolean}>} | undefined;
        const actualSettings = body?.settings || [];
        const expectedSettings = [
            {key: 'web_analytics', value: false},
            {key: 'members_track_sources', value: false},
            {key: 'email_track_opens', value: false},
            {key: 'email_track_clicks', value: false},
            {key: 'outbound_link_tagging', value: false}
        ];

        // Check that all expected settings are present, regardless of order
        expect(actualSettings).toHaveLength(expectedSettings.length);
        expectedSettings.forEach((expectedSetting) => {
            expect(actualSettings).toContainEqual(expectedSetting);
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

    test('Shows web analytics toggle when feature flag is enabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: true},
                        {key: 'web_analytics_enabled', value: true},
                        {key: 'web_analytics_configured', value: true}
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should be visible when feature flag is enabled
        await expect(section.getByLabel('Web analytics')).toBeVisible();
        await expect(section.getByLabel('Web analytics')).toBeEnabled();
        await expect(section.getByLabel('Web analytics')).toBeChecked();

        // Other analytics toggles should still be visible
        await expect(section.getByLabel('Newsletter opens')).toBeVisible();
        await expect(section.getByLabel('Newsletter clicks')).toBeVisible();
        await expect(section.getByLabel('Member sources')).toBeVisible();
        await expect(section.getByLabel('Outbound link tagging')).toBeVisible();
    });

    test('Hides web analytics toggle when feature flag is disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: false // Feature flag disabled
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should not be visible when feature flag is disabled
        await expect(section.getByLabel('Web analytics')).not.toBeVisible();

        // Other analytics toggles should still be visible
        await expect(section.getByLabel('Newsletter opens')).toBeVisible();
        await expect(section.getByLabel('Newsletter clicks')).toBeVisible();
        await expect(section.getByLabel('Member sources')).toBeVisible();
        await expect(section.getByLabel('Outbound link tagging')).toBeVisible();
    });

    test('Shows web analytics toggle as disabled when web_analytics_configured is false', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true, // Feature flag enabled
                            ui60: true // Enable ui60 for hint text
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: true},
                        {key: 'web_analytics_enabled', value: false},
                        {key: 'web_analytics_configured', value: false}
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should be visible but disabled
        const webAnalyticsToggle = section.getByLabel('Web analytics');
        await expect(webAnalyticsToggle).toBeVisible();
        await expect(webAnalyticsToggle).toBeDisabled();
        
        // Should show as unchecked when disabled (even if web_analytics setting is true)
        await expect(webAnalyticsToggle).not.toBeChecked();

        // Should show the info box about additional setup required
        await expect(section.getByText(/Web analytics in Ghost is powered by.*Tinybird.*and requires configuration/)).toBeVisible();
    });

    test('Shows web analytics toggle as enabled and respects user setting', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: true},
                        {key: 'web_analytics_enabled', value: true},
                        {key: 'web_analytics_configured', value: true}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'web_analytics', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should be visible and enabled
        const webAnalyticsToggle = section.getByLabel('Web analytics');
        await expect(webAnalyticsToggle).toBeVisible();
        await expect(webAnalyticsToggle).toBeEnabled();
        await expect(webAnalyticsToggle).toBeChecked();

        // Should be able to toggle it
        await webAnalyticsToggle.uncheck();
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'web_analytics', value: false}
            ]
        });
    });

    test('Cannot toggle web analytics when disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: false},
                        {key: 'web_analytics_enabled', value: false}
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        const webAnalyticsToggle = section.getByLabel('Web analytics');
        
        // Toggle should be disabled
        await expect(webAnalyticsToggle).toBeDisabled();
        
        // Try to click it (should not work)
        await webAnalyticsToggle.click({force: true});
        
        // Should not show save/cancel buttons since nothing changed
        await expect(section.getByRole('button', {name: 'Save'})).not.toBeVisible();
    });

    test('Can enable web analytics when it starts deselected', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true // Feature flag enabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: false}, // Starts as false
                        {key: 'web_analytics_enabled', value: false}, // Feature is OFF but configurable
                        {key: 'web_analytics_configured', value: true} // Can be configured
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'web_analytics', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should be visible and enabled (but unchecked)
        const webAnalyticsToggle = section.getByLabel('Web analytics');
        await expect(webAnalyticsToggle).toBeVisible();
        await expect(webAnalyticsToggle).toBeEnabled();
        await expect(webAnalyticsToggle).not.toBeChecked();

        // Toggle it on
        await webAnalyticsToggle.check();
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'web_analytics', value: true}
            ]
        });
    });

    test('Does not show hint text when ui60 flag is disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config.labs,
                            trafficAnalytics: true, // Feature flag enabled
                            ui60: false // ui60 disabled
                        }
                    }
                }
            },
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'web_analytics', value: true},
                        {key: 'web_analytics_enabled', value: false},
                        {key: 'web_analytics_configured', value: false}
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('analytics');

        await expect(section).toBeVisible();

        // Web analytics toggle should be visible but disabled
        const webAnalyticsToggle = section.getByLabel('Web analytics');
        await expect(webAnalyticsToggle).toBeVisible();
        await expect(webAnalyticsToggle).toBeDisabled();
        
        // Should NOT show the info box about Tinybird configuration when ui60 is disabled
        await expect(section.getByText(/Web analytics in Ghost is powered by.*Tinybird.*and requires configuration/)).not.toBeVisible();
        
        // Should show the separator instead
        await expect(section.locator('.border-grey-200').first()).toBeVisible();
    });
});
