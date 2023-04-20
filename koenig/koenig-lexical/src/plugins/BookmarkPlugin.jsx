import React from 'react';
import {$createBookmarkNode, BookmarkNode, INSERT_BOOKMARK_COMMAND} from '../nodes/BookmarkNode';
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const BookmarkPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([BookmarkNode])){
            console.error('BookmarkPlugin: BookmarkNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_BOOKMARK_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();
                    if (focusNode !== null) {
                        const bookmarkNode = $createBookmarkNode({...dataset, _openInEditMode: true});
                        $insertAndSelectNode({selectedNode: focusNode, newNode: bookmarkNode});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default BookmarkPlugin;
