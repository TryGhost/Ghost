import * as fixtureResponses from '@tryghost/admin-x-framework/test/responses/builders/index';
import {AnalyticsLocationsPage} from '@tryghost/e2e/build/helpers/pages/admin';
import {expect, test} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockedRequests} from '../utils/tinybird-helpers.ts';

test.describe('Stats App - Locations', () => {
    test('loads locations tab with correct country details', async ({page}) => {
        const siteUuid = faker.string.uuid();
        await mockApi({page, requests: mockedRequests(siteUuid)});
        await mockApi({page, requests: {topLocations: {method: 'GET',
            path: /\/api_top_locations/,
            response: fixtureResponses.topLocations({data: [{location: 'US', visits: 100}]})}},
        options: {useAnalytics: true}}
        );

        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.body).toContainText('United States');
        await expect(locationsPage.body).toContainText('100');
    });

    test('loads locations tab with correct multiple country details', async ({page}) => {
        const siteUuid = faker.string.uuid();
        await mockApi({page, requests: mockedRequests(siteUuid)});
        await mockApi({page, requests: {topLocations: {method: 'GET',
            path: /\/api_top_locations/,
            response: fixtureResponses.topLocations({
                data: [
                    {location: 'US', visits: 100},
                    {location: 'GB', visits: 90},
                    {location: 'HU', visits: 80}
                ]
            })}}, options: {useAnalytics: true}});

        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.body).toContainText('United States');
        await expect(locationsPage.body).toContainText('United Kingdom');
        await expect(locationsPage.body).toContainText('Hungary');
    });

    test('loads locations tab with info that there are no stats', async ({page}) => {
        const siteUuid = faker.string.uuid();
        await mockApi({page, requests: mockedRequests(siteUuid)});
        await mockApi({page, requests: {topLocations: {method: 'GET',
            path: /\/api_top_locations/,
            response: fixtureResponses.topLocations({data: []})}},
        options: {useAnalytics: true}}
        );

        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.body).toContainText('No visitors');
    });
});
