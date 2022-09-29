import {preview} from 'vite';
import {expect} from 'vitest';
import puppeteer from 'puppeteer';
import prettier from 'prettier';

export const E2E_PORT = process.env.E2E_PORT || 3000;

export async function startApp() {
    const server = await preview({preview: {port: E2E_PORT}});
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    return {
        app: {
            stop: async () => {
                await browser.close();
                await new Promise((resolve, reject) => {
                    server.httpServer.close(error => (error ? reject(error) : resolve()));
                });
            }
        },
        browser,
        page
    };
}

export async function initialize({page}) {
    const url = `http://127.0.0.1:${E2E_PORT}/`;

    page.setViewport({width: 1000, height: 1000});

    await page.goto(url);
    await page.waitForSelector('.koenig-lexical');
}

export async function focusEditor(page, parentSelector = '.koenig-lexical') {
    const selector = `${parentSelector} div[contenteditable="true"]`;
    await page.focus(selector);
}

export async function assertHTML(
    page,
    expectedHtml,
    {ignoreClasses = true, ignoreInlineStyles = true} = {}
) {
    const actualHtml = await page.$eval('div[contenteditable="true"]', e => e.innerHTML);
    const actual = prettifyHTML(actualHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles
    });
    const expected = prettifyHTML(expectedHtml.replace(/\n/gm, ''), {
        ignoreClasses,
        ignoreInlineStyles
    });
    expect(actual).toEqual(expected);
}

export function prettifyHTML(string, {ignoreClasses, ignoreInlineStyles} = {}) {
    let output = string;

    if (ignoreClasses) {
        output = output.replace(/\sclass="([^"]*)"/g, '');
    }

    if (ignoreInlineStyles) {
        output = output.replace(/\sstyle="([^"]*)"/g, '');
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

        const {anchorNode, anchorOffset, focusNode, focusOffset} =
        window.getSelection();

        return {
            anchorOffset,
            anchorPath: getPathFromNode(anchorNode),
            focusOffset,
            focusPath: getPathFromNode(focusNode)
        };
    }, expected);
    expect(selection.anchorPath).toEqual(expected.anchorPath);
    expect(selection.focusPath).toEqual(expected.focusPath);
    if (Array.isArray(expected.anchorOffset)) {
        const [start, end] = expected.anchorOffset;
        expect(selection.anchorOffset).toBeGreaterThanOrEqual(start);
        expect(selection.anchorOffset).toBeLessThanOrEqual(end);
    } else {
        expect(selection.anchorOffset).toEqual(expected.anchorOffset);
    }
    if (Array.isArray(expected.focusOffset)) {
        const [start, end] = expected.focusOffset;
        expect(selection.focusOffset).toBeGreaterThanOrEqual(start);
        expect(selection.focusOffset).toBeLessThanOrEqual(end);
    } else {
        expect(selection.focusOffset).toEqual(expected.focusOffset);
    }
}
