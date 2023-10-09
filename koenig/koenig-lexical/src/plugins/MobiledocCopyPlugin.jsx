import React from 'react';
import {
    $getSelection,
    $isNodeSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH,
    COPY_COMMAND,
    CUT_COMMAND
} from 'lexical';
import {copyToClipboard} from '@lexical/clipboard';
import {lexicalToMobiledoc} from '@tryghost/kg-converters';
import {mergeRegister} from '@lexical/utils';
import {shouldIgnoreEvent} from '../utils/shouldIgnoreEvent';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

async function copyToClipboardWithMobiledoc(editor, event) {
    if (!(event instanceof ClipboardEvent)) {
        return;
    }
    // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
    if (document.activeElement !== editor.getRootElement()) {
        return;
    }
    await copyToClipboard(editor, event);
    // On copy/paste Lexical only stores an array of nodes but our converters expect
    // a full document with a root node.
    const copiedLexical = JSON.parse(event.clipboardData.getData('application/x-lexical-editor'));
    const lexical = JSON.stringify({
        root: {
            children: copiedLexical.nodes.map((node) => {
                // Lexical will place plain text nodes top-level in the array when copying
                // from inside a paragraph. Mobiledoc always expects a paragraph
                if (node.type === 'text') {
                    return {
                        children: [node],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    };
                }

                return node;
            }),
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });

    // convert to mobiledoc and store it in the clipboard so it can be accessed in other mobiledoc editors
    const mobiledoc = lexicalToMobiledoc(lexical);
    event.clipboardData.setData('application/x-mobiledoc-editor', mobiledoc);
}

function useMobiledocCopyPlugin({editor}) {
    React.useEffect(() => {
        return mergeRegister(
            // we need to override the default behaviour because it's async but the command pipeline is sync so we
            // won't have access to the data that's needed when this command fn is called
            editor.registerCommand(
                COPY_COMMAND,
                async (event) => {
                    if (shouldIgnoreEvent(event)) {
                        return true;
                    }

                    await copyToClipboardWithMobiledoc(editor, event);
                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                CUT_COMMAND,
                async (event) => {
                    if (shouldIgnoreEvent(event)) {
                        return true;
                    }

                    await copyToClipboardWithMobiledoc(editor, event);

                    // copied from @lexical/rich-text `onCutForRichText`
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.removeText();
                        } else if ($isNodeSelection(selection)) {
                            selection.getNodes().forEach(node => node.remove());
                        }
                    });

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);
}

export default function MobiledocCopyPlugin() {
    const [editor] = useLexicalComposerContext();
    return useMobiledocCopyPlugin({editor});
}
