import {expect, test} from '@playwright/test';
import {initialize} from '../../utils/e2e';

const text = value => ({detail: 0, format: 0, mode: 'normal', style: '', text: value, type: 'text', version: 1});
const paragraph = value => ({children: [text(value)], direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1});
const withContent = (children, params) => `/#/?content=${encodeURIComponent(JSON.stringify({root: {children, direction: null, format: '', indent: 0, type: 'root', version: 1}}))}${params}`;
const documentChildren = page => page.evaluate(() => window.lexicalEditor.getEditorState().toJSON().root.children);
const documentTypes = async page => (await documentChildren(page)).map(node => node.type);

const embedCard = {type: 'embed', version: 1, url: '', embedType: '', html: '', metadata: {}, caption: ''};
const bookmarkCard = {type: 'bookmark', version: 1, url: '', metadata: {icon: '', title: '', description: '', author: '', publisher: '', thumbnail: ''}, caption: ''};

const variants = [
    {name: 'Embed card', type: 'embed', card: embedCard, params: '', input: 'embed-url', submitted: 'embed-iframe'},
    {name: 'Bookmark card without search', type: 'bookmark', card: bookmarkCard, params: '&searchLinks=false', input: 'bookmark-url', submitted: 'bookmark-title'},
    {name: 'Bookmark card with search', type: 'bookmark', card: bookmarkCard, params: '', input: 'bookmark-url', submitted: 'bookmark-title'}
];

for (const {name, type, card, params, input, submitted} of variants) {
    test.describe(`${name} URL field keys`, async () => {
        let page;

        test.beforeAll(async ({browser}) => {
            page = await browser.newPage();
        });

        test.afterAll(async () => {
            await page.close();
        });

        test.describe('with the caret in another paragraph', async () => {
            test.beforeEach(async () => {
                await initialize({page, uri: withContent([paragraph('First'), card, paragraph('Last')], params)});
                await expect(page.getByTestId(input)).toBeVisible();
                await page.locator('p', {hasText: 'First'}).click();
            });

            test('Enter leaves the card alone', async function () {
                const [, cardBefore] = await documentChildren(page);

                await page.keyboard.press('Enter');
                await page.keyboard.type('Second');

                await expect(page.locator('p', {hasText: 'Second'})).toBeVisible();
                await expect(page.getByTestId(input)).toBeVisible();
                await expect(page.getByTestId(`${input}-error-message`)).toHaveCount(0);

                const children = await documentChildren(page);
                expect(children.map(node => node.type)).toEqual(['paragraph', 'paragraph', type, 'paragraph']);
                expect(children[2]).toEqual(cardBefore);
            });

            test('Escape leaves the card and the caret alone', async function () {
                const before = await documentChildren(page);

                await page.keyboard.press('Escape');

                await expect(page.getByTestId(input)).toBeVisible();
                expect(await documentChildren(page)).toEqual(before);

                await page.keyboard.type('!');

                await expect(page.locator('p', {hasText: 'First'})).toHaveText('First!');
                expect(await documentTypes(page)).toEqual(['paragraph', type, 'paragraph']);
            });
        });

        test.describe('with focus in the URL field', async () => {
            test.beforeEach(async () => {
                await initialize({page, uri: withContent([paragraph('First'), card, paragraph('Last')], params)});
                await page.locator('p', {hasText: 'First'}).click();
                await page.getByTestId(input).click();
            });

            test('Enter submits the URL', async function () {
                await page.getByTestId(input).fill('https://ghost.org/');
                await page.getByTestId(input).press('Enter');

                await expect(page.getByTestId(submitted)).toBeVisible();
                expect(await documentTypes(page)).toEqual(['paragraph', type, 'paragraph']);
            });

            test('Escape closes the card', async function () {
                await page.keyboard.press('Escape');

                await expect(page.getByTestId(input)).toHaveCount(0);
                expect(await documentTypes(page)).toEqual(['paragraph', 'paragraph', 'paragraph']);
            });
        });

        test.describe('with two empty cards', async () => {
            test.beforeEach(async () => {
                await initialize({page, uri: withContent([card, paragraph('Between'), card], params)});
                await expect(page.getByTestId(input)).toHaveCount(2);
                await page.getByTestId(input).first().click();
            });

            test('Enter submits only the card with focus', async function () {
                await page.getByTestId(input).first().fill('https://ghost.org/');
                await page.getByTestId(input).first().press('Enter');

                await expect(page.getByTestId(submitted)).toBeVisible();
                await expect(page.getByTestId(input)).toHaveCount(1);
                await expect(page.getByTestId(submitted)).toHaveCount(1);

                const children = await documentChildren(page);
                expect(children.map(node => node.type)).toEqual([type, 'paragraph', type]);
                expect(children[2].url).toEqual('');
            });

            test('Escape closes only the card with focus', async function () {
                await page.keyboard.press('Escape');

                await expect(page.getByTestId(input)).toHaveCount(1);
                expect(await documentTypes(page)).toEqual(['paragraph', 'paragraph', type]);
            });
        });
    });
}
