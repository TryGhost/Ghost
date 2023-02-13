import {expect} from 'vitest';
import {chromium, webkit, firefox} from 'playwright';
import jsdom from 'jsdom';
import prettier from 'prettier';
import {E2E_PORT} from '../e2e-setup';

const {JSDOM} = jsdom;

const BROWSER_NAME = process.env.browser || 'chromium';

export async function startApp(browserName = BROWSER_NAME) {
    const browser = await {chromium, webkit, firefox}[browserName].launch();
    const page = await browser.newPage();

    return {
        app: {
            stop: async () => {
                await browser.close();
            }
        },
        browser,
        page
    };
}

export async function initialize({page}) {
    const url = `http://127.0.0.1:${E2E_PORT}/?content=false`;

    page.setViewportSize({width: 1000, height: 1000});

    await page.goto(url);
    await page.waitForSelector('.koenig-lexical');

    await exposeLexicalEditor(page);
}

async function exposeLexicalEditor(page) {
    await page.waitForSelector('[data-lexical-editor]');
    await page.evaluate(() => {
        window.lexicalEditor = document.querySelector('[data-lexical-editor]').__lexicalEditor;
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
        ignoreClasses = true,
        ignoreInlineStyles = true,
        ignoreInnerSVG = true,
        getBase64FileFormat = true,
        ignoreCardContents = false,
        ignoreCardToolbarContents = false,
        ignoreDragDropAttrs = true
    } = {}
) {
    const actualHtml = await page.$eval('div[contenteditable="true"]', e => e.innerHTML);
    const actual = prettifyHTML(actualHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles,
        ignoreInnerSVG,
        getBase64FileFormat,
        ignoreCardContents,
        ignoreCardToolbarContents,
        ignoreDragDropAttrs
    });
    const expected = prettifyHTML(expectedHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles,
        ignoreInnerSVG,
        getBase64FileFormat,
        ignoreCardContents,
        ignoreCardToolbarContents,
        ignoreDragDropAttrs
    });
    expect(actual).toEqual(expected);
}

export function prettifyHTML(string, options = {}) {
    let output = string;

    if (options.ignoreClasses) {
        output = output.replace(/\sclass="([^"]*)"/g, '');
    }

    if (options.ignoreInlineStyles) {
        output = output.replace(/\sstyle="([^"]*)"/g, '');
    }
    if (options.ignoreInnerSVG) {
        output = output.replace(/<svg[^>]*>.*<\/svg>/g, '<svg></svg>');
    }

    if (options.getBase64FileFormat) {
        output = output.replace(/(^|[\s">])data:([^;]*);([^"]*),([^"]*)/g, '$1data:$2;$3,BASE64DATA');
    }

    if (options.ignoreDragDropAttrs) {
        output = output.replace(/data-koenig-dnd-.*?=".*?"/g, '');
    }

    // replace all instances of blob:http with "blob:..."
    output = output.replace(/blob:http[^"]*/g, 'blob:...');

    if (options.ignoreCardContents || options.ignoreCardToolbarContents) {
        const {document} = (new JSDOM(output)).window;

        const querySelectors = [];
        if (options.ignoreCardContents) {
            querySelectors.push('[data-kg-card]');
        }
        if (options.ignoreCardToolbarContents) {
            querySelectors.push('[data-kg-card-toolbar]');
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

export async function pasteText(page, text) {
    const pasteCommand = `
        const text = ${JSON.stringify(text)};
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);

        document.activeElement.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        }));

        dataTransfer.clearData();
    `;

    await page.evaluate(pasteCommand);
}

export async function dragMouse(
    page,
    fromBoundingBox,
    toBoundingBox,
    positionStart = 'middle',
    positionEnd = 'middle',
    mouseUp = true,
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

    await page.mouse.move(toX, toY);

    if (mouseUp) {
        await page.mouse.up();
    }
}
