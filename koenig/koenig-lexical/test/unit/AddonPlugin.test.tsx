import KoenigComposerContext, {defaultKoenigComposerContext} from '../../src/context/KoenigComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, COMMAND_PRIORITY_LOW} from 'lexical';
import {$isAddonNode, AddonNode, INSERT_ADDON_COMMAND} from '../../src/nodes/AddonNode';
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
});
