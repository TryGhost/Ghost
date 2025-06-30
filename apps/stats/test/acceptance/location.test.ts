import LocationsTab from './pages/LocationsTab.ts';
import {addAnalyticsEvent, mockedRequests} from '../utils/tinybird-helpers.ts';
import {expect, test} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Stats App - Locations', () => {
    test('loads locations tab with correct country details', async ({page}) => {
        const siteUuid = faker.string.uuid();
        await mockApi({page, requests: mockedRequests(siteUuid)});

        await addAnalyticsEvent({siteUuid: siteUuid, locale: 'en-GB', location: 'GB'});

        const locationsPage = new LocationsTab(page);
        await locationsPage.visit();

        await expect(locationsPage.body).toContainText('United Kingdom');
    });

    test('loads locations tab with info that there are no stats', async ({page}) => {
        const siteUuid = faker.string.uuid();
        await mockApi({page, requests: mockedRequests(siteUuid)});

        const locationsPage = new LocationsTab(page);
        await locationsPage.visit();

        await expect(locationsPage.body).toContainText('No stats available');
    });
});
