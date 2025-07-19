import * as fixtureResponses from '@tryghost/admin-x-framework/test/responses/builders/index';
import {AnalyticsWebTrafficPage} from '@tryghost/e2e/build/helpers/pages/admin';
import {expect, test} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockedRequests} from '../utils/tinybird-helpers.ts';

test.describe('Stats App - Web Traffic', () => {
    test('loads tab - with top single source', async ({page}) => {
        const siteUuid = faker.string.uuid();

        await mockApi({page, requests: mockedRequests(siteUuid)});
        await mockApi({page, requests: {topResources: {method: 'GET',
            path: /\/api_top_sources/,
            response: fixtureResponses.topResources({data: [{source: 'google.com', visits: 1}]})}},
        options: {useAnalytics: true}}
        );

        const webTrafficPage = new AnalyticsWebTrafficPage(page);
        await webTrafficPage.goto();

        await expect(webTrafficPage.body).toContainText('google.com');
    });

    test('loads tab - with top multiple sources', async ({page}) => {
        const siteUuid = faker.string.uuid();

        await mockApi({page, requests: mockedRequests(siteUuid)});
        await mockApi({page, requests: {topResources: {method: 'GET',
            path: /\/api_top_sources/,
            response: fixtureResponses.topResources({
                data: [
                    {source: 'google.com', visits: 1},
                    {source: 'example.com', visits: 2},
                    {source: 'Reddit', visits: 3}
                ]
            })}}, options: {useAnalytics: true}});

        const webTrafficPage = new AnalyticsWebTrafficPage(page);
        await webTrafficPage.goto();

        await expect(webTrafficPage.body).toContainText('google.com');
        await expect(webTrafficPage.body).toContainText('example.com');
        await expect(webTrafficPage.body).toContainText('Reddit');
    });
});
