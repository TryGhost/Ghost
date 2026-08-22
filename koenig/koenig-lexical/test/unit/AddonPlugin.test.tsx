import KoenigComposerContext, {defaultKoenigComposerContext} from '../../src/context/KoenigComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, COMMAND_PRIORITY_LOW} from 'lexical';
import {$isAddonNode, AddonNode, INSERT_ADDON_COMMAND, UPDATE_ADDON_COMMAND} from '../../src/nodes/AddonNode';
import {AddonPlugin} from '../../src/plugins/AddonPlugin';
import {INSERT_CARD_COMMAND} from '../../src/plugins/KoenigBehaviourPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {act, render, waitFor} from '@testing-library/react';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {vi} from 'vitest';

function EditorHarness({onEditor}) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        onEditor(editor);
        return editor.registerCommand(INSERT_CARD_COMMAND, ({cardNode}) => {
            $getRoot().append(cardNode);
            return true;
        }, COMMAND_PRIORITY_LOW);
    }, [editor, onEditor]);

    return null;
}

describe('AddonPlugin', function () {
    it('renders and inserts a provider-specific command as the generic add-on node', async function () {
        const renderBlock = vi.fn().mockResolvedValue({
            html: '<article>Episode 12</article>',
            css: 'article { color: rebeccapurple; }',
            portableHtml: '<p>Episode 12</p>',
            initialHeight: 240
        });
        let editor;

        render(
            <KoenigComposerContext.Provider value={{
                ...defaultKoenigComposerContext,
                cardConfig: {
                    addons: {
                        blocks: [],
                        createId: () => 'block-1',
                        renderBlock
                    }
                }
            }}>
                <LexicalComposer initialConfig={{
                    namespace: 'addon-plugin-test',
                    nodes: [AddonNode],
                    onError(error) {
                        throw error;
                    }
                }}>
                    <AddonPlugin />
                    <EditorHarness onEditor={(value) => {
                        editor = value;
                    }} />
                </LexicalComposer>
            </KoenigComposerContext.Provider>
        );

        await waitFor(() => expect(editor).toBeDefined());
        await act(async () => {
            editor.dispatchCommand(INSERT_ADDON_COMMAND, {
                addonHandle: 'transistor',
                blockName: 'episode-player',
                label: 'Transistor podcast player',
                initialProperties: {episodeId: '1234'},
                resourceOrigins: ['https://media.transistor.fm']
            });
        });

        await waitFor(() => {
            let dataset;
            editor.getEditorState().read(() => {
                const addonNode = $getRoot().getChildren().find($isAddonNode);
                dataset = addonNode?.getDataset();
            });
            expect(dataset).toMatchObject({
                id: 'block-1',
                addonHandle: 'transistor',
                blockName: 'episode-player',
                props: {episodeId: '1234'},
                html: '<article>Episode 12</article>'
            });
        });
        expect(renderBlock).toHaveBeenCalledWith({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {episodeId: '1234'}
        });
    });

    it('inserts a keyed placeholder synchronously and updates it in place after rendering', async function () {
        let resolveRender;
        const renderBlock = vi.fn(() => new Promise((resolve) => {
            resolveRender = resolve;
        }));
        let editor;

        render(
            <KoenigComposerContext.Provider value={{
                ...defaultKoenigComposerContext,
                cardConfig: {
                    addons: {
                        blocks: [],
                        createId: () => 'block-deferred',
                        renderBlock
                    }
                }
            }}>
                <LexicalComposer initialConfig={{
                    namespace: 'addon-plugin-deferred-test',
                    nodes: [AddonNode],
                    onError(error) {
                        throw error;
                    }
                }}>
                    <AddonPlugin />
                    <EditorHarness onEditor={(value) => {
                        editor = value;
                    }} />
                </LexicalComposer>
            </KoenigComposerContext.Provider>
        );

        await waitFor(() => expect(editor).toBeDefined());
        act(() => {
            editor.dispatchCommand(INSERT_ADDON_COMMAND, {
                addonHandle: 'transistor',
                blockName: 'episode-player',
                label: 'Transistor podcast player'
            });
        });

        let placeholderKey;
        let placeholderIndex;
        await waitFor(() => {
            editor.getEditorState().read(() => {
                const children = $getRoot().getChildren();
                const addonNode = children.find($isAddonNode);
                placeholderKey = addonNode?.getKey();
                placeholderIndex = children.findIndex($isAddonNode);
                expect(addonNode?.html).toContain('data-ghost-addon-loading');
            });
        });

        act(() => {
            editor.update(() => {
                $getRoot().append($createParagraphNode().append($createTextNode('Author kept typing')));
            });
        });

        await act(async () => {
            resolveRender({
                html: '<article>Deferred episode</article>',
                portableHtml: '<p>Deferred episode</p>'
            });
        });

        await waitFor(() => {
            editor.getEditorState().read(() => {
                const children = $getRoot().getChildren();
                expect(children[placeholderIndex].getKey()).toBe(placeholderKey);
                expect($isAddonNode(children[placeholderIndex]) && children[placeholderIndex].html).toBe('<article>Deferred episode</article>');
                expect(children[placeholderIndex + 1].getTextContent()).toBe('Author kept typing');
            });
        });
    });

    it('ignores a late render result after the placeholder was removed', async function () {
        let resolveRender;
        const renderBlock = vi.fn(() => new Promise((resolve) => {
            resolveRender = resolve;
        }));
        let editor;

        render(
            <KoenigComposerContext.Provider value={{
                ...defaultKoenigComposerContext,
                cardConfig: {addons: {blocks: [], createId: () => 'block-undone', renderBlock}}
            }}>
                <LexicalComposer initialConfig={{
                    namespace: 'addon-plugin-undone-test',
                    nodes: [AddonNode],
                    onError(error) {
                        throw error;
                    }
                }}>
                    <AddonPlugin />
                    <EditorHarness onEditor={(value) => {
                        editor = value;
                    }} />
                </LexicalComposer>
            </KoenigComposerContext.Provider>
        );

        await waitFor(() => expect(editor).toBeDefined());
        act(() => {
            editor.dispatchCommand(INSERT_ADDON_COMMAND, {
                addonHandle: 'transistor',
                blockName: 'episode-player',
                label: 'Transistor podcast player'
            });
        });
        await waitFor(() => {
            editor.getEditorState().read(() => expect($getRoot().getChildren().some($isAddonNode)).toBe(true));
        });

        act(() => {
            editor.update(() => {
                $getRoot().getChildren().find($isAddonNode)?.remove();
            });
        });
        await act(async () => {
            resolveRender({html: '<article>Too late</article>'});
        });

        await waitFor(() => {
            editor.getEditorState().read(() => expect($getRoot().getChildren().some($isAddonNode)).toBe(false));
        });
    });

    it('keeps a visible error card when the initial provider render fails', async function () {
        const renderError = new Error('Add-on bundle failed integrity verification');
        const renderBlock = vi.fn().mockRejectedValue(renderError);
        const onError = vi.fn();
        let editor;

        render(
            <KoenigComposerContext.Provider value={{
                ...defaultKoenigComposerContext,
                onError,
                cardConfig: {
                    addons: {
                        blocks: [],
                        createId: () => 'block-failed',
                        renderBlock
                    }
                }
            }}>
                <LexicalComposer initialConfig={{
                    namespace: 'addon-plugin-failed-test',
                    nodes: [AddonNode],
                    onError(error) {
                        throw error;
                    }
                }}>
                    <AddonPlugin />
                    <EditorHarness onEditor={(value) => {
                        editor = value;
                    }} />
                </LexicalComposer>
            </KoenigComposerContext.Provider>
        );

        await waitFor(() => expect(editor).toBeDefined());
        act(() => {
            editor.dispatchCommand(INSERT_ADDON_COMMAND, {
                addonHandle: 'chart',
                blockName: 'interactive-chart',
                label: 'Interactive chart'
            });
        });

        await waitFor(() => {
            editor.getEditorState().read(() => {
                const addonNode = $getRoot().getChildren().find($isAddonNode);
                expect(addonNode?.html).toContain('data-ghost-addon-error');
                expect(addonNode?.portableHtml).toContain('failed to load');
                expect(addonNode?.hydrate).toBe(false);
            });
        });
        expect(onError).toHaveBeenCalledWith(renderError);
    });

    it('commits properties and regenerated snapshots atomically and ignores stale responses', async function () {
        const pending = [];
        const renderBlock = vi.fn()
            .mockResolvedValueOnce({html: '<article>Initial</article>', initialHeight: 120})
            .mockImplementation(() => new Promise((resolve, reject) => pending.push({resolve, reject})));
        let editor;

        render(
            <KoenigComposerContext.Provider value={{
                ...defaultKoenigComposerContext,
                cardConfig: {
                    addons: {
                        blocks: [{addonHandle: 'transistor', blockName: 'episode-player', label: 'Episode'}],
                        createId: () => 'block-settings',
                        renderBlock
                    }
                }
            }}>
                <LexicalComposer initialConfig={{
                    namespace: 'addon-plugin-settings-test',
                    nodes: [AddonNode],
                    onError(error) {
                        throw error;
                    }
                }}>
                    <AddonPlugin />
                    <EditorHarness onEditor={(value) => {
                        editor = value;
                    }} />
                </LexicalComposer>
            </KoenigComposerContext.Provider>
        );

        await waitFor(() => expect(editor).toBeDefined());
        act(() => {
            editor.dispatchCommand(INSERT_ADDON_COMMAND, {
                addonHandle: 'transistor',
                blockName: 'episode-player',
                label: 'Episode',
                initialProperties: {title: 'Initial'}
            });
        });
        let nodeKey;
        await waitFor(() => {
            editor.getEditorState().read(() => {
                const node = $getRoot().getChildren().find($isAddonNode);
                nodeKey = node?.getKey();
                expect(node?.html).toBe('<article>Initial</article>');
            });
        });

        act(() => {
            editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch: {title: 'First'}});
            editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch: {title: 'Latest'}});
        });
        await waitFor(() => expect(pending).toHaveLength(2));
        expect(renderBlock).toHaveBeenNthCalledWith(2, {
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {title: 'First'}
        });
        expect(renderBlock).toHaveBeenNthCalledWith(3, {
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {title: 'Latest'}
        });

        await act(async () => {
            pending[1].resolve({html: '<article>Latest</article>', portableHtml: '<p>Latest</p>'});
            pending[0].resolve({html: '<article>Stale</article>', portableHtml: '<p>Stale</p>'});
        });
        await waitFor(() => {
            editor.getEditorState().read(() => {
                const node = $getRoot().getChildren().find($isAddonNode);
                expect(node?.props).toEqual({title: 'Latest'});
                expect(node?.html).toBe('<article>Latest</article>');
                expect(node?.portableHtml).toBe('<p>Latest</p>');
            });
        });

        act(() => {
            editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch: {title: 'Broken'}});
        });
        await waitFor(() => expect(pending).toHaveLength(3));
        await act(async () => pending[2].reject(new Error('render failed')));
        await waitFor(() => {
            editor.getEditorState().read(() => {
                const node = $getRoot().getChildren().find($isAddonNode);
                expect(node?.props).toEqual({title: 'Latest'});
                expect(node?.html).toBe('<article>Latest</article>');
            });
        });

        act(() => {
            editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch: {mode: 'custom'}});
        });
        await waitFor(() => expect(pending).toHaveLength(4));
        act(() => {
            editor.update(() => {
                const node = $getRoot().getChildren().find($isAddonNode);
                if (node) {
                    node.props = {title: 'Restored by undo'};
                    node.html = '<article>Restored by undo</article>';
                }
            });
        });
        await act(async () => pending[3].resolve({html: '<article>Invalidated</article>'}));

        act(() => {
            editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch: {showStatus: false}});
        });
        await waitFor(() => expect(pending).toHaveLength(5));
        expect(renderBlock).toHaveBeenNthCalledWith(6, {
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {title: 'Restored by undo', showStatus: false}
        });
    });
});
