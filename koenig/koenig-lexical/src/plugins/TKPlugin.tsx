import CardContext from '../context/CardContext';
import React from 'react';
import {$createTKNode, $isTKNode, ExtendedTextNode, TKNode} from '@tryghost/kg-default-nodes';
import {$getNodeByKey, $getSelection, $isDecoratorNode, $isRangeSelection, TextNode} from 'lexical';
import {SELECT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {createPortal} from 'react-dom';
import {useCallback, useContext, useEffect, useState} from 'react';
import {useKoenigTextEntity} from '../hooks/useKoenigTextEntity';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useTKContext} from '../context/TKContext';
import type {LexicalEditor} from 'lexical';

const REGEX = new RegExp(/(^|.)([^\p{L}\p{N}\s]*(TK|Tk|tk)+[^\p{L}\p{N}\s]*)(.)?/u);
const WORD_CHAR_REGEX = new RegExp(/\p{L}|\p{N}/u);

function TKIndicator({editor, rootElement, parentKey, nodeKeys}: {editor: LexicalEditor; rootElement: HTMLElement; parentKey: string; nodeKeys: string[]}) {
    const tkClasses = editor._config.theme.tk?.split(' ') || [];
    const tkHighlightClasses = editor._config.theme.tkHighlighted?.split(' ') || [];

    const containingElement = editor.getElementByKey(parentKey);

    // position element relative to the TK Node containing element
    const calculatePosition = useCallback(() => {
        let top = 0;
        let right = -56;

        const rootElementRect = rootElement.getBoundingClientRect();

        if (!containingElement) {
            return {top, right};
        }

        const positioningElement = containingElement.querySelector('[data-kg-card]') || containingElement;
        const positioningElementRect = positioningElement.getBoundingClientRect();

        top = positioningElementRect.top - rootElementRect.top + 4;

        if (positioningElementRect.right > rootElementRect.right) {
            right = right - (positioningElementRect.right - rootElementRect.right);
        }

        return {top, right};
    }, [rootElement, containingElement]);

    const [position, setPosition] = useState(calculatePosition());

    // select the TK node when the indicator is clicked,
    // cycle selection through associated TK nodes when clicked multiple times
    // TODO: may be some competition with the listener for clicking outside the editor since clicking on the indicator sometimes focuses the document body
    const onClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        editor.update(() => {
            if ($isDecoratorNode($getNodeByKey(parentKey))) {
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: parentKey});
                return;
            }

            let nodeKeyToSelect = nodeKeys[0];

            // if there is a selection, and it is a TK node, select the next one
            const selection = $getSelection();
            if ($isRangeSelection(selection) && $isTKNode(selection.getNodes()[0])) {
                const selectedIndex = nodeKeys.indexOf(selection.getNodes()[0].getKey());
                if (selectedIndex === nodeKeys.length - 1) {
                    nodeKeyToSelect = nodeKeys[0];
                } else {
                    nodeKeyToSelect = nodeKeys[selectedIndex + 1];
                }
            }

            const node = $getNodeByKey(nodeKeyToSelect);
            if (!node) {return;}
            (node as TextNode).select(0, node.getTextContentSize());
        });
    };

    const toggleHighlightClasses = (isHighlighted: boolean) => {
        let isCard;

        editor.getEditorState().read(() => {
            if ($isDecoratorNode($getNodeByKey(parentKey))) {
                isCard = true;
            }
        });

        if (isCard) {
            return;
        }

        nodeKeys.forEach((key: string) => {
            const element = editor.getElementByKey(key);
            if (!element) {return;}
            if (isHighlighted) {
                element.classList.remove(...tkClasses);
                element.classList.add(...tkHighlightClasses);
            } else {
                element.classList.add(...tkClasses);
                element.classList.remove(...tkHighlightClasses);
            }
        });
    };

    // highlight all associated TK nodes when the indicator is hovered
    const onMouseEnter = (_e: React.MouseEvent) => {
        toggleHighlightClasses(true);
    };

    const onMouseLeave = (_e: React.MouseEvent) => {
        toggleHighlightClasses(false);
    };

    // set up an observer to reposition the indicator when the TK node containing
    // element moves relative to the root element
    useEffect(() => {
        const observer = new ResizeObserver(() => (setPosition(calculatePosition())));

        observer.observe(rootElement);
        if (containingElement) {
            observer.observe(containingElement);
        }

        return () => {
            observer.disconnect();
        };
    }, [rootElement, containingElement, calculatePosition]);

    const style = {
        top: `${position.top}px`,
        right: `${position.right}px`
    };

    return (
        <div
            className="absolute cursor-pointer p-1 text-2xs font-medium text-grey-600"
            data-testid="tk-indicator"
            style={style}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >TK</div>
    );
}

export default function TKPlugin() {
    const [editor] = useLexicalComposerContext();
    const {tkNodeMap, addEditorTkNode, removeEditorTkNode, removeEditor} = useTKContext();
    const {nodeKey: parentEditorNodeKey} = useContext(CardContext);

    useEffect(() => {
        if (!editor.hasNodes([TKNode])) {
            throw new Error('TKPlugin: TKNode not registered on editor');
        }

        // clean up editor when it is destroyed - ensures counts are up to date
        // when a nested-editor-containing card is deleted
        return () => {
            removeEditor(editor.getKey());
        };
    }, [editor, removeEditor]);

    useEffect(() => {
        return editor.registerMutationListener(TKNode, (mutatedNodes) => {
            editor.getEditorState().read(() => {
                // mutatedNodes is a Map where each key is the NodeKey, and the value is the state of mutation.
                for (const [tkNodeKey, mutation] of mutatedNodes) {
                    if (mutation === 'destroyed') {
                        removeEditorTkNode(editor.getKey(), tkNodeKey);
                    } else {
                        const parentNodeKey = $getNodeByKey(tkNodeKey)?.getTopLevelElement()?.getKey();
                        const topLevelNodeKey = parentEditorNodeKey || parentNodeKey;
                        addEditorTkNode(editor.getKey(), topLevelNodeKey, tkNodeKey);
                    }
                }
            });
        });
    }, [editor, addEditorTkNode, removeEditorTkNode, parentEditorNodeKey]);

    const createTKNode = useCallback((textNode: TextNode) => {
        return $createTKNode(textNode.getTextContent());
    }, []);

    const getTKMatch = useCallback((text: string) => {
        let matchArr = REGEX.exec(text);

        if (matchArr === null) {
            return null;
        }

        function isValidMatch(match: RegExpExecArray) {
            // negative lookbehind isn't supported before Safari 16.4
            // so we capture the preceding char and test it here
            if (match[1] && match[1].trim() && WORD_CHAR_REGEX.test(match[1]) && match[2].slice(0, 1) !== '—') {
                return false;
            }

            // we also check any following char in code to avoid an overly
            // complex regex when looking for word-chars following the optional
            // trailing symbol char
            if (match[4] && match[4].trim() && WORD_CHAR_REGEX.test(match[4]) && match[2].slice(-1) !== '—') {
                return false;
            }

            return true;
        }

        // our regex will match invalid TKs because we can't use negative lookbehind
        // so we need to loop through the matches discarding any that are invalid
        // and keeping track of the original input so we have correct offsets
        // when we find a valid match
        let textBeforeMatch = '';

        while (matchArr !== null && !isValidMatch(matchArr)) {
            textBeforeMatch += text.slice(0, matchArr.index + matchArr[0].length - 1);
            text = text.slice(matchArr.index + matchArr[0].length - 1);
            matchArr = REGEX.exec(text);
        }

        if (matchArr === null) {
            return null;
        }

        const offsetAdjustment = textBeforeMatch.length;

        const startOffset = offsetAdjustment + matchArr.index + matchArr[1].length;
        const endOffset = startOffset + matchArr[2].length;

        return {
            end: endOffset,
            start: startOffset
        };
    }, []);

    // TODO: register ExtendedTextNode + replacement on nested editors
    const nodeType = editor.hasNode(ExtendedTextNode) ? ExtendedTextNode : TextNode;

    useKoenigTextEntity(
        getTKMatch,
        TKNode,
        createTKNode,
        nodeType
    );

    // we only want to render TK indicators for the top level editor
    if (parentEditorNodeKey) {
        return null;
    }

    const editorRoot = editor.getRootElement();
    const editorRootParent = editor.getRootElement()?.parentElement;

    if (!editorRootParent) {
        return null;
    }

    const TKIndicators = (Object.entries(tkNodeMap) as [string, string[]][]).map(([parentKey, nodeKeys]) => {
        const parentContainer = editor.getElementByKey(parentKey);

        if (!parentContainer) {
            return false;
        }

        return (
            <TKIndicator
                key={parentKey}
                editor={editor}
                nodeKeys={nodeKeys}
                parentKey={parentKey}
                rootElement={editorRoot!}
            />
        );
    }).filter(Boolean);

    return createPortal(
        TKIndicators,
        editorRootParent
    );
}
