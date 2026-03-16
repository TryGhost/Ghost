// see lexical useLexicalTextEntity hook
// duplicated here because the upstream version is dependent on TextNode but we use ExtendedTextNode

import {$createTextNode, $isTextNode, TextNode} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {Klass, LexicalEditor, LexicalNode, TextModeType, TextNode as TextNodeType} from 'lexical';

interface TextMatch {
    start: number;
    end: number;
}

export function useKoenigTextEntity(
    getMatch: (text: string) => TextMatch | null,
    targetNode: Klass<LexicalNode>,
    createNode: (node: TextNodeType) => LexicalNode,
    nodeType: Klass<LexicalNode> = TextNode
): void {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return mergeRegister(
            ...registerExtendedTextEntity(editor, getMatch, targetNode, createNode, nodeType),
        );
    }, [createNode, editor, getMatch, targetNode, nodeType]);
}

function registerExtendedTextEntity(
    editor: LexicalEditor,
    getMatch: (text: string) => TextMatch | null,
    targetNode: Klass<LexicalNode>,
    createNode: (node: TextNodeType) => LexicalNode,
    nodeType: Klass<LexicalNode>
): Array<() => void> {
    const isTargetNode = (node: LexicalNode): boolean => {
        return node instanceof targetNode;
    };

    const replaceWithSimpleText = (node: TextNodeType): void => {
        const textNode = $createTextNode(node.getTextContent());
        textNode.setFormat(node.getFormat());
        node.replace(textNode);
    };

    // 'normal' is the default mode; the original code compared the numeric __mode
    // against 0 (normal), which is equivalent to comparing getMode() against 'normal'
    const getMode = (node: TextNodeType): TextModeType => {
        return node.getLatest().getMode();
    };

    const textNodeTransform = (node: TextNodeType): void => {
        if (!node.isSimpleText()) {
            return;
        }

        const prevSibling = node.getPreviousSibling();
        let text = node.getTextContent();
        let currentNode: TextNodeType | null = node;
        let match: TextMatch | null;

        if ($isTextNode(prevSibling)) {
            const previousText = prevSibling.getTextContent();
            const combinedText = previousText + text;
            const prevMatch = getMatch(combinedText);

            if (isTargetNode(prevSibling)) {
                if (prevMatch === null || getMode(prevSibling) !== 'normal') {
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


        while (true) {
            match = getMatch(text);
            let nextText = match === null ? '' : text.slice(match.end);
            text = nextText;

            if (nextText === '') {
                const nextSibling = currentNode?.getNextSibling();

                if ($isTextNode(nextSibling)) {
                    nextText = currentNode!.getTextContent() + nextSibling.getTextContent();
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

            let nodeToReplace: TextNodeType;

            if (match.start === 0) {
                [nodeToReplace, currentNode] = currentNode!.splitText(match.end) as [TextNodeType, TextNodeType];
            } else {
                [, nodeToReplace, currentNode] = currentNode!.splitText(
                    match.start,
                    match.end,
                ) as [TextNodeType, TextNodeType, TextNodeType];
            }

            const replacementNode = createNode(nodeToReplace);
            (replacementNode as TextNodeType).setFormat(nodeToReplace.getFormat());
            nodeToReplace.replace(replacementNode);

            if (currentNode === null) {
                return;
            }
        }
    };

    const reverseNodeTransform = (node: LexicalNode): void => {
        const text = node.getTextContent();
        const match = getMatch(text);

        if (match === null || match.start !== 0) {
            replaceWithSimpleText(node as TextNodeType);

            return;
        }

        if (text.length > match.end) {
            // This will split out the rest of the text as simple text
            (node as TextNodeType).splitText(match.end);

            return;
        }

        const prevSibling = node.getPreviousSibling();

        if ($isTextNode(prevSibling) && prevSibling.isTextEntity()) {
            replaceWithSimpleText(prevSibling);
            replaceWithSimpleText(node as TextNodeType);
        }

        const nextSibling = node.getNextSibling();

        if ($isTextNode(nextSibling) && nextSibling.isTextEntity()) {
            replaceWithSimpleText(nextSibling);

            // This may have already been converted in the previous block
            if (isTargetNode(node)) {
                replaceWithSimpleText(node as TextNodeType);
            }
        }
    };

    const removePlainTextTransform = editor.registerNodeTransform(
        nodeType as Klass<TextNodeType>,
        textNodeTransform,
    );
    const removeReverseNodeTransform = editor.registerNodeTransform(
        targetNode as Klass<TextNodeType>,
        reverseNodeTransform as (node: TextNodeType) => void,
    );

    return [removePlainTextTransform, removeReverseNodeTransform];
}
