import fs from 'fs';
import jsdom from 'jsdom';
import prettier from '@prettier/sync';
import startCase from 'lodash/startCase.js';
import {E2E_PORT} from '../../playwright.config';
import {expect} from '@playwright/test';

const {JSDOM} = jsdom;

export async function initialize({page, uri = '/#/?content=false'}) {
    const url = `http://localhost:${E2E_PORT}${uri}`;

    const currentViewportSize = page.viewportSize();
    if (currentViewportSize.width !== 1000 || currentViewportSize.height !== 1000) {
        await page.setViewportSize({width: 1000, height: 1000});
    }

    const currentUrl = page.url();
    if (currentUrl === 'about:blank') {
        // First page load
        await page.goto(url);

        await page.waitForSelector('.koenig-lexical');

        await exposeLexicalEditor(page);
    } else {
        // Subsequent pages navigated to using react router
        await page.evaluate(async ([navigateTo, force]) => {
            window.lexicalEditor.blur();
            window.lexicalEditor.setEditorState(window.originalEditorState);

            if (force) {
                // Purposefully navigate away from the current page to ensure component is reloaded
                window.navigate('/404');
                await new Promise((res) => {
                    setTimeout(() => {
                        // Navigate in a task to ensure React Router cannot optimise out our first navigation
                        window.navigate(navigateTo);
                        res();
                    }, 10);
                });
            } else {
                await window.navigate(navigateTo);
            }
        }, [uri.slice(2), currentUrl === url]);
        await exposeLexicalEditor(page);
    }
}

async function exposeLexicalEditor(page) {
    await page.waitForSelector('[data-lexical-editor]');
    await page.evaluate(() => {
        window.lexicalEditor = document.querySelector('[data-lexical-editor]').__lexicalEditor;
        window.originalEditorState = window.lexicalEditor.getEditorState();
    });
}

export async function focusEditor(page, parentSelector = '.koenig-lexical') {
    const selector = `${parentSelector} div[contenteditable="true"]`;
    await page.focus(selector);
}

export async function assertHTML(
    page,
    expectedHtml,
    {
        selector = 'div[contenteditable="true"]',
        ignoreClasses = true,
        ignoreInlineStyles = true,
        ignoreInnerSVG = true,
        getBase64FileFormat = true,
        ignoreCardContents = false,
        ignoreCardToolbarContents = false,
        ignoreDragDropAttrs = true,
        ignoreDataTestId = true,
        ignoreCardCaptionContents = false
    } = {}
) {
    const actualHtml = await page.$eval(selector, e => e.innerHTML);
    const actual = prettifyHTML(actualHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles,
        ignoreInnerSVG,
        getBase64FileFormat,
        ignoreCardContents,
        ignoreCardToolbarContents,
        ignoreDragDropAttrs,
        ignoreDataTestId,
        ignoreCardCaptionContents
    });
    const expected = prettifyHTML(expectedHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles,
        ignoreInnerSVG,
        getBase64FileFormat,
        ignoreCardContents,
        ignoreCardToolbarContents,
        ignoreDragDropAttrs,
        ignoreDataTestId,
        ignoreCardCaptionContents
    });
    expect(actual).toEqual(expected);
}

export function prettifyHTML(string, options = {}) {
    let output = string;

    if (options.ignoreClasses) {
        output = output.replace(/\sclass="([^"]*)"/g, '');
    }

    if (options.ignoreDataTestId) {
        output = output.replace(/\sdata-testid="([^"]*)"/g, '');
    }

    if (options.ignoreInlineStyles) {
        output = output.replace(/\sstyle="([^"]*)"/g, '');
    }
    if (options.ignoreInnerSVG) {
        output = output.replace(/<svg[^>]*>.*?<\/svg>/g, '<svg></svg>');
    }

    if (options.getBase64FileFormat) {
        output = output.replace(/(^|[\s">])data:([^;]*);([^"]*),([^"]*)/g, '$1data:$2;$3,BASE64DATA');
    }

    if (options.ignoreDragDropAttrs) {
        output = output.replace(/data-koenig-dnd-.*?=".*?"/g, '');
    }

    // replace all instances of blob:http with "blob:..."
    output = output.replace(/blob:http[^"]*/g, 'blob:...');

    if (options.ignoreCardContents || options.ignoreCardToolbarContents || options.ignoreCardCaptionContents) {
        const {document} = (new JSDOM(output)).window;

        const querySelectors = [];
        if (options.ignoreCardContents) {
            querySelectors.push('[data-kg-card]');
        }
        if (options.ignoreCardToolbarContents) {
            querySelectors.push('[data-kg-card-toolbar]');
        }
        if (options.ignoreCardCaptionContents) {
            querySelectors.push('figcaption');
        }

        document.querySelectorAll(querySelectors.join(', ')).forEach((element) => {
            element.innerHTML = '';
        });
        output = document.body.innerHTML;
    }

    return prettier
        .format(output, {
            attributeGroups: ['$DEFAULT', '^data-'],
            attributeSort: 'ASC',
            bracketSameLine: true,
            htmlWhitespaceSensitivity: 'ignore',
            parser: 'html'
        })
        .trim();
}

export function prettifyJSON(string) {
    let output = string;

    // replace urls inside markdown links
    output = output.replace(/\(blob:http[^"]*\)/g, '(blob:...)');
    // replace any other urls
    output = output.replace(/blob:http[^"]*/g, 'blob:...');

    return prettier.format(output, {
        parser: 'json'
    });
}

// This function does not suppose to do anything, it's only used as a trigger
// for prettier auto-formatting (https://prettier.io/blog/2020/08/24/2.1.0.html#api)
export function html(partials, ...params) {
    let output = '';
    for (let i = 0; i < partials.length; i++) {
        output += partials[i];
        if (i < partials.length - 1) {
            output += params[i];
        }
    }
    return output;
}

export async function assertSelection(page, expected) {
    // Assert the selection of the editor matches the snapshot
    const selection = await page.evaluate(() => {
        const rootElement = document.querySelector('div[contenteditable="true"]');

        const getPathFromNode = (node) => {
            const path = [];
            if (node === rootElement) {
                return [];
            }
            while (node !== null) {
                const parent = node.parentNode;
                if (parent === null || node === rootElement) {
                    break;
                }
                path.push(Array.from(parent.childNodes).indexOf(node));
                node = parent;
            }
            return path.reverse();
        };

        const {anchorNode, anchorOffset, focusNode, focusOffset} = window.getSelection();

        return {
            anchorOffset,
            anchorPath: getPathFromNode(anchorNode),
            focusOffset,
            focusPath: getPathFromNode(focusNode)
        };
    }, expected);

    expect(selection.anchorPath).toEqual(expected.anchorPath);

    if (Array.isArray(expected.anchorOffset)) {
        const [start, end] = expected.anchorOffset;
        expect(selection.anchorOffset).toBeGreaterThanOrEqual(start);
        expect(selection.anchorOffset).toBeLessThanOrEqual(end);
    } else {
        expect(selection.anchorOffset).toEqual(expected.anchorOffset);
    }

    expect(selection.focusPath).toEqual(expected.focusPath);

    if (Array.isArray(expected.focusOffset)) {
        const [start, end] = expected.focusOffset;
        expect(selection.focusOffset).toBeGreaterThanOrEqual(start);
        expect(selection.focusOffset).toBeLessThanOrEqual(end);
    } else {
        expect(selection.focusOffset).toEqual(expected.focusOffset);
    }
}

export async function assertPosition(page, selector, expectedBox, {threshold = 0} = {}) {
    const assertedElem = await page.$(selector);
    const assertedBox = await assertedElem.boundingBox();

    ['x', 'y'].forEach((boxProperty) => {
        if (Object.prototype.hasOwnProperty.call(expectedBox, boxProperty)) {
            expect(assertedBox[boxProperty], boxProperty).toBeGreaterThanOrEqual(expectedBox[boxProperty] - threshold);
            expect(assertedBox[boxProperty], boxProperty).toBeLessThanOrEqual(expectedBox[boxProperty] + threshold);
        }
    });
}

export async function getEditorStateJSON(page) {
    const json = await page.evaluate(() => {
        const rootElement = document.querySelector('div[contenteditable="true"]');
        const editor = rootElement.__lexicalEditor;
        return JSON.stringify(editor.getEditorState().toJSON());
    });

    return json;
}

export async function assertRootChildren(page, expectedState) {
    const state = await getEditorStateJSON(page);
    const actualState = JSON.stringify(JSON.parse(state).root.children);

    const actual = prettifyJSON(actualState);
    const expected = prettifyJSON(expectedState);

    expect(actual).toEqual(expected);
}

export async function paste(page, data) {
    const setDataCommands = Object.keys(data).map((mimeType) => {
        return `
            dataTransfer.setData('${mimeType}', ${JSON.stringify(data[mimeType])});
        `;
    });

    const pasteCommand = `
        const dataTransfer = new DataTransfer();

        ${setDataCommands.join('\n')};

        document.activeElement.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        }));

        dataTransfer.clearData();
    `;

    await page.evaluate(pasteCommand);
}

export async function pasteText(page, content) {
    await paste(page, {'text/plain': content});
}

export async function pasteHtml(page, content) {
    await paste(page, {'text/html': content});
}

export async function pasteLexical(page, content) {
    await paste(page, {'application/x-lexical-editor': content});
}

export async function pasteFiles(page, files) {
    const dataTransfer = await createDataTransfer(page, files);

    await page.evaluate(async (clipboardData) => {
        document.activeElement.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: clipboardData,
            bubbles: true,
            cancelable: true
        }));

        clipboardData.clearData();
    }, dataTransfer);
}

export async function pasteFilesWithText(page, files, text = {}) {
    const dataTransfer = await createDataTransfer(page, files);

    await page.evaluate(async ({clipboardData, textData}) => {
        Object.keys(textData).forEach((mimeType) => {
            clipboardData.setData(mimeType, textData[mimeType]);
        });

        document.activeElement.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: clipboardData,
            bubbles: true,
            cancelable: true
        }));

        clipboardData.clearData();
    }, {clipboardData: dataTransfer, textData: text});
}

export async function dragMouse(
    page,
    fromBoundingBox,
    toBoundingBox,
    positionStart = 'middle',
    positionEnd = 'middle',
    mouseUp = true,
    hover = 0,
    steps = 1
) {
    let fromX = fromBoundingBox.x;
    let fromY = fromBoundingBox.y;
    if (positionStart === 'middle') {
        fromX += fromBoundingBox.width / 2;
        fromY += fromBoundingBox.height / 2;
    } else if (positionStart === 'end') {
        fromX += fromBoundingBox.width;
        fromY += fromBoundingBox.height;
    }
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();

    let toX = toBoundingBox.x;
    let toY = toBoundingBox.y;
    if (positionEnd === 'middle') {
        toX += toBoundingBox.width / 2;
        toY += toBoundingBox.height / 2;
    } else if (positionEnd === 'end') {
        toX += toBoundingBox.width;
        toY += toBoundingBox.height;
    }

    await page.mouse.move(toX, toY, {steps: steps});

    if (hover > 0) {
        await page.waitForTimeout(hover);
    }

    if (mouseUp) {
        await page.mouse.up();
    }
}

export function isMac() {
    // issue https://github.com/microsoft/playwright/issues/12168
    return process.platform === 'darwin';
}

export function ctrlOrCmd() {
    return isMac() ? 'Meta' : 'Control';
}

// note: we always use lowercase for the cardName but we use start case for the menu item attribute
export async function insertCard(page, {cardName, nth = 0}) {
    let card = startCase(cardName);
    await page.keyboard.type(`/${cardName}`);
    await expect(page.locator(`[data-kg-card-menu-item="${card}" i][data-kg-cardmenu-selected="true"]`)).toBeVisible();
    await page.keyboard.press('Enter');
    // hr is the one case we don't match the card name to the data attribute
    if (card === 'Divider') {
        await expect(page.locator(`[data-kg-card="horizontalrule"]`).nth(nth)).toBeVisible();
    } else {
        await expect(page.locator(`[data-kg-card="${cardName}" i]`).nth(nth)).toBeVisible();
    }
}

export async function createSnippet(page) {
    await page.waitForSelector('[data-testid="create-snippet"]');
    await page.getByTestId('create-snippet').click();
    await page.getByTestId('snippet-name').fill('snippet');
    await page.keyboard.press('Enter');
}

export async function getScrollPosition(page) {
    return await page.evaluate(() => {
        return document.querySelector('.h-full.overflow-auto').scrollTop;
    });
}

export async function enterUntilScrolled(page) {
    let scrollPosition = 0;

    while (scrollPosition === 0) {
        await page.keyboard.type('hello\nhello\nhello\nhello\nhello\nhello');
        await page.keyboard.press('Enter');

        // Get scroll position
        scrollPosition = await getScrollPosition(page);
    }
}

export async function expectUnchangedScrollPosition(page, wrapper) {
    const start = await getScrollPosition(page);
    await wrapper();
    const end = await getScrollPosition(page);
    expect(start).toEqual(end);
}

export async function createDataTransfer(page, data = []) {
    const filesData = [];

    data.forEach((file) => {
        const buffer = fs.readFileSync(file.filePath);

        filesData.push({
            buffer: buffer.toJSON().data,
            name: file.fileName,
            type: file.fileType
        });
    });

    return await page.evaluateHandle((dataset = []) => {
        const dt = new DataTransfer();

        dataset.forEach((fileData) => {
            const file = new File([new Uint8Array(fileData.buffer)], fileData.name, {type: fileData.type});
            dt.items.add(file);
        });

        return dt;
    }, filesData);
}

export async function getEditorState(page) {
    return await page.evaluate(() => {
        return window.lexicalEditor.getEditorState().toJSON();
    });
}
