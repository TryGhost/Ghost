import React from 'react';
import {
    $createParagraphNode,
    $getSelection,
    $isDecoratorNode,
    $isParagraphNode,
    $isRangeSelection,
    RootNode
} from 'lexical';
import {$isListNode} from '@lexical/list';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const RestrictContentPlugin = ({paragraphs}) => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        return mergeRegister(
            editor.registerNodeTransform(RootNode, (rootNode) => {
                // even if this node transform is registered on a nested editor it will
                // still be triggered for root node changes in other editors so we need
                // to make sure we're only operating on the root node for this editor
                if (!editor._updating) {
                    return;
                }

                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    return;
                }

                const incomingNodes = rootNode.getChildren();

                const incomingIsClean =
                    incomingNodes.length <= paragraphs &&
                    incomingNodes.every($isParagraphNode);

                if (!incomingIsClean) {
                    // strip out any decorator nodes as we can't convert them to paragraphs
                    let cleanedNodes = incomingNodes.filter((node) => {
                        return !$isDecoratorNode(node);
                    });

                    // truncate cleanedNodes to the specified number of paragraphs
                    cleanedNodes = cleanedNodes.slice(0, paragraphs);

                    // for any list nodes, convert first item of list to a paragraph
                    // for other non-paragraph nodes, convert them to a paragraph
                    cleanedNodes = cleanedNodes.map((node) => {
                        if ($isListNode(node)) {
                            const firstListItem = node.getChildren()[0];
                            return $createParagraphNode().append(...firstListItem.getChildren());
                        } else if (!$isParagraphNode(node)) {
                            return $createParagraphNode().append(...node.getChildren());
                        } else {
                            return node;
                        }
                    });

                    // remove all existing nodes from state
                    incomingNodes.forEach(node => node.remove());
                    // add our new node to the now empty rootNode
                    cleanedNodes.forEach(node => rootNode.append(node));
                    // move selection to end of new node
                    rootNode.selectEnd();
                }
            })
        );
    }, [editor, paragraphs]);
    return null;
};

export default RestrictContentPlugin;
