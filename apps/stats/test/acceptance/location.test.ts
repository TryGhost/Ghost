import {expect, test} from "@playwright/test";
import {createMockRequests, mockApi} from "@tryghost/admin-x-framework/test/acceptance";
import OverviewPage from "./pages/OverviewPage.ts";

test.describe('Stats App', () => {
    test('loads with custom mocked data', async ({page}) => {
        
        await mockApi({page, requests: createMockRequests({
                browseMemberCountHistory: {
                    method: 'GET',
                    path: /^\/stats\/member_count\//,
                    response: customMemberHistory
                }
            })});

        const overviewPage = new OverviewPage(page);
        await overviewPage.visit();

        await expect(overviewPage.body).toContainText('155');
        await expect(overviewPage.body).toContainText('$550');
    });
});
