import path from 'path';
import {
    assertHTML,
    createDataTransfer,
    createSnippet,
    ctrlOrCmd,
    focusEditor,
    html,
    initialize,
    insertCard
} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Video card is tested in firefox
// Need to get video thumbnail before uploading on the server; for this purpose, convert video to blob https://github.com/TryGhost/Koenig/blob/a04c59c2d81ddc783869c47653aa9d7adf093629/packages/koenig-lexical/src/utils/extractVideoMetadata.js#L45
// The problem is that Chromium can't read video src as blob
test.describe('Video card', async () => {
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

    test('can import serialized video card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    type: 'video',
                    src: '/content/images/2022/11/koenig-lexical.jpg',
                    width: 100,
                    height: 100,
                    caption: 'This is a caption',
                    duration: 60,
                    thumbnailSrc: '/content/images/2022/12/koenig-lexical.png'
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="video">
                    <figure>
                        <div>
                          <div>
                            <img
                              alt="Video thumbnail"
                              src="/content/images/2022/12/koenig-lexical.png" />
                          </div>
                          <div>
                            <button type="button"><svg></svg></button>
                          </div>
                          <div>
                            <div>
                              <svg></svg>
                              <div>
                                <span>0:00</span>
                                /
                                <span>1:00</span>
                              </div>
                              <div><button type="button"></button></div>
                              <button type="button">1×</button>
                              <button type="button"><svg></svg></button>
                              <div>
                                <div></div>
                                <button type="button"></button>
                              </div>
                            </div>
                          </div>
                          <div></div>
                        </div>
                        <figcaption>
                          <div data-kg-allow-clickthrough="true">
                            <div>
                              <div data-kg="editor">
                                <div
                                  contenteditable="true"
                                  role="textbox"
                                  spellcheck="true"
                                  data-lexical-editor="true"
                                >
                                  <p dir="ltr">
                                    <span data-lexical-text="true">This is a caption</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </figcaption>
                      </figure>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('renders video card node', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);
        await insertCard(page, {cardName: 'video'});
        const fileChooser = await fileChooserPromise;

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        // Close the fileChooser by selecting a file
        // Without this line, fileChooser stays open for subsequent tests
        await fileChooser.setFiles([filePath]);
    });

    test('can upload video file from slash menu', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);

        // Upload video file
        await insertCard(page, {cardName: 'video'});
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can upload video file from card menu', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can show errors for failed video upload', async function () {
        await focusEditor(page);
        await uploadVideo(page, 'video-fail.mp4');

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can manage custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Settings panel should be visible
        await expect(await page.getByTestId('settings-panel')).toBeVisible();

        // Custom thumbnail should be visible
        const emptyThumbnail = await page.getByTestId('media-upload-placeholder');
        await expect(emptyThumbnail).toBeVisible();

        // Upload thumbnail, from the thumbnail picker
        const imagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        await emptyThumbnail.click();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByRole('dialog').getByRole('button', {name: 'Upload image'}).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([imagePath]);

        // Thumbnail should be visible, and the picker closed
        await expect(await page.getByTestId('media-upload-filled')).toBeVisible();
        await expect(page.getByRole('dialog')).toBeHidden();

        // Can remove thumbnail
        const replaceButton = page.getByTestId('media-upload-remove');
        await replaceButton.click();
        await expect(await page.getByTestId('media-upload-placeholder')).toBeVisible();
    });

    test('can show errors for custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Settings panel should be visible
        await expect(await page.getByTestId('settings-panel')).toBeVisible();

        // Errors shouldn't be visible
        await expect(page.getByTestId('media-placeholder-errors')).toBeHidden();

        // Custom thumbnail should be visible
        const emptyThumbnail = await page.getByTestId('media-upload-placeholder');

        // Upload thumbnail, from the thumbnail picker
        const imagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-fail.jpeg');
        await emptyThumbnail.click();
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByRole('dialog').getByRole('button', {name: 'Upload image'}).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([imagePath]);

        // Errors should be visible
        await expect(await page.getByTestId('media-upload-errors')).toBeVisible();
    });

    test('can pick a frame from the video as the custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        await page.getByTestId('media-upload-placeholder').click();
        const picker = page.getByRole('dialog');
        await expect(picker.getByRole('heading', {name: 'Select thumbnail'})).toBeVisible();

        // A strip of frames from across the video
        await expect(picker.getByTestId('thumbnail-filmstrip').locator('img')).toHaveCount(8);

        await picker.getByRole('button', {name: 'Select'}).click();

        // The frame becomes the custom thumbnail, shown over the video's own
        await expect(picker).toBeHidden();
        await expect(page.getByTestId('media-upload-filled')).toBeVisible();
        await expect(page.getByAltText('Video custom thumbnail')).toBeVisible();
    });

    test('moves the preview to the frame the scrubber is on', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        await page.getByTestId('media-upload-placeholder').click();
        const picker = page.getByRole('dialog');
        const scrubber = picker.getByRole('slider', {name: 'Thumbnail frame'});
        await expect(scrubber).toBeVisible();

        await scrubber.focus();
        await page.keyboard.press('End');

        const preview = picker.getByTestId('thumbnail-preview');
        await expect.poll(async () => {
            const [time, max] = await Promise.all([
                preview.evaluate(video => (video as HTMLVideoElement).currentTime),
                scrubber.getAttribute('max')
            ]);
            return Math.abs(time - Number(max)) < 0.2;
        }).toBe(true);
        await expect(scrubber).toHaveAttribute('aria-valuetext', /^0:0[34] of 0:04$/);
    });

    test('keeps focus in the thumbnail picker while the picked frame is saved', async function () {
        await focusEditor(page);
        await uploadVideo(page);
        // Saving slowed down, so the picker is still open while it saves; the page isn't reloaded between tests
        const restoreToBlob = await page.evaluateHandle(() => {
            const toBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = function (...args) {
                setTimeout(() => toBlob.apply(this, args), 2000);
            };
            return () => {
                HTMLCanvasElement.prototype.toBlob = toBlob;
            };
        });

        try {
            await page.getByTestId('media-upload-placeholder').click();
            const picker = page.getByRole('dialog', {name: 'Select thumbnail'});
            const select = picker.getByRole('button', {name: 'Select'});
            await expect(select).toBeEnabled();
            await select.focus();
            await page.keyboard.press('Enter');

            // Disabling a focused button drops focus to the page
            await expect(select).toHaveAttribute('aria-disabled', 'true');
            await expect(select).toBeFocused();

            await page.keyboard.press('Escape');
            await expect(picker).toBeHidden();
        } finally {
            await restoreToBlob.evaluate(restore => restore());
        }
    });

    test('can close the thumbnail picker without changing the thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        await page.getByTestId('media-upload-placeholder').click();
        const picker = page.getByRole('dialog');
        await picker.getByRole('button', {name: 'Cancel'}).click();

        await expect(picker).toBeHidden();
        await expect(page.getByTestId('media-upload-placeholder')).toBeVisible();
    });

    test('keeps keyboard focus in the thumbnail picker, and gives it back to the tile on close', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Opened from the keyboard
        await page.getByTestId('media-upload-placeholder').getByRole('button').focus();
        await page.keyboard.press('Enter');
        const picker = page.getByRole('dialog', {name: 'Select thumbnail'});
        await expect(picker).toBeVisible();

        const focusIsInPicker = () => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
        expect(await focusIsInPicker()).toBe(true);
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            expect(await focusIsInPicker()).toBe(true);
        }
        await page.keyboard.press('Shift+Tab');
        expect(await focusIsInPicker()).toBe(true);

        await page.keyboard.press('Escape');
        await expect(picker).toBeHidden();
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-testid="media-upload-placeholder"]')))).toBe(true);
    });

    test('closes the thumbnail picker on Escape after a click in it, and from its close button by keyboard', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        await page.getByTestId('media-upload-placeholder').click();
        let picker = page.getByRole('dialog', {name: 'Select thumbnail'});
        await picker.getByRole('heading', {name: 'Select thumbnail'}).click();
        await page.keyboard.press('Escape');
        await expect(picker).toBeHidden();

        await page.getByTestId('media-upload-placeholder').click();
        picker = page.getByRole('dialog', {name: 'Select thumbnail'});
        await picker.getByRole('button', {name: 'Close dialog'}).focus();
        await page.keyboard.press('Enter');
        await expect(picker).toBeHidden();
    });

    test('shows the current thumbnail and offers an image when frames can\'t be read from the video', async function () {
        // Not a video at all: as unreadable as a video on another domain that doesn't allow it
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    type: 'video',
                    src: '/content/images/2022/11/koenig-lexical.jpg',
                    width: 100,
                    height: 100,
                    duration: 60,
                    thumbnailSrc: '/content/images/2022/12/koenig-lexical.png'
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));
        await initialize({page, uri: `/#/?content=${contentParam}`});

        await page.locator('[data-kg-card="video"]').click();
        await page.getByTestId('edit-video-card').click();
        await page.getByTestId('media-upload-placeholder').click();

        // No frames to scrub through: the thumbnail as it is, and an image to replace it with
        const picker = page.getByRole('dialog');
        await expect(picker.getByRole('img', {name: 'Current thumbnail'})).toHaveAttribute('src', '/content/images/2022/12/koenig-lexical.png');
        await expect(picker.getByRole('slider', {name: 'Thumbnail frame'})).toBeHidden();
        await expect(picker.getByRole('button', {name: 'Select', exact: true})).toBeHidden();

        const fileChooserPromise = page.waitForEvent('filechooser');
        await picker.getByRole('button', {name: 'Upload image'}).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png')]);

        await expect(picker).toBeHidden();
        await expect(page.getByTestId('media-upload-filled')).toBeVisible();
    });

    test('can upload dropped video', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open video card and dismiss files chooser to prepare card for video dropping
        await insertCard(page, {cardName: 'video'});
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can show errors if was dropped a file with wrong extension to video placeholder', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open video card and dismiss files chooser to prepare card for video dropping
        await insertCard(page, {cardName: 'video'});
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        //  Drop file
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can upload dropped custom thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await uploadVideo(page);

        // Wait for custom thumbnail
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('media-upload-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-upload-placeholder').dispatchEvent('drop', {dataTransfer});

        // Thumbnail should be visible
        await expect(await page.getByTestId('media-upload-filled')).toBeVisible();
    });

    test('can show errors if was dropped a file with wrong extension to custom thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);
        await uploadVideo(page);

        // Wait for custom thumbnail
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);
        await page.getByTestId('media-upload-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('media-upload-errors')).toBeVisible();
    });

    test('renders video card toolbar', async function () {
        await focusEditor(page);

        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        // Leave editing mode to display the toolbar
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        await expect(await page.locator('[data-kg-card-toolbar="video"]')).toBeVisible();
    });

    test('video card toolbar has Edit button', async function () {
        await focusEditor(page);

        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        // Leave editing mode to display the toolbar
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        await expect(await page.locator('[data-kg-card-toolbar="video"]')).toBeVisible();

        // Edit video card
        await page.waitForSelector('[data-testid="edit-video-card"]');
        await page.getByTestId('edit-video-card').click();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('adds extra paragraph when video is inserted at end of document', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Video"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('does not add extra paragraph when video is inserted mid-document', async function () {
        await focusEditor(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Testing');
        await page.keyboard.press('ArrowUp');
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Video"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
        `, {ignoreCardContents: true});
    });

    test('can add snippet', async function () {
        await focusEditor(page);

        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await expect(page.locator('[data-kg-cardmenu-selected="true"]').filter({hasText: 'snippet'})).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="video"]')).toHaveCount(2);
    });

    test('can undo/redo without losing nested editor content', async () => {
        await focusEditor(page);
        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="media-upload-placeholder"]');

        await page.click('[data-testid="video-card-caption"]');
        await page.keyboard.type('Test caption');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd(page)}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="video">
                    <figure>
                        <div>
                          <div>
                            <img
                              alt="Video thumbnail"
                              src="blob:..." />
                          </div>
                          <div>
                            <button type="button"><svg></svg></button>
                          </div>
                          <div>
                            <div>
                              <svg></svg>
                              <div>
                                <span>0:00</span>
                                /
                                <span>0:04</span>
                              </div>
                              <div><button type="button"></button></div>
                              <button type="button">1×</button>
                              <button type="button"><svg></svg></button>
                              <div>
                                <div></div>
                                <button type="button"></button>
                              </div>
                            </div>
                          </div>
                          <div></div>
                        </div>
                        <figcaption>
                          <div data-kg-allow-clickthrough="true">
                            <div>
                              <div data-kg="editor">
                                <div
                                  contenteditable="true"
                                  role="textbox"
                                  spellcheck="true"
                                  data-lexical-editor="true"
                                >
                                  <p dir="ltr">
                                    <span data-lexical-text="true">Test caption</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </figcaption>
                      </figure>
                    <div data-kg-card-toolbar="video"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });
});

async function uploadVideo(page, fileName = 'video.mp4') {
    const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/${fileName}`);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await insertCard(page, {cardName: 'video'});
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
}
