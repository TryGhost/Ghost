import {Page} from '@playwright/test';

/**
 * Override feature flags in the labs setting. Call this from a `beforeEach`
 * hook or an individual test.
 *
 * @param page - The page to override the feature flags for
 * @param overrides - The feature flags to override
 */
export async function overrideFeatureFlags(
    page: Page,
    overrides: Record<string, boolean>
) {
    // Override the settings response to inject feature flag overrides
    await page.route('/ghost/api/admin/settings/*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        // Feature flags are stored in the labs setting
        const labsSetting = json.settings?.find(
            (setting: { key: string; value: string }) => setting.key === 'labs'
        );
        if (labsSetting) {
            const labs = {
                ...JSON.parse(labsSetting.value || '{}'),
                ...overrides
            };
            labsSetting.value = JSON.stringify(labs);
        }

        await route.fulfill({
            response,
            json
        });
    });

    // Reload the page so that settings are updated and the feature flag
    // overrides are applied. This is needed since the first page load has
    // already been triggered in the Playwright context setup.
    await page.reload();
}
