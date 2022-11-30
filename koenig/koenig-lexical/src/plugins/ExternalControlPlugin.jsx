import React from 'react';
import {$createParagraphNode, $getRoot} from 'lexical';
import {$canShowPlaceholder} from '@lexical/text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// used to register a minimal API for controlling the editor from the consuming app
// designed to allow typical behaviours without the consuming app needing to bundle the lexical library
export const ExternalControlPlugin = ({registerAPI}) => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!registerAPI) {
            return;
        }

        const API = {
            // give access to the editor instance so the Lexical API can be used directly if needed
            editorInstance: editor,
            // simplified API methods for typical consumer app actions
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
            }
        };

        registerAPI(API);

        return () => {
            registerAPI?.(null);
        };
    }, [editor, registerAPI]);
};
