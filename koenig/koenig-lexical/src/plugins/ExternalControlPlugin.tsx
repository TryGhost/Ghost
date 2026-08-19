import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$canShowPlaceholder} from '@lexical/text';
import {$createParagraphNode, $getRoot, $isDecoratorNode} from 'lexical';
import {$insertPaywallCardAtTop} from '../utils/$insertPaywallCard';
import {$selectDecoratorNode} from '../utils/$selectDecoratorNode';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {EDIT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// used to register a minimal API for controlling the editor from the consuming app
// designed to allow typical behaviours without the consuming app needing to bundle the lexical library
export const ExternalControlPlugin = ({registerAPI}) => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);

    // through a ref because the host rebuilds `post` on every render, and the
    // API is registered once
    const postRef = React.useRef(cardConfig?.post);
    postRef.current = cardConfig?.post;

    React.useEffect(() => {
        if (!registerAPI) {
            return;
        }

        const API = {
            // give access to the editor instance so the Lexical API can be used directly if needed
            editorInstance: editor,
            // simplified API methods for typical consumer app actions
            serialize() {
                return JSON.stringify(editor.getEditorState());
            },
            editorIsEmpty() {
                let isEmpty;
                editor.update(() => {
                    isEmpty = $canShowPlaceholder(false, true);
                });
                return isEmpty;
            },
            focusEditor({position = 'bottom'} = {}) {
                const editorFocusOptions = {
                    defaultSelection: position === 'top' ? 'rootStart' : null
                };

                editor.focus(() => {}, editorFocusOptions);

                if (position === 'top') {
                    // Lexical does not automatically select a decorator node
                    editor.update(() => {
                        const root = $getRoot();
                        const firstChild = root.getFirstChild();

                        if ($isDecoratorNode(firstChild)) {
                            $selectDecoratorNode(firstChild);
                            // selecting a decorator node does not change the
                            // window selection (there's no caret) so we need
                            // to manually move focus to the editor element
                            editor.getRootElement().focus();
                        }
                    });
                }
                if (position === 'bottom') {
                    // Lexical does not automatically select a decorator node
                    editor.update(() => {
                        const root = $getRoot();
                        const lastChild = root.getLastChild();

                        if ($isDecoratorNode(lastChild)) {
                            $selectDecoratorNode(lastChild);
                            // selecting a decorator node does not change the
                            // window selection (there's no caret) so we need
                            // to manually move focus to the editor element
                            editor.getRootElement().focus();
                        } else {
                            lastChild.select();
                        }
                    });
                }
            },
            blurEditor() {
                editor.blur();
            },
            insertParagraphAtTop({focus = true} = {}) {
                editor.update(() => {
                    const paragraphNode = $createParagraphNode();
                    const [firstChild] = $getRoot().getChildren();
                    firstChild.insertBefore(paragraphNode);

                    if (focus) {
                        paragraphNode.selectStart();
                    }
                });
            },
            insertParagraphAtBottom({focus = true} = {}) {
                editor.update(() => {
                    const paragraphNode = $createParagraphNode();
                    $getRoot().append(paragraphNode);

                    if (focus) {
                        paragraphNode.selectStart();
                    }
                });
            },
            // The free preview goes in from outside the writing surface - the
            // action sits beside the post's access, not in the card menu - so
            // it needs a way in that doesn't involve a selection.
            insertPaywallCard() {
                let cardKey = null;

                editor.update(() => {
                    cardKey = $insertPaywallCardAtTop(postRef.current)?.getKey() || null;
                });

                // Opens in edit mode, the same as inserting any other card from
                // the menu does - the author asked for a paywall, so they're put
                // where they can write it. Dispatched after the update rather
                // than inside it: the command resolves the node by key, so the
                // card has to be in the tree first.
                if (cardKey) {
                    editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey});
                }
            },
            insertFiles(files) {
                editor.dispatchCommand(DRAG_DROP_PASTE, files);
            },
            lastNodeIsDecorator() {
                let isDecorator = false;
                editor.getEditorState().read(() => {
                    const nodes = $getRoot().getChildren();
                    const lastNode = nodes[nodes.length - 1];

                    isDecorator = lastNode && $isDecoratorNode(lastNode);
                });
                return isDecorator;
            }
        };

        registerAPI(API);

        return () => {
            registerAPI?.(null);
        };
    }, [editor, registerAPI]);
};

export default ExternalControlPlugin;
