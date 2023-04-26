import FloatingToolbar from './FloatingToolbar';
import React from 'react';
import {$createRangeSelection, $getNearestNodeFromDOMNode, $setSelection} from 'lexical';
import {$isLinkNode} from '@lexical/link';
import {LinkToolbar} from './LinkToolbar';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {debounce} from 'lodash';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function FloatingLinkToolbar({anchorElem, onEditLink, disabled}) {
    const [editor] = useLexicalComposerContext();
    const [linkNode, setLinkNode] = React.useState(null);
    const [href, setHref] = React.useState('');
    const toolbarRef = React.useRef(null);
    const [targetElem, setTargetElem] = React.useState(null);

    React.useEffect(() => {
        if (disabled) {
            if (linkNode) {
                setLinkNode(null);
                setHref('');
            }
            return;
        }

        const onMouseEnter = (event) => {
            editor.update(() => {
                if (toolbarRef.current?.contains(event.target)) {
                    return;
                }
                const node = $getNearestNodeFromDOMNode(event.target);
                setTargetElem(event.target);
                const isLink = $isLinkNode(node) || $isLinkNode(node?.getParent());

                if (!isLink) {
                    if (linkNode) {
                        setLinkNode(null);
                    }

                    return;
                }
                let link = $isLinkNode(node) ? node : node.getParent();

                setLinkNode(link);
                setHref(link.getURL());
            });
        };

        const onMouseEnterDebounced = debounce(onMouseEnter, 50);

        document.addEventListener('mousemove', onMouseEnterDebounced);

        return () => {
            document.removeEventListener('mousemove', onMouseEnterDebounced);
        };
    }, [disabled, editor, linkNode]);

    const onEdit = () => {
        editor.update(() => {
            const selection = $createRangeSelection();
            // select all children because createRectsFromDOMRange method from lexical is not working properly for link node
            selection.setTextNodeRange(
                linkNode.getFirstChild(),
                0,
                linkNode.getLastChild(),
                linkNode.getLastChild().getTextContentSize()
            );
            $setSelection(selection);
            onEditLink({href});
        });
    };

    const onRemove = () => {
        editor.update(() => {
            linkNode.select();
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
            setLinkNode(null);
        });
    };

    if (!linkNode) {
        return null;
    }
    return (
        <FloatingToolbar
            anchorElem={anchorElem}
            controlOpacity={true}
            editor={editor}
            isVisible={true}
            targetElem={targetElem}
            toolbarRef={toolbarRef}
        >
            <LinkToolbar href={href} onEdit={onEdit} onRemove={onRemove} />
        </FloatingToolbar>
    );
}
