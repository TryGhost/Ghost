import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$restoreEditorState} from '@lexical/utils';
import {RootNode, $getSelection, $isRangeSelection} from 'lexical';
import React from 'react';

export const RestrictContentPlugin = ({paragraphs}) => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        return editor.registerNodeTransform(RootNode, (rootNode) => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                return;
            }
            const prevEditorState = editor.getEditorState();
            if (rootNode.__size > paragraphs) {
                $restoreEditorState(editor, prevEditorState);
            }
        });
    }, [editor, paragraphs]);
    return null;
};

export default RestrictContentPlugin;
