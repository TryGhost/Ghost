import {E2E_PORT} from '../../playwright.config';
import {MOCKED_SITE_URL, MockedApi} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Lazy loading', async () => {
    test('delays loading of content until scrolled into view', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const sitePath = MOCKED_SITE_URL;
        await page.route(sitePath, async (route) => {
            await route.fulfill({
                status: 200,
                // include a div at the top of the body that's 1.5x viewport height
                // to force the need to scroll to see the comments
                body: `<html><head><meta charset="UTF-8" /></head><body><div style="width: 100%; height: 1500px;"></div></body></html>`
            });
        });

        const url = `http://localhost:${E2E_PORT}/comments-ui.min.js`;
        await page.setViewportSize({width: 1000, height: 1000});

        await page.goto(sitePath);
        await mockedApi.listen({page, path: sitePath});

        const options = {
            publication: 'Publisher Weekly',
            count: true,
            title: 'Title',
            ghostComments: MOCKED_SITE_URL,
            postId: mockedApi.postId
        };

        await page.evaluate((data) => {
            const scriptTag = document.createElement('script');
            scriptTag.src = data.url;

            for (const option of Object.keys(data.options)) {
                scriptTag.dataset[option] = data.options[option];
            }
            document.body.appendChild(scriptTag);
        }, {url, options});

        await page.locator('iframe[title="comments-frame"]').waitFor({state: 'attached'});

        const commentsFrameSelector = 'iframe[title="comments-frame"]';
        const adminFrameSelector = 'iframe[data-frame="admin-auth"]';

        const commentsFrame = page.frameLocator(commentsFrameSelector);

        // wait for a little bit to ensure we're not loading comments until scrolled
        await page.waitForTimeout(250);

        // check that we haven't loaded comments or admin-auth yet
        await expect(commentsFrame.getByTestId('loading')).toHaveCount(1);
        await expect(page.locator(adminFrameSelector)).toHaveCount(0);

        // scroll the iframe into view
        const iframeHandle = await page.locator(commentsFrameSelector);
        iframeHandle.scrollIntoViewIfNeeded();

        // loading state should be gone and admin-auth frame should be present
        await expect(commentsFrame.getByTestId('loading')).toHaveCount(0);
        await expect(page.locator(adminFrameSelector)).toHaveCount(1);
    });
});
