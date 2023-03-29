import {$createPaywallNode, INSERT_PAYWALL_COMMAND} from '../nodes/PaywallNode';
import {$getSelection, $isParagraphNode, $isRangeSelection, COMMAND_PRIORITY_EDITOR} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const PaywallPlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([])) {
            console.error('PaywallPlugin: PaywallNode not registered'); // eslint-disable-line no-console
            return;
        }
        return editor.registerCommand(
            INSERT_PAYWALL_COMMAND,
            () => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection)) {
                    return false;
                }

                const focusNode = selection.focus.getNode();

                if (focusNode !== null) {
                    const paywallNode = $createPaywallNode();

                    // insert a paragraph unless we're already on a blank paragraph
                    const selectedNode = selection.focus.getNode();
                    if ($isParagraphNode(selectedNode) && selectedNode.getTextContent() !== '') {
                        selection.insertParagraph();
                    }

                    // insert the paywall before the current/inserted paragraph
                    // so the cursor stays on the blank paragraph
                    selection.focus
                        .getNode()
                        .getTopLevelElementOrThrow()
                        .insertBefore(paywallNode);
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor]);

    return null;
};

export default PaywallPlugin;
