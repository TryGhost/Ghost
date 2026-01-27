import {assertHTML, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Transistor Card', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/?content=false&labs=transistor'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('can insert card via slash command', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="transistor">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can insert card via /podcast keyword', async function () {
        await focusEditor(page);
        await page.keyboard.type('/podcast');
        await expect(page.locator('[data-kg-card-menu-item="Transistor" i][data-kg-cardmenu-selected="true"]')).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-kg-card="transistor"]')).toBeVisible();
    });

    test('renders placeholder by default', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        await expect(page.getByTestId('transistor-placeholder')).toBeVisible();
    });

    test('has settings panel with Design and Visibility tabs', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        await expect(page.getByTestId('tab-design')).toBeVisible();
        await expect(page.getByTestId('tab-visibility')).toBeVisible();
    });

    test('can change player color', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        const playerColorSetting = page.getByTestId('transistor-accent-color');
        await expect(playerColorSetting).toBeVisible();
    });

    test('can change background color', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        const backgroundColorSetting = page.getByTestId('transistor-background-color');
        await expect(backgroundColorSetting).toBeVisible();
    });

    test('can access visibility settings', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        await page.getByTestId('tab-visibility').click();

        await expect(page.getByText('Free members').first()).toBeVisible();
        await expect(page.getByText('Paid members').first()).toBeVisible();
    });

    test('does not show public visitors toggle in visibility', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'transistor'});

        await page.getByTestId('tab-visibility').click();

        await expect(page.getByText('Public visitors')).not.toBeVisible();
    });

    test('can import serialized transistor card', async function () {
        const serializedCard = {
            type: 'transistor',
            version: 1,
            accentColor: '#8B5CF6',
            backgroundColor: '#FFFFFF',
            visibility: {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free,status:-free'
                },
                email: {
                    memberSegment: 'status:free,status:-free'
                }
            }
        };

        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [serializedCard],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}&labs=transistor`});

        await expect(page.locator('[data-kg-card="transistor"]')).toBeVisible();
    });
});
