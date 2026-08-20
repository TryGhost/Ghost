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
