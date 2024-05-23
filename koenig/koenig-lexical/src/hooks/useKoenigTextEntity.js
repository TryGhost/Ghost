// see lexical useLexicalTextEntity hook
// duplicated here because the upstream version is dependent on TextNode but we use ExtendedTextNode

import {$createTextNode, $isTextNode, TextNode} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function useKoenigTextEntity(getMatch, targetNode, createNode, nodeType = TextNode) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return mergeRegister(
            ...registerExtendedTextEntity(editor, getMatch, targetNode, createNode, nodeType),
        );
    }, [createNode, editor, getMatch, targetNode, nodeType]);
}

function registerExtendedTextEntity(editor, getMatch, targetNode, createNode, nodeType) {
    const isTargetNode = (node) => {
        return node instanceof targetNode;
    };

    const replaceWithSimpleText = (node) => {
        const textNode = $createTextNode(node.getTextContent());
        textNode.setFormat(node.getFormat());
        node.replace(textNode);
    };

    const getMode = (node) => {
        return node.getLatest().__mode;
    };

    const textNodeTransform = (node) => {
        if (!node.isSimpleText()) {
            return;
        }

        const prevSibling = node.getPreviousSibling();
        let text = node.getTextContent();
        let currentNode = node;
        let match;

        if ($isTextNode(prevSibling)) {
            const previousText = prevSibling.getTextContent();
            const combinedText = previousText + text;
            const prevMatch = getMatch(combinedText);

            if (isTargetNode(prevSibling)) {
                if (prevMatch === null || getMode(prevSibling) !== 0) {
                    replaceWithSimpleText(prevSibling);

                    return;
                } else {
                    const diff = prevMatch.end - previousText.length;

                    if (diff > 0) {
                        const concatText = text.slice(0, diff);
                        const newTextContent = previousText + concatText;
                        prevSibling.select();
                        prevSibling.setTextContent(newTextContent);

                        if (diff === text.length) {
                            node.remove();
                        } else {
                            const remainingText = text.slice(diff);
                            node.setTextContent(remainingText);
                        }

                        return;
                    }
                }
            } else if (prevMatch === null || prevMatch.start < previousText.length) {
                return;
            }
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            match = getMatch(text);
            let nextText = match === null ? '' : text.slice(match.end);
            text = nextText;

            if (nextText === '') {
                const nextSibling = currentNode?.getNextSibling();

                if ($isTextNode(nextSibling)) {
                    nextText = currentNode.getTextContent() + nextSibling.getTextContent();
                    const nextMatch = getMatch(nextText);

                    if (nextMatch === null) {
                        if (isTargetNode(nextSibling)) {
                            replaceWithSimpleText(nextSibling);
                        } else {
                            nextSibling.markDirty();
                        }

                        return;
                    } else if (nextMatch.start !== 0) {
                        return;
                    }
                }
            } else {
                const nextMatch = getMatch(nextText);

                if (nextMatch !== null && nextMatch.start === 0) {
                    return;
                }
            }

            if (match === null) {
                return;
            }

            if (
                match.start === 0 &&
                $isTextNode(prevSibling) &&
                prevSibling.isTextEntity()
            ) {
                continue;
            }

            let nodeToReplace;

            if (match.start === 0) {
                [nodeToReplace, currentNode] = currentNode.splitText(match.end);
            } else {
                [, nodeToReplace, currentNode] = currentNode.splitText(
                    match.start,
                    match.end,
                );
            }

            const replacementNode = createNode(nodeToReplace);
            replacementNode.setFormat(nodeToReplace.getFormat());
            nodeToReplace.replace(replacementNode);

            if (currentNode === null) {
                return;
            }
        }
    };

    const reverseNodeTransform = (node) => {
        const text = node.getTextContent();
        const match = getMatch(text);

        if (match === null || match.start !== 0) {
            replaceWithSimpleText(node);

            return;
        }

        if (text.length > match.end) {
            // This will split out the rest of the text as simple text
            node.splitText(match.end);

            return;
        }

        const prevSibling = node.getPreviousSibling();

        if ($isTextNode(prevSibling) && prevSibling.isTextEntity()) {
            replaceWithSimpleText(prevSibling);
            replaceWithSimpleText(node);
        }

        const nextSibling = node.getNextSibling();

        if ($isTextNode(nextSibling) && nextSibling.isTextEntity()) {
            replaceWithSimpleText(nextSibling);

            // This may have already been converted in the previous block
            if (isTargetNode(node)) {
                replaceWithSimpleText(node);
            }
        }
    };

    const removePlainTextTransform = editor.registerNodeTransform(
        nodeType,
        textNodeTransform,
    );
    const removeReverseNodeTransform = editor.registerNodeTransform(
        targetNode,
        reverseNodeTransform,
    );

    return [removePlainTextTransform, removeReverseNodeTransform];
}
