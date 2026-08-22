import {createHeadlessEditor} from '@lexical/headless';
import type {LexicalEditor} from 'lexical';

import {AddonNode, DEFAULT_NODES, $createAddonNode, renderAddonEditorPreview} from '../../src/index.js';
import {dom} from '../test-utils/index.js';

describe('AddonNode', function () {
    let editor: LexicalEditor;

    beforeEach(function () {
        editor = createHeadlessEditor({
            nodes: [AddonNode],
            onError(error: Error) {
                throw error;
            }
        });
    });

    it('gives every block an independent public property bag', async function () {
        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const first = $createAddonNode();
                    const second = $createAddonNode();

                    expect(first.props).not.toBe(second.props);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    it('renders a durable static web snapshot in a sandboxed iframe', async function () {
        expect(DEFAULT_NODES).toContain(AddonNode);

        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const node = $createAddonNode({
                        id: 'episode-player-1',
                        addonHandle: 'transistor',
                        blockName: 'episode-player',
                        label: 'Transistor podcast player',
                        props: {episodeId: '1234'},
                        html: '<article onclick="steal()"><strong>Episode 12</strong><a href="https://example.com/episodes/12">Listen</a><a href="data:application/xhtml+xml,attack">Unsafe</a><img src="https://media.transistor.fm/cover.jpg"><img src="https://undeclared.example/tracker.gif"><script>steal()</script><template shadowrootmode="open"><script nonce="ghost-addon-bootstrap">shadowAttack()</script></template></article>',
                        css: 'article { color: rebeccapurple; }',
                        resourceOrigins: ['https://media.transistor.fm'],
                        hydrate: true,
                        initialHeight: 240
                    });

                    const serialized = node.exportJSON();
                    expect(serialized).toMatchObject({
                        type: 'addon',
                        id: 'episode-player-1',
                        addonHandle: 'transistor',
                        blockName: 'episode-player',
                        props: {episodeId: '1234'},
                        resourceOrigins: ['https://media.transistor.fm'],
                        hydrate: true
                    });

                    const result = node.exportDOM(editor, {dom});
                    const element = result.element as HTMLElement;
                    const iframe = element.querySelector('iframe');

                    expect(result.type).toBe('outer');
                    expect(element).toMatchObject({
                        className: 'kg-card kg-addon-card',
                        id: 'addon-episode-player-1'
                    });
                    expect(element.dataset).toMatchObject({
                        addonHandle: 'transistor',
                        addonBlock: 'episode-player',
                        addonHydrate: 'true'
                    });
                    expect(iframe).not.toBeNull();
                    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts');
                    expect(iframe?.getAttribute('title')).toBe('Transistor podcast player');
                    expect(iframe?.getAttribute('height')).toBe('240');
                    expect(iframe?.srcdoc).toContain('<strong>Episode 12</strong>');
                    expect(iframe?.srcdoc).toContain('article { color: rebeccapurple; }');
                    expect(iframe?.srcdoc).toContain('data-ghost-addon-content-style');
                    expect(iframe?.srcdoc).toContain('img-src data: https://media.transistor.fm');
                    expect(iframe?.srcdoc).not.toContain('img-src data: http: https:');
                    expect(iframe?.srcdoc).not.toContain('img-src data: https://undeclared.example');
                    expect(iframe?.srcdoc).toContain('data-ghost-addon-bootstrap');
                    expect(iframe?.srcdoc).toContain('script-src \'nonce-ghost-addon-bootstrap\'');
                    expect(iframe?.srcdoc).toContain('\'unsafe-eval\'');
                    expect(iframe?.srcdoc).toContain('connect-src data: https://media.transistor.fm');
                    expect(iframe?.srcdoc).toContain('message.action === \'hydrate\'');
                    expect(iframe?.srcdoc).toContain('moduleExports.hydrate');
                    expect(iframe?.srcdoc).toContain('episodeId');
                    expect(iframe?.srcdoc).toContain('event.target.closest(\'a,area\')');
                    expect(iframe?.srcdoc).toContain('event.isTrusted');
                    expect(iframe?.srcdoc).toContain('navigationToken');
                    expect(iframe?.srcdoc).toContain('postToParent');
                    expect(iframe?.srcdoc).not.toContain('Object.assign');
                    expect(iframe?.srcdoc).toContain('window.setInterval(announce, 250)');
                    expect(iframe?.srcdoc).toContain('message.action === \'connect\'');
                    expect(iframe?.srcdoc).not.toContain('steal()');
                    expect(iframe?.srcdoc).not.toContain('shadowAttack()');
                    expect(iframe?.srcdoc).not.toContain('shadowrootmode');
                    expect(iframe?.srcdoc).not.toContain('data:application/xhtml+xml');
                    expect(iframe?.srcdoc).not.toContain('onclick');
                    expect(element.querySelector('script')).toBeNull();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    it('keeps broad HTTPS image and media access separate from network and frame access', async function () {
        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const node = $createAddonNode({
                        id: 'podcast-player-1',
                        addonHandle: 'podcast-demo',
                        blockName: 'podcast-player',
                        label: 'Podcast player',
                        html: '<article><img src="https://cdn.example/cover.jpg"><audio src="https://media.example/episode.mp3"></audio></article>',
                        resourcePolicy: {
                            images: ['https:'],
                            media: ['https:']
                        },
                        hydrate: true
                    });

                    const iframe = (node.exportDOM(editor, {dom}).element as HTMLElement).querySelector('iframe');

                    expect(iframe?.srcdoc).toContain('img-src data: https:');
                    expect(iframe?.srcdoc).toContain('media-src data: https:');
                    expect(iframe?.srcdoc).toContain('font-src data:');
                    expect(iframe?.srcdoc).toContain('connect-src \'none\'');
                    expect(iframe?.srcdoc).toContain('frame-src \'none\'');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    it('renders the portable snapshot for email without executable markup', async function () {
        await new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    const node = $createAddonNode({
                        id: 'episode-player-1',
                        addonHandle: 'transistor',
                        blockName: 'episode-player',
                        label: 'Transistor podcast player',
                        html: '<article>Web player</article>',
                        portableHtml: '<style>p { display: none }</style><p onclick="steal()">Listen to <a href="https://example.com/episodes/12">Episode 12</a><a class="unsafe" href="data:application/xhtml+xml,attack">Unsafe</a></p><script>steal()</script>'
                    });

                    const result = node.exportDOM(editor, {dom, target: 'email'});
                    const element = result.element as HTMLElement;

                    expect(result.type).toBe('outer');
                    expect(element.className).toBe('kg-card kg-addon-card');
                    expect(element.textContent).toBe('Listen to Episode 12Unsafe');
                    expect(element.querySelector('a')?.href).toBe('https://example.com/episodes/12');
                    expect(element.querySelector('iframe')).toBeNull();
                    expect(element.querySelector('script')).toBeNull();
                    expect(element.querySelector('style')).toBeNull();
                    expect(element.querySelector('[onclick]')).toBeNull();
                    expect(element.querySelector('.unsafe')?.hasAttribute('href')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    it('builds a non-interactive editor preview from the saved snapshot', function () {
        const srcdoc = renderAddonEditorPreview({
            id: 'episode-player-1',
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor podcast player',
            props: {},
            html: '<article onclick="steal()"><a href="https://example.com">Episode 12</a><script>steal()</script></article>',
            css: 'article { color: rebeccapurple; }',
            portableHtml: '',
            resourceOrigins: [],
            hydrate: false,
            initialHeight: 240
        }, {dom});

        expect(srcdoc).toContain('<article><a href="https://example.com">Episode 12</a></article>');
        expect(srcdoc).toContain('article { color: rebeccapurple; }');
        expect(srcdoc).toContain('script-src \'none\'');
        expect(srcdoc).not.toContain('ghost-addon-bootstrap');
        expect(srcdoc).not.toContain('steal()');
    });
});
