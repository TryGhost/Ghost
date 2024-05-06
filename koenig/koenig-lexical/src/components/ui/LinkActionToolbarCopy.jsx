import Portal from './Portal.jsx';
import React from 'react';
import {$createRangeSelection, $getSelection, $setSelection} from 'lexical';
import {$getSelectionRangeRect} from '../../utils/$getSelectionRangeRect.js';
import {LinkInputCopy} from './LinkInputCopy.jsx';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {getScrollParent} from '../../utils/getScrollParent.js';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function LinkActionToolbarCopy({anchorElem, href, onClose, ...props}) {
    const [editor] = useLexicalComposerContext();

    const linkToolbarRef = React.useRef(null);

    // position the link input and search results when they open
    // appears below the selected text, the full-width of the editor canvas
    const updateLinkToolbarPosition = React.useCallback(() => {
        editor.update(() => {
            const toolbarElement = linkToolbarRef.current;
            if (!toolbarElement) {
                return;
            }

            const selection = $getSelection();
            const rangeRect = $getSelectionRangeRect({editor, selection});

            const scrollerElem = anchorElem.parentElement;

            if (!rangeRect || !scrollerElem || !toolbarElement) {
                return;
            }

            const editorScrollerRect = scrollerElem.getBoundingClientRect();

            const top = rangeRect.bottom + 10;
            const left = editorScrollerRect.left;
            const right = editorScrollerRect.right;

            toolbarElement.style.top = `${top}px`;
            toolbarElement.style.left = `${left}px`;
            toolbarElement.style.width = `${right - left}px`;
        });
    }, [anchorElem, editor]);

    React.useEffect(() => {
        updateLinkToolbarPosition();
    }, [updateLinkToolbarPosition]);

    React.useEffect(() => {
        const scrollElement = getScrollParent(anchorElem);

        window.addEventListener('resize', updateLinkToolbarPosition);
        if (scrollElement) {
            scrollElement.addEventListener('scroll', updateLinkToolbarPosition);
        }

        return () => {
            window.removeEventListener('resize', updateLinkToolbarPosition);
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', updateLinkToolbarPosition);
            }
        };
    }, [anchorElem, updateLinkToolbarPosition]);

    const onLinkUpdate = (updatedHref) => {
        editor.update(() => {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, updatedHref || null);
            // remove selection to avoid format menu popup
            const selection = $getSelection();
            const focusNode = selection.focus.getNode();
            const rangeSelection = $createRangeSelection();
            rangeSelection.setTextNodeRange(focusNode, focusNode.getTextContentSize(), focusNode, focusNode.getTextContentSize());
            $setSelection(rangeSelection);
            onClose();
        });
    };
    return (
        <Portal>
            <div ref={linkToolbarRef} className="not-kg-prose fixed z-[10000]">
                <LinkInputCopy
                    cancel={onClose}
                    href={href}
                    update={onLinkUpdate}
                    {...props}
                />
            </div>
        </Portal>
    );
}
