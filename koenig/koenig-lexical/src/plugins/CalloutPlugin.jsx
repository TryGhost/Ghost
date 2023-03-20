import React from 'react';
import {$createCalloutNode, CalloutNode, INSERT_CALLOUT_COMMAND} from '../nodes/CalloutNode';
import {$getSelection, $isNodeSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CalloutPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([CalloutNode])){
            console.error('CalloutPlugin: CalloutNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_CALLOUT_COMMAND,
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
                        const calloutNode = $createCalloutNode(dataset);
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

export default CalloutPlugin;
