import {$createTKNode, TKNode} from '@tryghost/kg-default-nodes';
import {$getNodeByKey, $nodesOfType} from 'lexical';
import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTextEntity} from '../hooks/useExtendedTextEntity';

const REGEX = new RegExp(/(?<!\w)TK(?!\w)/);

export default function TKPlugin() {
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

    const renderIndicators = useCallback((nodes) => {
        // clean up existing indicators
        document.body.querySelectorAll('.tk-indicator').forEach((el) => {
            el.remove();
        });

        // add indicators to the dom
        nodes.forEach((node) => {
            const element = editor.getElementByKey(node.getKey());
            const editorParent = editor.getRootElement().parentElement;
            const editorParentTop = editorParent.getBoundingClientRect().top;
            const tkParentTop = element.parentElement.getBoundingClientRect().top;
            const editorWidth = editorParent.offsetWidth;

            // create an element
            // TODO: styles can migrated to use tailwind/themes
            const indicator = document.createElement('div');
            indicator.style.position = 'absolute';
            indicator.style.left = `${editorWidth + 10}px`;
            indicator.style.top = `${tkParentTop - editorParentTop}px`;
            indicator.style.padding = '.5rem';
            indicator.textContent = 'TK';
            indicator.classList.add('tk-indicator');
            indicator.dataset.key = node.getKey();
            indicator.style.color = 'darkgray';
            indicator.style.fontSize = '1.3rem';

            indicator.onclick = indicatorOnClick;

            // add to the editor parent (adding to editor triggers an infinite loop)
            editorParent.appendChild(indicator);
        });
    }, [editor]);

    // run once on mount and then let the editor state listener handle updates
    useLayoutEffect(() => {
        const foundNodes = getTKNodesForIndicators(editor.getEditorState());
        setTkNodes(foundNodes);
        renderIndicators(foundNodes);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);

    // update TKs on editor state updates
    useEffect(() => {
        const removeListener = editor.registerUpdateListener(({editorState}) => {
            const foundNodes = getTKNodesForIndicators(editorState);
            // this is a simple way to check that the nodes actually changed before we re-render indicators on the dom
            if (foundNodes.toString() !== tkNodes.toString()) {
                setTkNodes(foundNodes);
                renderIndicators(foundNodes);
            }
        });

        return () => {
            removeListener();
        };
    }, [editor, renderIndicators, getTKNodesForIndicators, setTkNodes, tkNodes]);

    const createTKNode = useCallback((textNode) => {
        return $createTKNode(textNode.getTextContent());
    }, []);

    const getTKMatch = useCallback((text) => {
        const matchArr = REGEX.exec(text);

        if (matchArr === null) {
            return null;
        }

        const startOffset = matchArr.index;
        const endOffset = startOffset + 2;

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
