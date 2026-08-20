import {createHeadlessEditor} from '@lexical/headless';
import type {LexicalEditor} from 'lexical';

import {ArtifactNode, $createArtifactNode} from '../../src/index.js';
import {dom} from '../test-utils/index.js';

describe('ArtifactNode', function () {
    let editor: LexicalEditor;

    beforeEach(function () {
        editor = createHeadlessEditor({
            nodes: [ArtifactNode],
            onError(error: Error) {
                throw error;
            }
        });
    });

    it('renders a populated artifact as an inert embed envelope', async function () {
        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const node = $createArtifactNode({
                        id: 'sales-chart',
                        title: 'Quarterly sales',
                        description: 'An interactive chart of quarterly sales.',
                        html: '<!doctype html><html><body><script>window.chart = true;</script></body></html>'
                    });

                    const result = node.exportDOM(editor, {dom});
                    const element = result.element as HTMLElement;

                    expect(result.type).toBe('outer');
                    expect(element).toMatchObject({
                        className: 'kg-card kg-artifact-card',
                        id: 'artifact-sales-chart'
                    });
                    expect(element.dataset.artifactTitle).toBe('Quarterly sales');
                    expect(element.querySelector('script[type="application/json"]')?.textContent).toContain('window.chart = true');
                    expect(element.querySelector('script:not([type="application/json"])')).toBeNull();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    it('renders a static browser link for email', async function () {
        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const node = $createArtifactNode({
                        id: 'sales-chart',
                        title: 'Quarterly sales',
                        description: 'An interactive chart of quarterly sales.',
                        html: '<!doctype html><html><body><script>window.chart = true;</script></body></html>'
                    });

                    const result = node.exportDOM(editor, {
                        dom,
                        target: 'email',
                        postUrl: 'https://example.com/quarterly-results/'
                    });
                    const element = result.element as HTMLElement;

                    expect(element.className).toBe('kg-card kg-artifact-card kg-artifact-card-fallback');
                    expect(element.textContent).toContain('Quarterly sales');
                    expect(element.querySelector('a')).toMatchObject({
                        href: 'https://example.com/quarterly-results/#artifact-sales-chart',
                        textContent: 'Open in browser'
                    });
                    expect(element.querySelector('script')).toBeNull();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });
});
