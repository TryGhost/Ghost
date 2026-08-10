import {expect, test} from '@playwright/test';
import {focusEditor, initialize, insertCard} from '../../utils/e2e';

test.describe('Word Count Plugin', async function () {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('counts words in editor', async function () {
        await focusEditor(page);
        await expect(page.getByTestId('word-count')).toHaveText('0');
        await page.keyboard.type('Hello World');
        await expect(page.getByTestId('word-count')).toHaveText('2');
    });

    test('counts words in nested editors', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello World');
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Nested content');
        await expect(page.getByTestId('word-count')).toHaveText('4');
    });

    test('counts words immediately after initialization', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Hello word',
                                type: 'text',
                                version: 1
                            }
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await expect(page.getByTestId('word-count')).toHaveText('2');
    });
});
