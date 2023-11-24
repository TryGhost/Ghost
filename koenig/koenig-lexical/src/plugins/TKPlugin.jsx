import {$createTKNode, TKNode} from '@tryghost/kg-default-nodes';
import {$getNodeByKey, $nodesOfType} from 'lexical';
import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTextEntity} from '../hooks/useExtendedTextEntity';

const REGEX = new RegExp(/(^|.)([^a-zA-Z0-9\s]?(TK)+[^a-zA-Z0-9\s]?)($|.)/);

export default function TKPlugin({setTkCount = () => {}}) {
    const [editor] = useLexicalComposerContext();
    const [tkNodes, setTkNodes] = useState([]);

    useEffect(() => {
        if (!editor.hasNodes([TKNode])) {
            throw new Error('TKPlugin: TKNode not registered on editor');
        }
    }, [editor]);

    const getTKNodesForIndicators = useCallback((editorState) => {
        let foundNodes = [];

        if (!editorState) {
            return foundNodes;
        }

        // this collects all nodes
        editorState.read(() => {
            foundNodes = $nodesOfType(TKNode);
        });

        return foundNodes;
    }, []);

    // TODO: may be some competition with the listener for clicking outside the editor since clicking on the indicator sometimes focuses the document body
    const indicatorOnClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.update(() => {
            const node = $getNodeByKey(e.target.dataset.key);
            node.select(0, node.getTextContentSize());
        });
    };

    const indicatorOnMouseEnter = (e) => {
        const classes = editor._config.theme.tkHighlighted?.split(' ') || [];
        editor.getElementByKey(e.target.dataset.key).classList.add(classes);
    };

    const indicatorOnMouseLeave = (e) => {
        const classes = editor._config.theme.tkHighlighted?.split(' ') || [];
        editor.getElementByKey(e.target.dataset.key).classList.remove(classes);
    };

    const renderIndicators = useCallback((nodes) => {
        // clean up existing indicators
        document.body.querySelectorAll('[data-has-tk]').forEach((el) => {
            el.remove();
        });

        // pull only the first child for each parent for the indicator as this is what we link to on click
        const parentKeys = new Set();
        const firstTks = nodes.filter((node) => {
            if (parentKeys.has(node.__parent)) {
                return false;
            }
            parentKeys.add(node.__parent);
            return true;
        });

        // add indicators to the dom
        firstTks.forEach((node) => {
            const element = editor.getElementByKey(node.getKey());
            const editorParent = editor.getRootElement().parentElement;
            const editorParentTop = editorParent.getBoundingClientRect().top;
            const tkParentTop = element.parentElement.getBoundingClientRect().top;

            // create an element
            const indicator = document.createElement('div');
            indicator.style.top = `${tkParentTop - editorParentTop + 4}px`;
            indicator.textContent = 'TK';
            indicator.classList.add('absolute', '-right-14', 'p-1', 'text-xs', 'text-grey-600', 'font-medium', 'cursor-pointer');
            indicator.dataset.hasTk = true;
            indicator.dataset.key = node.getKey();

            indicator.onclick = indicatorOnClick;
            indicator.onmouseenter = indicatorOnMouseEnter;
            indicator.onmouseleave = indicatorOnMouseLeave;

            // add to the editor parent (adding to editor triggers an infinite loop)
            editorParent.appendChild(indicator);
        });
    }, [editor]);

    // run once on mount and then let the editor state listener handle updates
    useLayoutEffect(() => {
        const nodes = getTKNodesForIndicators(editor.getEditorState());
        setTkNodes(nodes);
        setTkCount(nodes.length);
        renderIndicators(nodes);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);

    // update TKs on editor state updates
    useEffect(() => {
        const removeListener = editor.registerUpdateListener(({editorState}) => {
            const foundNodes = getTKNodesForIndicators(editorState);
            // this is a simple way to check that the nodes actually changed before we re-render indicators on the dom
            // TODO: this is a problem because it doesn't account for if the first TK node changes, but the second one doesn't
            //  as the parent is not changed
            if (foundNodes.toString() !== tkNodes.toString()) {
                setTkNodes(foundNodes);
                setTkCount(foundNodes.length);
                renderIndicators(foundNodes);
            }
        });

        return () => {
            removeListener();
        };
    }, [editor, renderIndicators, getTKNodesForIndicators, setTkNodes, tkNodes, setTkCount]);

    const createTKNode = useCallback((textNode) => {
        return $createTKNode(textNode.getTextContent());
    }, []);

    const getTKMatch = useCallback((text) => {
        const matchArr = REGEX.exec(text);

        if (matchArr === null) {
            return null;
        }

        // negative lookbehind isn't supported before Safari 16.4
        // so we capture the preceding char and test it here
        if (matchArr[1] && /\w/.test(matchArr[1])) {
            return null;
        }

        // we also check any following char in code to avoid an overly
        // complex regex when looking for word-chars following the optional
        // trailing symbol char
        if (matchArr[4] && !/\s/.test(matchArr[4])) {
            return null;
        }

        const startOffset = matchArr.index + matchArr[1].length;
        const endOffset = startOffset + matchArr[2].length;

        return {
            end: endOffset,
            start: startOffset
        };
    }, []);

    useLexicalTextEntity(
        getTKMatch,
        TKNode,
        createTKNode,
    );

    return null;
}
