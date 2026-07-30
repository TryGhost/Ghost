import {assertHTML, focusEditor, html, initialize, isMac} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function setContent(page, children) {
    await page.evaluate((nodes) => {
        const serializedState = JSON.stringify({
            root: {
                children: nodes,
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
        const editor = window.lexicalEditor;
        editor.setEditorState(editor.parseEditorState(serializedState));
    }, children);
}

function paragraph(text) {
    return {
        children: [{detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1}],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
    };
}

function getContentBlocks(page) {
    return page.evaluate(() => window.editorAPI.getContentBlocks());
}

test.describe('External control plugin: paywall API', async () => {
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

    test('getContentBlocks lists blocks with text and no paywall', async function () {
        await setContent(page, [paragraph('first'), paragraph('second')]);

        const result = await getContentBlocks(page);

        expect(result.paywallIndex).toBeNull();
        expect(result.blocks).toEqual([
            {type: 'paragraph', isCard: false, text: 'first'},
            {type: 'paragraph', isCard: false, text: 'second'}
        ]);
    });

    test('getContentBlocks reports paywall position and marks cards', async function () {
        await setContent(page, [
            paragraph('public'),
            {type: 'paywall', version: 1},
            {type: 'horizontalrule', version: 1},
            paragraph('gated')
        ]);

        const result = await getContentBlocks(page);

        expect(result.paywallIndex).toEqual(1);
        expect(result.blocks.map(b => b.type)).toEqual(['paragraph', 'horizontalrule', 'paragraph']);
        expect(result.blocks[1].isCard).toEqual(true);
    });

    test('setPaywallPosition inserts at index, start, and end', async function () {
        await setContent(page, [paragraph('one'), paragraph('two'), paragraph('three')]);

        await page.evaluate(() => window.editorAPI.setPaywallPosition(1));
        expect((await getContentBlocks(page)).paywallIndex).toEqual(1);

        await page.evaluate(() => window.editorAPI.setPaywallPosition(0));
        expect((await getContentBlocks(page)).paywallIndex).toEqual(0);

        await page.evaluate(() => window.editorAPI.setPaywallPosition(3));
        expect((await getContentBlocks(page)).paywallIndex).toEqual(3);
    });

    test('setPaywallPosition collapses duplicate paywall nodes', async function () {
        await setContent(page, [
            paragraph('one'),
            {type: 'paywall', version: 1},
            paragraph('two'),
            {type: 'paywall', version: 1},
            paragraph('three')
        ]);

        await page.evaluate(() => window.editorAPI.setPaywallPosition(2));

        const result = await getContentBlocks(page);
        expect(result.paywallIndex).toEqual(2);

        const paywallCount = await page.locator('[data-kg-card="paywall"]').count();
        expect(paywallCount).toEqual(1);
    });

    test('removePaywall removes all paywall nodes', async function () {
        await setContent(page, [
            paragraph('one'),
            {type: 'paywall', version: 1},
            paragraph('two')
        ]);

        await page.evaluate(() => window.editorAPI.removePaywall());

        const result = await getContentBlocks(page);
        expect(result.paywallIndex).toBeNull();
        expect(result.blocks).toHaveLength(2);

        const paywallCount = await page.locator('[data-kg-card="paywall"]').count();
        expect(paywallCount).toEqual(0);
    });

    test('setPaywallPosition is undoable', async function () {
        const ctrl = isMac() ? 'Meta' : 'Control';
        await setContent(page, [paragraph('one'), paragraph('two')]);

        await page.evaluate(() => window.editorAPI.setPaywallPosition(1));
        expect((await getContentBlocks(page)).paywallIndex).toEqual(1);

        await focusEditor(page);
        await page.keyboard.press(`${ctrl}+KeyZ`);

        expect((await getContentBlocks(page)).paywallIndex).toBeNull();
        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">one</span></p>
            <p dir="ltr"><span data-lexical-text="true">two</span></p>
        `);
    });
});

test.describe('External control plugin: paywall placement mode', async () => {
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

    test('enter renders gap targets between blocks, exit removes them', async function () {
        await setContent(page, [paragraph('one'), paragraph('two'), paragraph('three')]);

        await page.evaluate(() => window.editorAPI.enterPaywallPlacement());

        await expect(page.locator('[data-kg-paywall-placement]')).toBeVisible();
        // cuts are allowed after blocks 1 and 2, never after the last block
        await expect(page.locator('[data-kg-placement-gap]')).toHaveCount(2);
        await expect(page.locator('[data-kg-placement-gap="3"]')).toHaveCount(0);

        await page.evaluate(() => window.editorAPI.exitPaywallPlacement());
        await expect(page.locator('[data-kg-paywall-placement]')).toHaveCount(0);
    });

    test('clicking a gap moves the paywall, washes gated content, and fires onChange', async function () {
        await setContent(page, [paragraph('one'), paragraph('two'), paragraph('three')]);

        await page.evaluate(() => {
            window.placementChanges = [];
            window.editorAPI.enterPaywallPlacement({
                onChange: state => window.placementChanges.push(state)
            });
        });

        await page.locator('[data-kg-placement-gap="2"]').click();

        const blocks = await getContentBlocks(page);
        expect(blocks.paywallIndex).toEqual(2);

        const changes = await page.evaluate(() => window.placementChanges);
        expect(changes).toEqual([{paywallIndex: 2, blockCount: 3}]);

        // the current cut position offers no gap target; the wash covers gated content
        await expect(page.locator('[data-kg-placement-gap="2"]')).toHaveCount(0);
        await expect(page.locator('[data-kg-placement-gap="1"]')).toHaveCount(1);
        await expect(page.locator('[data-kg-placement-wash]')).toBeVisible();
    });

    test('placement overlay tracks edits made while active', async function () {
        await setContent(page, [paragraph('one'), paragraph('two')]);

        await page.evaluate(() => window.editorAPI.enterPaywallPlacement());
        await expect(page.locator('[data-kg-placement-gap]')).toHaveCount(1);

        await setContent(page, [paragraph('one'), paragraph('two'), paragraph('three'), paragraph('four')]);
        await expect(page.locator('[data-kg-placement-gap]')).toHaveCount(3);
    });
});

test.describe('External control plugin: placement gate preview', async () => {
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

    test('renders the read-only gate preview above the paywall', async function () {
        await setContent(page, [paragraph('public'), {type: 'paywall', version: 1}, paragraph('gated')]);

        await page.evaluate(() => {
            window.editorAPI.enterPaywallPlacement({
                gate: {heading: 'This post is for paid members', pitch: 'Default body.', buttonText: 'Upgrade', buttonUrl: '#/portal/signup'}
            });
        });

        await expect(page.locator('[data-kg-placement-gate]')).toBeVisible();
        await expect(page.locator('[data-kg-gate-heading]')).toHaveText('This post is for paid members');
        await expect(page.locator('[data-kg-gate-pitch]')).toHaveText('Default body.');
        await expect(page.locator('[data-kg-gate-button]')).toHaveText('Upgrade');

        // display only — the preview never captures interaction
        const pointerEvents = await page.locator('[data-kg-placement-gate]').evaluate(el => getComputedStyle(el).pointerEvents);
        expect(pointerEvents).toEqual('none');

        // the gate sits above the paywall card, not over the gated content
        const gateBottom = await page.locator('[data-kg-placement-gate]').evaluate(el => el.getBoundingClientRect().bottom);
        const paywallTop = await page.locator('[data-kg-card="paywall"]').evaluate(el => el.getBoundingClientRect().top);
        expect(gateBottom).toBeLessThanOrEqual(paywallTop);
    });

    test('updatePlacementGate rewrites fields it names and leaves the rest', async function () {
        await setContent(page, [paragraph('public'), {type: 'paywall', version: 1}, paragraph('gated')]);

        await page.evaluate(() => {
            window.editorAPI.enterPaywallPlacement({
                gate: {heading: 'This post is for paid members', pitch: 'My pitch', buttonText: 'Upgrade', buttonUrl: '#/portal/signup'}
            });
        });

        await page.evaluate(() => {
            window.editorAPI.updatePlacementGate({heading: 'This post is for members', buttonText: 'Sign up — it’s free'});
        });

        await expect(page.locator('[data-kg-gate-heading]')).toHaveText('This post is for members');
        await expect(page.locator('[data-kg-gate-button]')).toHaveText('Sign up — it’s free');
        await expect(page.locator('[data-kg-gate-pitch]')).toHaveText('My pitch');
        await expect(page.locator('[data-kg-gate-url]')).toHaveText('#/portal/signup');
    });

    test('no gate renders without a gate config or without a paywall', async function () {
        await setContent(page, [paragraph('public'), {type: 'paywall', version: 1}, paragraph('gated')]);
        await page.evaluate(() => window.editorAPI.enterPaywallPlacement());
        await expect(page.locator('[data-kg-placement-gate]')).toHaveCount(0);
        await page.evaluate(() => window.editorAPI.exitPaywallPlacement());

        await setContent(page, [paragraph('one'), paragraph('two')]);
        await page.evaluate(() => {
            window.editorAPI.enterPaywallPlacement({gate: {heading: 'x', pitch: '', buttonText: 'y', buttonUrl: 'z'}});
        });
        await expect(page.locator('[data-kg-placement-gate]')).toHaveCount(0);
    });
});
