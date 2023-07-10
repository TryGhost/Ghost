import React from 'react';
import {$createCollectionNode, CollectionNode, INSERT_COLLECTION_COMMAND} from '../nodes/CollectionNode';
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CollectionPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([CollectionNode])){
            console.error('CollectionPlugin: CollectionNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_COLLECTION_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();

                    if (focusNode !== null) {
                        const collectionNode = $createCollectionNode({...dataset, _openInEditMode: true});
                        $insertAndSelectNode({selectedNode: focusNode, newNode: collectionNode});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default CollectionPlugin;
