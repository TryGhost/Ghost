import {createSnippet, ctrlOrCmd, focusEditor, initialize, insertCard} from '../utils/e2e';
import {expect, test} from '@playwright/test';

// Every card with settings has one Edit button that opens a single settings
// panel in edit mode. Visibility is always the panel's last tab. Each rule is
// tested once, on an image (visibility only), a video (design and visibility)
// and an audio card (edited in place).

const hidden = {
    web: {nonMember: false, memberSegment: 'status:free,status:-free'},
    email: {memberSegment: 'status:free,status:-free'}
};

const paragraph = text => ({
    children: [{detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1}],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1
});

const image = ({cardWidth = 'regular', caption = '', visibility} = {}) => ({
    type: 'image',
    version: 1,
    src: '/Koenig-editor-1.png',
    width: 1600,
    height: 900,
    title: '',
    alt: '',
    caption,
    cardWidth,
    ...(visibility && {visibility})
});

const video = ({cardWidth = 'regular', visibility} = {}) => ({
    type: 'video',
    version: 1,
    cardWidth,
    src: '/video.mp4',
    width: 1600,
    height: 900,
    duration: 60,
    caption: '',
    thumbnailSrc: '/Koenig-editor-2.png',
    thumbnailWidth: 1600,
    thumbnailHeight: 900,
    ...(visibility && {visibility})
});

const audio = {
    type: 'audio',
    version: 1,
    src: '/audio.mp3',
    title: 'A track',
    duration: 60,
    mimeType: 'audio/mp3',
    thumbnailSrc: ''
};

const content = (...children) => encodeURIComponent(JSON.stringify({
    root: {children, direction: null, format: '', indent: 0, type: 'root', version: 1}
}));

test.describe('Content Visibility', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.afterAll(async () => {
        await page.close();
    });

    async function selectCard(cardName, nth = 0) {
        const card = page.locator(`[data-kg-card="${cardName}"]`).nth(nth);
        await card.click();
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
        return card;
    }

    async function expectPanelOnTab(card, tab) {
        await expect(card.getByTestId('settings-panel')).toBeVisible();
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(card.getByTestId(`tab-contents-${tab}`)).toBeVisible();
    }

    async function expectToolbarWithoutPanel(card) {
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card.getByTestId('settings-panel')).not.toBeVisible();
        await expect(card.locator('[data-kg-card-toolbar]').last()).toBeVisible();
    }

    test.describe('Card with visibility settings only (image)', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), image(), image({caption: 'second'}))}`});
            await focusEditor(page);
        });

        test('toolbar has an Edit button and no separate visibility button', async function () {
            const card = await selectCard('image');

            await expect(card.getByTestId('edit-image-card')).toBeVisible();
            await expect(card.getByTestId('show-visibility')).toHaveCount(0);
        });

        test('Edit opens the panel on the Visibility tab and hides the toolbar', async function () {
            const card = await selectCard('image');
            await card.getByTestId('edit-image-card').click();

            await expectPanelOnTab(card, 'visibility');
            await expect(card.locator('[data-kg-card-toolbar]')).toHaveCount(0);
        });

        test('Escape closes the panel and brings back the toolbar', async function () {
            const card = await selectCard('image');
            await card.getByTestId('edit-image-card').click();
            await expectPanelOnTab(card, 'visibility');

            await page.keyboard.press('Escape');

            await expectToolbarWithoutPanel(card);
        });

        test('clicking a selected image again does not open the panel', async function () {
            const card = await selectCard('image');
            await card.click();

            await expectToolbarWithoutPanel(card);
        });

        test('double-click opens the panel', async function () {
            const card = page.locator('[data-kg-card="image"]').first();
            await card.dblclick();

            await expectPanelOnTab(card, 'visibility');
        });

        test('Cmd+Enter opens and closes the panel', async function () {
            const card = await selectCard('image');

            await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
            await expectPanelOnTab(card, 'visibility');

            await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
            await expectToolbarWithoutPanel(card);
        });

        test('settings default to shown everywhere and can be changed', async function () {
            const card = await selectCard('image');
            await card.getByTestId('edit-image-card').click();

            for (const toggle of ['web-nonMembers', 'web-freeMembers', 'web-paidMembers', 'email-freeMembers', 'email-paidMembers']) {
                await expect(card.getByTestId(`visibility-toggle-${toggle}`)).toBeChecked();
            }
            await expect(page.getByTestId('visibility-indicator')).toHaveCount(0);

            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked();
            await expect(page.getByTestId('visibility-indicator')).toBeVisible();
        });

        test('the visibility indicator opens the panel on the Visibility tab', async function () {
            const card = await selectCard('image');
            await card.getByTestId('edit-image-card').click();
            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.locator('[data-lexical-editor] p').first().click();
            await expect(card).toHaveAttribute('data-kg-card-selected', 'false');

            await page.getByTestId('visibility-indicator').click();

            await expectPanelOnTab(card, 'visibility');
        });

        test('selecting another card closes the panel', async function () {
            const first = await selectCard('image', 0);
            await first.getByTestId('edit-image-card').click();
            await expectPanelOnTab(first, 'visibility');

            const second = await selectCard('image', 1);

            await expectToolbarWithoutPanel(second);
            await expect(page.getByTestId('settings-panel')).toHaveCount(0);
        });
    });

    test.describe('Site with visibility turned off', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?visibility=none&content=${content(paragraph('some text'), image())}`});
            await focusEditor(page);
        });

        test('image has no Edit button and double-click does nothing', async function () {
            const card = await selectCard('image');
            await expect(card.getByTestId('edit-image-card')).not.toBeVisible();

            await card.dblclick();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(card.getByTestId('settings-panel')).toHaveCount(0);
        });
    });

    test.describe('Empty image placeholder', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), {...image(), src: ''})}`});
            await focusEditor(page);
        });

        test('double-click and Cmd+Enter do not open the panel', async function () {
            const card = page.locator('[data-kg-card="image"]');
            // the middle of the placeholder is its "select an image" button
            await card.dblclick({position: {x: 5, y: 5}});
            await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');

            await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);

            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.getByTestId('settings-panel')).toHaveCount(0);

            // the shortcut still moves the cursor to a new paragraph after the placeholder
            await page.keyboard.type('After the image');
            await expect(page.locator('[data-lexical-editor] > [data-lexical-decorator] + p')).toHaveText('After the image');
        });
    });

    test.describe('Card with design and visibility settings (video)', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), video({visibility: hidden}))}`});
            await focusEditor(page);
        });

        test('Edit opens the Design tab, with Visibility as the last tab', async function () {
            const card = await selectCard('video');
            await card.getByTestId('edit-video-card').click();

            await expectPanelOnTab(card, 'design');
            const tabs = card.getByTestId('settings-panel').locator('button[data-testid^="tab-"]');
            await expect(tabs).toHaveText(['Design', 'Visibility']);
        });

        test('the indicator opens the Visibility tab, and Edit opens Design again afterwards', async function () {
            const card = page.locator('[data-kg-card="video"]');
            await page.getByTestId('visibility-indicator').click();
            await expectPanelOnTab(card, 'visibility');

            await page.keyboard.press('Escape');
            await expectToolbarWithoutPanel(card);

            await card.getByTestId('edit-video-card').click();
            await expectPanelOnTab(card, 'design');
        });

        test('the indicator switches an open panel to the Visibility tab', async function () {
            const card = await selectCard('video');
            await card.getByTestId('edit-video-card').click();
            await expectPanelOnTab(card, 'design');

            await page.getByTestId('visibility-indicator').click();

            await expectPanelOnTab(card, 'visibility');
        });
    });

    test.describe('Card edited in place (audio)', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), audio)}`});
            await focusEditor(page);
        });

        test('Edit enters edit mode with the Visibility panel', async function () {
            const card = await selectCard('audio');
            const toolbar = card.locator('[data-kg-card-toolbar]');
            await expect(toolbar.getByRole('button', {name: 'Save as snippet'})).toBeVisible();

            await toolbar.getByRole('button', {name: 'Edit'}).click();

            await expectPanelOnTab(card, 'visibility');
        });
    });

    test.describe('Wide and full-width cards', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), image({cardWidth: 'wide', caption: 'A caption', visibility: hidden}))}`});
            await focusEditor(page);
        });

        test('the visibility indicator sits inside the top-left corner of the image', async function () {
            const card = page.locator('[data-kg-card="image"]');
            const indicator = card.getByTestId('visibility-indicator');
            await expect(indicator).toBeVisible();

            const cardBox = await card.boundingBox();
            const imageBox = await card.locator('figure img').first().boundingBox();
            const indicatorBox = await indicator.boundingBox();

            // the indicator must not add space above the image
            expect(imageBox.y - cardBox.y).toBeLessThan(4);

            expect(indicatorBox.x).toBeGreaterThan(imageBox.x);
            expect(indicatorBox.y).toBeGreaterThan(imageBox.y);
            expect(indicatorBox.x - imageBox.x).toBeLessThan(24);
            expect(indicatorBox.y - imageBox.y).toBeLessThan(24);

            await indicator.click();
            await expectPanelOnTab(card, 'visibility');
        });

        test('the visibility indicator sits inside the top-left corner of a full-width video', async function () {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), video({cardWidth: 'full', visibility: hidden}))}`});
            const card = page.locator('[data-kg-card="video"]');
            const indicator = card.getByTestId('visibility-indicator');
            await expect(indicator).toBeVisible();

            const videoBox = await card.locator('figure img').first().boundingBox();
            const indicatorBox = await indicator.boundingBox();

            expect(indicatorBox.x - videoBox.x).toBeGreaterThan(8);
            expect(indicatorBox.x - videoBox.x).toBeLessThan(24);
            expect(indicatorBox.y - videoBox.y).toBeGreaterThan(8);
            expect(indicatorBox.y - videoBox.y).toBeLessThan(24);
        });

        test('keeps the panel inside the viewport', async function () {
            const card = page.locator('[data-kg-card="image"]');
            await card.getByTestId('visibility-indicator').click();

            const box = await card.getByTestId('settings-panel').boundingBox();
            const viewport = page.viewportSize();

            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        });
    });

    test.describe('Snippets', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${content(paragraph('some text'), image({visibility: hidden}))}`});
            await focusEditor(page);
        });

        test('a card inserted from a snippet keeps its visibility and shows the indicator', async function () {
            await selectCard('image');
            await createSnippet(page);

            await page.keyboard.press('Enter');
            await page.keyboard.type('/snippet');
            await expect(page.locator('[data-kg-cardmenu-selected="true"]').filter({hasText: 'snippet'})).toBeVisible();
            await page.keyboard.press('Enter');

            await expect(page.locator('[data-kg-card="image"]')).toHaveCount(2);
            await expect(page.getByTestId('visibility-indicator')).toHaveCount(2);
        });
    });

    test.describe('HTML card', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false'});
        });

        async function insertHtmlCard() {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            return page.locator('[data-kg-card="html"]');
        }

        test('editing shows the Visibility panel next to the code editor', async function () {
            const card = await insertHtmlCard();

            await expectPanelOnTab(card, 'visibility');
            await expect(card.getByTestId('show-visibility')).toHaveCount(0);
        });

        test('paid member settings are hidden when Stripe is not connected', async function () {
            await initialize({page, uri: '/#/?content=false&stripe=false'});
            const card = await insertHtmlCard();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeVisible();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeVisible();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeVisible();
        });
    });

    test.describe('Call to action card', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false'});
        });

        test('the indicator of another card opens that card\'s panel, not the last one used', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await page.keyboard.type('Testing');
            const htmlCard = page.locator('[data-kg-card="html"]');
            await htmlCard.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.keyboard.press('Escape');
            await page.keyboard.press('Enter');
            const ctaCard = await insertCard(page, {cardName: 'call-to-action'});
            await page.click('[data-testid="cta-card-content-editor"]');
            await page.keyboard.type('This is a new CTA Card.');
            await ctaCard.getByTestId('tab-visibility').click();
            await ctaCard.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.locator('[data-lexical-editor] p').first().click();
            await page.getByTestId('visibility-indicator').first().click();

            await expectPanelOnTab(htmlCard, 'visibility');
            await expect(ctaCard.getByTestId('settings-panel')).toHaveCount(0);
        });
    });
});
