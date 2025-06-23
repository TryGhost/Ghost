import WebTrafficTab from './pages/WebTrafficTab.ts';
import {addAnalyticsEvent, statsConfig} from '../utils/tinybird-helpers.ts';
import {expect, test} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {
    globalDataRequests,
    mockApi,
    responseFixtures
} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Stats App - Web Traffic', () => {
    test('loads tab with correct top sources', async ({page}) => {
        const siteUuid = faker.string.uuid();

        await mockApi({
            page, requests: {
                ...globalDataRequests,
                browseConfig: {
                    method: 'GET', path: '/config/', response: {
                        config: {
                            ...responseFixtures.config.config,
                            stats: {
                                ...statsConfig,
                                id: siteUuid
                            }
                        }
                    }
                }
            }
        });

        const domain = 'example.com';
        await addAnalyticsEvent({siteUuid: siteUuid, referrer: faker.internet.url(), referrerSource: domain});

        const webTrafficPage = new WebTrafficTab(page);
        await webTrafficPage.visit();

        await expect(webTrafficPage.body).toContainText(domain);
    });
});
