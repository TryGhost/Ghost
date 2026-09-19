import {expect, test} from '@playwright/test';
import {focusEditor,initialize, insertCard} from '../utils/e2e';

const imageCardContent = encodeURIComponent(JSON.stringify({
    root: {
        children: [{
            type: 'image',
            src: '/content/images/2022/11/koenig-lexical.jpg',
            width: 3840,
            height: 2160,
            title: '',
            alt: '',
            caption: '',
            cardWidth: 'regular'
        }],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
}));

test.describe('Content Visibility', async () => {
    let page;
    async function insertHtmlCard() {
        await focusEditor(page);
        await insertCard(page, {cardName: 'html'});
        await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
        await page.keyboard.type('Testing');
        // exit editing mode - use Escape instead of Meta+Enter for cross-platform compatibility
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
        return page.locator('[data-kg-card="html"]');
    }
    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('HTML card', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false'});
        });

        test('toolbar shows edit icon', async function () {
            await insertHtmlCard();

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [data-testid="edit-html"]')).toBeVisible();
        });

        test('toolbar does not show settings panel by default on click', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();
            await expect(card.getByTestId('settings-panel')).not.toBeVisible();
        });

        test('clicking on edit button transitions card into edit mode', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        });

        test('visibility settings defaults to show on email and web and all members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-message')).not.toBeVisible();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();
        });

        test('can toggle visibility settings ', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-web-freeMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-web-paidMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-email-freeMembers').click();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-email-paidMembers').click();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeChecked();

            // change from the beta - visibility message is no longer shown
            await expect(card.getByTestId('visibility-message')).not.toBeVisible();
        });

        test('toggling settings in visibility panel does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-toggle-web-nonMembers').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('visibility icon is shown when visibility changes from shown-to-all', async function () {
            const card = await insertHtmlCard();

            await expect(page.getByTestId('visibility-indicator')).not.toBeVisible();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await expect(page.getByTestId('visibility-indicator')).toBeVisible();
        });

        test('paid member visibility settings hidden when stripe is not enabled', async function () {
            await initialize({page, uri: '/#/?content=false&stripe=false'});
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeVisible();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeVisible();
        });

        test('visibility indicator can toggle visibility settings panel', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.getByTestId('post-title').click();
            await page.getByTestId('visibility-indicator').click();

            await expect(card.getByTestId('settings-panel')).toBeVisible();
        });

        test('clicking show visibility in toolbar does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await page.getByTestId('show-visibility').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('clicking visibility indicator does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.getByTestId('post-title').click();

            await page.getByTestId('visibility-indicator').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });
    });

    test.describe('Image card', async function () {
        async function selectImageCard() {
            await focusEditor(page);
            await page.click('[data-kg-card="image"]');
            const card = page.locator('[data-kg-card="image"]');
            await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
            return card;
        }

        test.beforeEach(async () => {
            await initialize({page, uri: `/#/?content=${imageCardContent}`});
        });

        test('toolbar shows visibility icon', async function () {
            const card = await selectImageCard();

            await expect(page.locator('[data-kg-card-toolbar="image"]')).toBeVisible();
            await expect(card.getByTestId('show-visibility')).toBeVisible();
        });

        test('visibility settings default to shown on web and email for all members', async function () {
            const card = await selectImageCard();

            await card.getByTestId('show-visibility').click();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();
        });

        test('can hide the image on web while keeping it in the email', async function () {
            const card = await selectImageCard();

            await card.getByTestId('show-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();
            await card.getByTestId('visibility-toggle-web-freeMembers').click();
            await card.getByTestId('visibility-toggle-web-paidMembers').click();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).not.toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();

            await expect(page.getByTestId('visibility-indicator')).toBeVisible();
        });

        test('showing visibility settings does not trigger edit mode', async function () {
            const card = await selectImageCard();

            await card.getByTestId('show-visibility').click();

            await expect(card.getByTestId('settings-panel')).toBeVisible();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('visibility indicator can open the visibility settings panel', async function () {
            const card = await selectImageCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.getByTestId('post-title').click();
            await expect(card.getByTestId('settings-panel')).not.toBeVisible();

            await page.getByTestId('visibility-indicator').click();

            await expect(card.getByTestId('settings-panel')).toBeVisible();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('visibility settings panel can be toggled closed again', async function () {
            const card = await selectImageCard();

            await card.getByTestId('show-visibility').click();
            await expect(card.getByTestId('settings-panel')).toBeVisible();

            await card.getByTestId('show-visibility').click();
            await expect(card.getByTestId('settings-panel')).not.toBeVisible();
        });
    });

    // Media cards render from serialized content so each one can be selected
    // without going through an upload flow
    const mediaCards = [
        {
            name: 'gallery',
            node: {
                type: 'gallery',
                version: 1,
                images: [{
                    row: 0,
                    fileName: 'retreat-1.jpg',
                    src: '/content/images/2023/04/retreat-1.jpg',
                    width: 3840,
                    height: 2160,
                    title: 'Title 1',
                    alt: 'Alt 1',
                    caption: ''
                }],
                caption: ''
            }
        },
        {
            name: 'video',
            node: {
                type: 'video',
                src: '/content/images/2022/11/koenig-lexical.jpg',
                width: 100,
                height: 100,
                caption: '',
                duration: 60,
                thumbnailSrc: '/content/images/2022/12/koenig-lexical.png'
            }
        },
        {
            name: 'audio',
            node: {
                type: 'audio',
                src: '/content/images/2022/11/koenig-lexical.jpg',
                title: 'This is a title',
                duration: 60,
                mimeType: 'audio/mp3',
                thumbnailSrc: '/content/images/2022/12/koenig-lexical.png'
            }
        },
        {
            name: 'file',
            node: {
                type: 'file',
                src: '/content/images/2022/11/koenig-lexical.jpg',
                fileTitle: 'This is a title',
                fileCaption: 'This is a description',
                fileName: 'koenig-lexical.jpg',
                fileSize: 1200000
            }
        },
        {
            name: 'embed',
            node: {
                type: 'embed',
                html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allowfullscreen title="Project Binky"></iframe>',
                metadata: {
                    author_name: 'Bad Obsession Motorsport',
                    provider_name: 'YouTube',
                    thumbnail_url: 'https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg',
                    title: 'Project Binky'
                },
                embedType: 'video',
                url: 'https://www.youtube.com/watch?v=7hCPODjJO7s',
                caption: ''
            }
        }
    ];

    for (const {name, node} of mediaCards) {
        test.describe(`${name} card`, async function () {
            const content = encodeURIComponent(JSON.stringify({
                root: {
                    children: [node],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));

            async function selectCard() {
                await focusEditor(page);
                await page.click(`[data-kg-card="${name}"]`);
                const card = page.locator(`[data-kg-card="${name}"]`);
                await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
                return card;
            }

            test.beforeEach(async () => {
                await initialize({page, uri: `/#/?content=${content}`});
            });

            test('toolbar shows visibility icon', async function () {
                const card = await selectCard();

                await expect(card.getByTestId('show-visibility')).toBeVisible();
            });

            test('visibility settings default to shown on web and email for all members', async function () {
                const card = await selectCard();

                await card.getByTestId('show-visibility').click();

                await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked();
                await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked();
                await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked();
                await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
                await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();
            });

            test('can hide the card on web while keeping it in the email', async function () {
                const card = await selectCard();

                await card.getByTestId('show-visibility').click();

                await card.getByTestId('visibility-toggle-web-nonMembers').click();
                await card.getByTestId('visibility-toggle-web-freeMembers').click();
                await card.getByTestId('visibility-toggle-web-paidMembers').click();

                await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked();
                await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
                await expect(page.getByTestId('visibility-indicator')).toBeVisible();
            });

            test('showing visibility settings does not trigger edit mode', async function () {
                const card = await selectCard();

                await card.getByTestId('show-visibility').click();

                await expect(card.getByTestId('settings-panel')).toBeVisible();
                await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            });
        });
    }

    test.describe('Edge cases', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false'});
        });
        // We need to ensure that when we used the visibility indicator to toggle the visibility settings and then
        // switch to a different card type, the visibility settings state is reset so that you don't have visibility settings
        // to be visible when it was not explicitly set.
        test('Visibility Settings Card state are reset when switching between different card types', async function () {
            // Set up HTML card with visibility settings
            const htmlCard = await insertHtmlCard();
            await htmlCard.getByTestId('show-visibility').click();
            await htmlCard.getByTestId('tab-visibility').click();
            await htmlCard.getByTestId('visibility-toggle-web-nonMembers').click();

            // Add CTA card and configure its visibility
            await page.keyboard.press('Enter');
            const ctaCard = await insertCard(page, {cardName: 'call-to-action'});
            await page.click('[data-testid="cta-card-content-editor"]');
            await page.keyboard.type('This is a new CTA Card.');

            await ctaCard.getByTestId('tab-visibility').click();
            await ctaCard.getByTestId('visibility-toggle-web-nonMembers').click();
            await page.click('body');
            // Verify visibility indicator works for HTML card
            await page.getByTestId('visibility-indicator').first().click();
            await expect(htmlCard.getByTestId('settings-panel')).toBeVisible();
        });
    });
});
