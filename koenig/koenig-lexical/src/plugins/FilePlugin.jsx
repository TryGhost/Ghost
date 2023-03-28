import React from 'react';
import {$createFileNode, FileNode, INSERT_FILE_COMMAND} from '../nodes/FileNode';
import {$getSelection, $isNodeSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const FilePlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([FileNode])){
            console.error('FilePlugin: FileNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_FILE_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();

                    let focusNode;
                    if ($isRangeSelection(selection)) {
                        focusNode = selection.focus.getNode();
                    } else if ($isNodeSelection(selection)) {
                        focusNode = selection.getNodes()[0];
                    } else {
                        return false;
                    }
                    if (focusNode !== null) {
                        const calloutNode = $createFileNode(dataset);
                        $insertAndSelectNode({selectedNode: focusNode, newNode: calloutNode});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    });

    return null;
};

export default FilePlugin;
