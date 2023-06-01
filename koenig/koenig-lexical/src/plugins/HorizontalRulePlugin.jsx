import {$createHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND} from '../nodes/HorizontalRuleNode';
import {
    $createParagraphNode,
    $getSelection,
    $isParagraphNode,
    $isRangeSelection,
    COMMAND_PRIORITY_EDITOR
} from 'lexical';
import {getSelectedNode} from '../utils/getSelectedNode.js';
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

    // added markdown shortcut to divider card
    useEffect(() => {
        return editor.registerUpdateListener(() => {
            editor.update(() => {
                // don't do anything when using IME input
                if (editor.isComposing()) {
                    return;
                }

                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                    return;
                }

                const dividerRegExp = /^(---|\*\*\*|___)\s?$/;
                const node = getSelectedNode(selection).getTopLevelElement();
                if (!node || !$isParagraphNode(node) || !node.getTextContent().match(dividerRegExp)) {
                    return;
                }

                const nativeSelection = window.getSelection();
                const anchorNode = nativeSelection.anchorNode;
                const rootElement = editor.getRootElement();

                if (anchorNode?.nodeType !== Node.TEXT_NODE || !rootElement.contains(anchorNode)) {
                    return;
                }

                const line = $createHorizontalRuleNode();
                const parentNode = node.getTopLevelElement();

                if (parentNode.getNextSibling()) {
                    parentNode.replace(line);
                } else {
                    parentNode.insertBefore(line);
                    parentNode.replace($createParagraphNode());
                }

                line.selectNext();
            });
        });
    }, [editor]);

    return null;
};

export default HorizontalRulePlugin;
