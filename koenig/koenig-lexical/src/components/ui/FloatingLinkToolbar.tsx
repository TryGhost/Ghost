import FloatingToolbar from './FloatingToolbar';
import React from 'react';
import debounce from 'lodash/debounce';
import {$createRangeSelection, $getNearestNodeFromDOMNode, $setSelection} from 'lexical';
import {$isLinkNode} from '@lexical/link';
import {LinkToolbar} from './LinkToolbar';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LinkNode} from '@lexical/link';

interface FloatingLinkToolbarProps {
    anchorElem?: HTMLElement;
    onEditLink: (opts: {href: string}) => void;
    disabled?: boolean;
}

export function FloatingLinkToolbar({anchorElem, onEditLink, disabled}: FloatingLinkToolbarProps) {
    const [editor] = useLexicalComposerContext();
    const [linkNode, setLinkNode] = React.useState<LinkNode | null>(null);
    const [href, setHref] = React.useState('');
    const toolbarRef = React.useRef<HTMLDivElement>(null);
    const [targetElem, setTargetElem] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        if (disabled) {
            if (linkNode) {
                setLinkNode(null);
                setHref('');
            }
            return;
        }

        const onMouseEnter = (event: MouseEvent) => {
            if (toolbarRef.current?.contains(event.target as Node)) {
                return;
            }

            editor.update(() => {
                const node = $getNearestNodeFromDOMNode(event.target as Node);
                setTargetElem(event.target as HTMLElement);
                const isLink = $isLinkNode(node) || $isLinkNode(node?.getParent());

                if (!isLink) {
                    if (linkNode) {
                        setLinkNode(null);
                    }

                    return;
                }
                const link = ($isLinkNode(node) ? node : node?.getParent()) as LinkNode;

                setLinkNode(link);
                setHref(link.getURL());
            });
        };

        const onMouseEnterDebounced = debounce(onMouseEnter, 50);

        document.addEventListener('mousemove', onMouseEnterDebounced);

        return () => {
            onMouseEnterDebounced.cancel();
            document.removeEventListener('mousemove', onMouseEnterDebounced);
        };
    }, [disabled, editor, linkNode]);

    const onEdit = () => {
        editor.update(() => {
            if (!linkNode) {
                return;
            }
            const selection = $createRangeSelection();
            const firstChild = linkNode.getFirstChild();
            const lastChild = linkNode.getLastChild();
            if (firstChild && lastChild) {
                selection.setTextNodeRange(
                    firstChild,
                    0,
                    lastChild,
                    lastChild.getTextContentSize()
                );
            }
            $setSelection(selection);
            onEditLink({href});
        });
    };

    const onRemove = () => {
        editor.update(() => {
            if (!linkNode) {
                return;
            }
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
