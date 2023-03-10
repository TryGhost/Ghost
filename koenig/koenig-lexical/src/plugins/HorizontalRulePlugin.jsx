import {$createHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND} from '../nodes/HorizontalRuleNode';
import {$getSelection, $isParagraphNode, $isRangeSelection, COMMAND_PRIORITY_EDITOR} from 'lexical';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const HorizontalRulePlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([])) {
            console.error('HorizontalRulePlugin: HorizontalRuleNode not registered'); // eslint-disable-line no-console
            return;
        }
        return editor.registerCommand(
            INSERT_HORIZONTAL_RULE_COMMAND,
            () => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection)) {
                    return false;
                }

                const focusNode = selection.focus.getNode();

                if (focusNode !== null) {
                    const horizontalRuleNode = $createHorizontalRuleNode();

                    // insert a paragraph unless we're already on a blank paragraph
                    const selectedNode = selection.focus.getNode();
                    if ($isParagraphNode(selectedNode) && selectedNode.getTextContent() !== '') {
                        selection.insertParagraph();
                    }

                    // insert the horizontal rule before the current/inserted paragraph
                    // so the cursor stays on the blank paragraph
                    selection.focus
                        .getNode()
                        .getTopLevelElementOrThrow()
                        .insertBefore(horizontalRuleNode);
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor]);

    return null;
};

export default HorizontalRulePlugin;
