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

    const scrollContainer = React.useMemo(() => {
        return getScrollParent(editor.getRootElement());
    }, [editor]);

    const linkToolbarRef = React.useRef(null);

    // Position the link input and search results when they open.
    // Appears below the selected text unless at bottom of the document where it appears above toolbar.
    const updateLinkToolbarPosition = React.useCallback(() => {
        editor.update(() => {
            const toolbarElement = linkToolbarRef.current;
            if (!toolbarElement) {
                return;
            }

            const selection = $getSelection();
            if (!selection) {
                return;
            }

            const rangeRect = $getSelectionRangeRect({editor, selection});

            const editorElem = anchorElem.parentElement;

            if (!rangeRect || !editorElem || !toolbarElement) {
                return;
            }

            const editorRect = editorElem.getBoundingClientRect();

            const top = rangeRect.bottom + 10;
            const left = editorRect.left;
            const right = editorRect.right;

            toolbarElement.style.top = `${top}px`;
            toolbarElement.style.left = `${left}px`;
            toolbarElement.style.width = `${right - left}px`;

            // TODO: Max height is hardcoded to 30% of window height for results list + 54px (toolbar height),
            //  this is based on current styling and will need adjusting if styles change. We make this calculation
            //  to avoid the toolbar jumping between above/below positioning when the results list changes size.
            const toolbarMaxHeight = (window.innerHeight / 100 * 30) + 54;
            const toolbarRect = toolbarElement.getBoundingClientRect();

            if (scrollContainer.scrollTop + toolbarRect.top + toolbarMaxHeight > scrollContainer.scrollHeight) {
                toolbarElement.style.top = `${rangeRect.top - toolbarRect.height - 55}px`;
            }
        });
    }, [anchorElem, editor, scrollContainer]);

    React.useEffect(() => {
        updateLinkToolbarPosition();
    }, [updateLinkToolbarPosition]);

    // re-position on document scroll, window resize,
    // plus search results change to avoid gap appearing when positioned above the toolbar
    React.useEffect(() => {
        const scrollElement = getScrollParent(anchorElem);

        window.addEventListener('resize', updateLinkToolbarPosition);
        if (scrollElement) {
            scrollElement.addEventListener('scroll', updateLinkToolbarPosition);
        }

        const toolbarElement = linkToolbarRef.current;
        const toolbarMutationObserver = new MutationObserver(updateLinkToolbarPosition);
        toolbarMutationObserver.observe(toolbarElement, {childList: true, subtree: true});

        return () => {
            window.removeEventListener('resize', updateLinkToolbarPosition);
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', updateLinkToolbarPosition);
            }
            if (toolbarElement) {
                toolbarMutationObserver.disconnect();
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
