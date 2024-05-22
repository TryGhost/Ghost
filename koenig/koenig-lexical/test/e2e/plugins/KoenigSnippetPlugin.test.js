import {expect, test} from '@playwright/test';
import {focusEditor, initialize} from '../../utils/e2e';

test.describe('Snippet Plugin', async function () {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
        // Set localStorage to enable snippets
        const defaultSnippets = [
            {
                name: 'planes',
                value: '{"namespace":"KoenigEditor","nodes":[{"type":"image","version":1,"src":"https://images.unsplash.com/photo-1556388158-158ea5ccacbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDl8fGFpcmNyYWZ0fGVufDB8fHx8MTcxNTc1OTIxNXww&ixlib=rb-4.0.3&q=80&w=2000","width":5046,"height":3364,"title":"","alt":"white biplane","caption":"<span style=\\"white-space: pre-wrap;\\">Photo by </span><a href=\\"https://unsplash.com/@zhpix\\"><span style=\\"white-space: pre-wrap;\\">Pascal Meier</span></a><span style=\\"white-space: pre-wrap;\\"> / </span><a href=\\"https://unsplash.com/?utm_source=ghost&amp;utm_medium=referral&amp;utm_campaign=api-credit\\"><span style=\\"white-space: pre-wrap;\\">Unsplash</span></a>","cardWidth":"regular","href":""},{"type":"image","version":1,"src":"https://images.unsplash.com/photo-1556388158-158ea5ccacbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDl8fGFpcmNyYWZ0fGVufDB8fHx8MTcxNTc1OTIxNXww&ixlib=rb-4.0.3&q=80&w=2000","width":5046,"height":3364,"title":"","alt":"white biplane","caption":"<span style=\\"white-space: pre-wrap;\\">Photo by </span><a href=\\"https://unsplash.com/@zhpix\\"><span style=\\"white-space: pre-wrap;\\">Pascal Meier</span></a><span style=\\"white-space: pre-wrap;\\"> / </span><a href=\\"https://unsplash.com/?utm_source=ghost&amp;utm_medium=referral&amp;utm_campaign=api-credit\\"><span style=\\"white-space: pre-wrap;\\">Unsplash</span></a>","cardWidth":"regular","href":""}]}'
            }
        ];

        await page.evaluate((snippets) => {
            localStorage.setItem('snippets', JSON.stringify(snippets));
        }, defaultSnippets);

        await page.reload(); // Ensure the page reloads to pick up the new localStorage values
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Can Insert a snippet with multiple nodes', async function () {
        await focusEditor(page);
        await page.keyboard.type('/snippet');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="image"]');
        expect(await page.$('[data-kg-card="image"]')).not.toBeNull();
    });
});
