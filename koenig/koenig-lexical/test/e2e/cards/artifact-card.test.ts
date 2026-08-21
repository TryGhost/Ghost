import {expect, test} from '@playwright/test';
import {focusEditor, initialize} from '../../utils/e2e';

test.describe('Artifact card', function () {
    test('inserts an empty card without opening Builder', async function ({page}) {
        await initialize({page});
        await focusEditor(page);

        await page.keyboard.type('/artifact');
        await page.waitForSelector('[data-kg-card-menu-item="Artifact"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');

        const card = page.locator('[data-kg-card="artifact"]');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card.getByRole('button', {name: 'Create artifact'})).toBeVisible();
    });

    test('applies the Builder result to the originating card', async function ({page}) {
        await initialize({page, uri: '/#/?content=false&artifactBuilderResult=saved'});
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        artifactVersion: 1,
                        description: 'The first card must stay unchanged.',
                        html: '<!doctype html><html><head><title>First artifact</title></head><body>First</body></html>',
                        id: 'first-artifact',
                        title: 'First artifact',
                        type: 'artifact',
                        version: 1
                    }, {
                        artifactVersion: 1,
                        description: '',
                        html: '',
                        id: 'second-artifact',
                        title: '',
                        type: 'artifact',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editor = window.lexicalEditor;
            editor.setEditorState(editor.parseEditorState(serializedState));
        });

        await page.getByRole('button', {name: 'Create artifact'}).click();

        const cards = page.locator('[data-kg-card="artifact"]');
        const card = cards.nth(1);
        await expect(card.locator('iframe[title="Saved calculator"]')).toBeVisible();
        await expect(card.getByText('A calculator saved by Builder')).toBeVisible();
        await expect.poll(() => page.evaluate(() => {
            return window.lexicalEditor.getEditorState().toJSON().root.children;
        })).toEqual([{
            artifactVersion: 1,
            description: 'The first card must stay unchanged.',
            html: '<!doctype html><html><head><title>First artifact</title></head><body>First</body></html>',
            id: 'first-artifact',
            title: 'First artifact',
            type: 'artifact',
            version: 1
        }, {
            artifactVersion: 1,
            description: 'A calculator saved by Builder',
            html: '<!doctype html><html><head><title>Saved calculator</title></head><body><output>42</output></body></html>',
            id: 'second-artifact',
            title: 'Saved calculator',
            type: 'artifact',
            version: 1
        }]);
    });

    test('keeps the originating empty card while Builder is open', async function ({page}) {
        await initialize({page, uri: '/#/?content=false&artifactBuilderResult=saved&artifactBuilderDeferred=true'});
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        artifactVersion: 1,
                        description: 'Existing embed',
                        html: '<!doctype html><html><head><title>Existing</title></head><body>Existing</body></html>',
                        id: 'existing-artifact',
                        title: 'Existing',
                        type: 'artifact',
                        version: 1
                    }, {
                        artifactVersion: 1,
                        description: '',
                        html: '',
                        id: 'new-artifact',
                        title: '',
                        type: 'artifact',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editor = window.lexicalEditor;
            editor.setEditorState(editor.parseEditorState(serializedState));
        });

        const cards = page.locator('[data-kg-card="artifact"]');
        await cards.nth(1).getByRole('button', {name: 'Create artifact'}).click();
        await cards.nth(0).click();
        await expect(cards).toHaveCount(2);
        await expect(cards.nth(1).getByRole('button', {name: 'Create artifact'})).toBeVisible();

        await page.evaluate(() => window.dispatchEvent(new Event('artifact-builder-save')));

        await expect(cards.nth(1).locator('iframe[title="Saved calculator"]')).toBeVisible();
        await expect.poll(() => page.evaluate(() => {
            return window.lexicalEditor.getEditorState().toJSON().root.children;
        })).toHaveLength(2);
    });

    test('shows a sandboxed preview and edit action for saved content', async function ({page}) {
        await initialize({page});
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        artifactVersion: 1,
                        description: 'An interactive chart of quarterly sales.',
                        html: '<!doctype html><html><body><h1>Quarterly sales</h1></body></html>',
                        id: 'sales-chart',
                        title: 'Quarterly sales',
                        type: 'artifact',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editor = window.lexicalEditor;
            editor.setEditorState(editor.parseEditorState(serializedState));
        });

        const card = page.locator('[data-kg-card="artifact"]');
        await expect(card.locator('iframe[title="Quarterly sales"]')).toHaveAttribute('sandbox', 'allow-forms allow-scripts');
        await expect(card.getByRole('button', {name: 'Edit'})).toBeVisible();
    });

    test('gives duplicated cards independent artifact ids', async function ({page}) {
        await initialize({page});
        await page.evaluate(() => {
            const artifact = {
                artifactVersion: 1,
                description: '',
                html: '<!doctype html><html><body>Calculator</body></html>',
                id: 'calculator',
                title: 'Calculator',
                type: 'artifact',
                version: 1
            };
            const serializedState = JSON.stringify({
                root: {
                    children: [artifact, artifact],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editor = window.lexicalEditor;
            editor.setEditorState(editor.parseEditorState(serializedState));
            editor.update(() => {});
        });

        await expect.poll(() => page.evaluate(() => {
            const children = window.lexicalEditor.getEditorState().toJSON().root.children;
            return new Set(children.map(child => child.id)).size;
        })).toBe(2);
    });
});
