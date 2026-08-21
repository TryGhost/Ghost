import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';

import {createIframeArtifactPreview} from './artifact-preview-adapter';
import {createArtifactDraft} from './artifact-state';
import {ArtifactWorkspace} from './artifact-workspace';

import type {ArtifactPreviewAdapter} from './artifact-preview-adapter';

const previews: ArtifactPreviewAdapter[] = [];
const iframes: HTMLIFrameElement[] = [];

afterEach(() => {
    previews.splice(0).forEach(preview => preview.destroy());
    iframes.splice(0).forEach(iframe => iframe.remove());
});

describe('Artifact preview', () => {
    it('runs interactive HTML, selects rendered context, and applies agent CSS edits in the live opaque preview', async () => {
        const iframe = document.createElement('iframe');
        iframe.style.width = '640px';
        iframe.style.height = '480px';
        document.body.appendChild(iframe);
        iframes.push(iframe);

        const preview = createIframeArtifactPreview(iframe);
        previews.push(preview);
        const formAction = `${window.location.origin}/artifact-form-proof`;
        const initial = await createArtifactDraft({
            id: 'artifact-browser-proof',
            artifactVersion: 1,
            title: 'Interactive chart',
            description: 'A browser proof',
            html: `<!doctype html>
                <html>
                    <head>
                        <title>Interactive chart</title>
                        <meta name="description" content="A browser proof">
                        <style>
                            :root { --accent: rgb(255, 0, 0); }
                            #chart { color: var(--accent); }
                            [data-edit] { display: none; }
                        </style>
                    </head>
                    <body>
                        <main id="app"></main>
                        <script>
                            document.querySelector('#app').innerHTML = '<h1 id="chart">Interactive chart</h1><button id="increment" type="button">Count <span id="count">0</span></button><button id="replace-dynamic" type="button">Replace dynamic node</button><button id="move-dynamic" type="button">Move dynamic node</button><ul><li>Point</li><li>Point</li></ul><output id="isolation"></output><form action="${formAction}" method="get"><input name="query" value="ghost"><button type="submit">Submit integration</button></form>';
                            const count = document.querySelector('#count');
                            document.querySelector('#increment').addEventListener('click', () => {
                                count.textContent = String(Number(count.textContent) + 1);
                            });
                            document.querySelector('#replace-dynamic').addEventListener('click', () => {
                                const current = Array.from(document.querySelectorAll('p')).find(element => element.textContent === 'Delayed context');
                                const replacement = document.createElement('p');
                                replacement.textContent = 'Delayed context';
                                current?.replaceWith(replacement);
                            });
                            document.querySelector('#move-dynamic').addEventListener('click', () => {
                                const current = Array.from(document.querySelectorAll('p')).find(element => element.textContent === 'Delayed context');
                                if (current) {
                                    current.remove();
                                    document.querySelector('#app').append(current);
                                    const sibling = document.createElement('p');
                                    sibling.textContent = 'Delayed context';
                                    document.querySelector('#app').append(sibling);
                                }
                            });
                            setTimeout(() => {
                                const inserted = document.createElement('h2');
                                inserted.textContent = 'Inserted later';
                                document.querySelector('#chart').before(inserted);
                                const delayed = document.createElement('p');
                                delayed.textContent = 'Delayed context';
                                document.querySelector('#app').append(delayed);
                            }, 25);
                            try {
                                parent.document.body;
                                document.querySelector('#isolation').textContent = 'shared origin';
                            } catch {
                                document.querySelector('#isolation').textContent = 'opaque origin';
                            }
                        </script>
                    </body>
                </html>`
        });
        const workspace = new ArtifactWorkspace({
            id: 'artifact:browser-proof',
            title: 'Interactive chart',
            load: () => Promise.resolve(initial),
            preview
        });

        await workspace.load(new AbortController().signal);
        const frame = page.frameLocator(page.elementLocator(iframe));
        await expect(preview.inspectElement({selector: '#isolation'}, new AbortController().signal)).resolves.toMatchObject({text: 'opaque origin'});
        await frame.getByRole('button', {name: 'Count 0'}).click();
        await expect(preview.inspectElement({selector: '#count'}, new AbortController().signal)).resolves.toMatchObject({text: '1'});

        await preview.setInteractionMode('select', new AbortController().signal);
        await frame.getByText('1', {exact: true}).click();
        await expect.poll(async () => {
            await workspace.flush(new AbortController().signal);
            return workspace.getSelectionContext()?.label;
        }).toBe('1');
        const counterSelection = workspace.getSelectionContext();
        const counterCheckpoint = workspace.checkpointSnapshot();

        await expect(workspace.restore(counterCheckpoint)).resolves.toMatchObject({valid: true, revision: counterCheckpoint.revision});
        await expect(preview.inspectElement({marker: counterSelection?.id}, new AbortController().signal)).resolves.toMatchObject({text: '0'});

        await preview.setInteractionMode('select', new AbortController().signal);
        await frame.getByRole('heading', {name: 'Inserted later'}).click();
        await frame.getByRole('heading', {name: 'Interactive chart'}).click();
        await expect.poll(async () => {
            await workspace.flush(new AbortController().signal);
            const data = workspace.getSelectionContext()?.data;
            return data && typeof data === 'object' ? (data as {tagName?: string}).tagName : undefined;
        }).toBe('h1');
        const selectedHeading = workspace.getSelectionContext();
        await expect(preview.inspectElement({marker: selectedHeading?.id}, new AbortController().signal)).resolves.toMatchObject({tag: 'h1', text: 'Interactive chart'});
        const points = frame.getByText('Point', {exact: true});
        await points.nth(0).click();
        await workspace.flush(new AbortController().signal);
        const firstPoint = workspace.getSelectionContext();
        await points.nth(1).click();
        await workspace.flush(new AbortController().signal);
        const secondPoint = workspace.getSelectionContext();
        expect(secondPoint?.id).not.toBe(firstPoint?.id);
        await expect(preview.inspectElement({marker: secondPoint?.id}, new AbortController().signal)).resolves.toMatchObject({tag: 'li', text: 'Point'});

        const replace = workspace.getTools().find(tool => tool.name === 'replace_in_html');
        const result = await replace?.execute({
            revision: workspace.state.revision,
            oldText: '--accent: rgb(255, 0, 0)',
            newText: '--accent: rgb(0, 0, 255)'
        }, new AbortController().signal);

        expect(result).toMatchObject({ok: true});
        await expect(preview.inspectElement({selector: '#chart'}, new AbortController().signal)).resolves.toMatchObject({
            styles: {color: 'rgb(0, 0, 255)'}
        });

        await preview.setInteractionMode('select', new AbortController().signal);
        await frame.getByText('Delayed context').click();
        await expect.poll(async () => {
            await workspace.flush(new AbortController().signal);
            return workspace.getSelectionContext()?.label;
        }).toBe('Delayed context');
        const delayedSelection = workspace.getSelectionContext();
        const checkpoint = workspace.checkpointSnapshot();

        await expect(workspace.restore(checkpoint)).resolves.toMatchObject({valid: true, revision: checkpoint.revision});
        await expect.poll(async () => {
            try {
                return (await preview.inspectElement({marker: delayedSelection?.id}, new AbortController().signal)).text;
            } catch {
                return null;
            }
        }).toBe('Delayed context');

        await preview.setInteractionMode('browse', new AbortController().signal);
        await frame.getByRole('button', {name: 'Replace dynamic node'}).click();
        await expect.poll(async () => {
            try {
                return (await preview.inspectElement({marker: delayedSelection?.id}, new AbortController().signal)).text;
            } catch {
                return null;
            }
        }).toBe('Delayed context');
        await frame.getByRole('button', {name: 'Move dynamic node'}).click();
        await preview.setInteractionMode('select', new AbortController().signal);
        const delayedNodes = frame.getByText('Delayed context', {exact: true});
        await delayedNodes.nth(0).click();
        await workspace.flush(new AbortController().signal);
        const movedNode = workspace.getSelectionContext();
        await delayedNodes.nth(1).click();
        await workspace.flush(new AbortController().signal);
        const equivalentSibling = workspace.getSelectionContext();
        expect(equivalentSibling?.id).not.toBe(movedNode?.id);
        await preview.setInteractionMode('browse', new AbortController().signal);
        let navigationLoads = 0;
        iframe.addEventListener('load', () => navigationLoads += 1);
        await frame.getByRole('button', {name: 'Submit integration'}).click();
        await expect.poll(() => navigationLoads).toBeGreaterThanOrEqual(2);
        await expect(preview.inspectElement({selector: '#chart'}, new AbortController().signal)).resolves.toMatchObject({text: 'Interactive chart'});
        expect(preview.state.diagnostics).not.toEqual(expect.arrayContaining([expect.objectContaining({code: 'preview_navigation_bypassed'})]));
    });
});
