import KoenigComposerContext from '../../context/KoenigComposerContext';
import Portal from './Portal';
import React from 'react';
import trackEvent from '../../utils/analytics';
import {$createRangeSelection, $getSelection, $isRangeSelection, $setSelection} from 'lexical';
import {$getSelectionRangeRect} from '../../utils/$getSelectionRangeRect';
import {LinkInputWithSearch} from './LinkInputWithSearch';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {getScrollParent} from '../../utils/getScrollParent';
import {isInternalUrl} from '../../utils/isInternalUrl';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

interface LinkActionToolbarWithSearchProps {
    anchorElem?: HTMLElement;
    href?: string;
    onClose: () => void;
    [key: string]: unknown;
}

export function LinkActionToolbarWithSearch({anchorElem, href, onClose, ...props}: LinkActionToolbarWithSearchProps) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);

    const scrollContainer = React.useMemo(() => {
        return getScrollParent(editor.getRootElement());
    }, [editor]);

    const linkToolbarRef = React.useRef<HTMLDivElement>(null);

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

            const editorElem = anchorElem?.parentElement;

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

            const toolbarMaxHeight = (window.innerHeight / 100 * 30) + 54;
            const toolbarRect = toolbarElement.getBoundingClientRect();

            if (scrollContainer && scrollContainer.scrollTop + toolbarRect.top + toolbarMaxHeight > scrollContainer.scrollHeight) {
                toolbarElement.style.top = `${rangeRect.top - toolbarRect.height - 55}px`;
            }
        });
    }, [anchorElem, editor, scrollContainer]);

    React.useEffect(() => {
        updateLinkToolbarPosition();
    }, [updateLinkToolbarPosition]);

    React.useEffect(() => {
        const scrollElement = getScrollParent(anchorElem ?? null);

        window.addEventListener('resize', updateLinkToolbarPosition);
        if (scrollElement) {
            scrollElement.addEventListener('scroll', updateLinkToolbarPosition);
        }

        const toolbarElement = linkToolbarRef.current;
        const toolbarMutationObserver = new MutationObserver(updateLinkToolbarPosition);
        if (toolbarElement) {
            toolbarMutationObserver.observe(toolbarElement, {childList: true, subtree: true});
        }

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

    const onLinkUpdate = (updatedHref: string, type?: string) => {
        editor.update(() => {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, updatedHref || null);

            // remove selection to avoid format menu popup
            const selection = $getSelection();
            if (selection && $isRangeSelection(selection)) {
                const focusNode = selection.focus.getNode();
                const rangeSelection = $createRangeSelection();
                rangeSelection.setTextNodeRange(focusNode, focusNode.getTextContentSize(), focusNode, focusNode.getTextContentSize());
                $setSelection(rangeSelection);
            }

            onClose();

            if (type === 'internal' || type === 'default') {
                trackEvent('Link dropdown: Internal link chosen', {context: 'text', fromLatest: type === 'default'});
            } else {
                try {
                    const target = isInternalUrl(updatedHref, cardConfig?.siteUrl ?? '') ? 'internal' : 'external';
                    trackEvent('Link dropdown: URL entered', {context: 'text', target});
                } catch {
                    // noop
                }
            }
        });
    };

    return (
        <Portal>
            <div ref={linkToolbarRef} className="not-kg-prose fixed z-[10000]">
                <LinkInputWithSearch
                    cancel={onClose}
                    href={href}
                    update={onLinkUpdate}
                    {...props}
                />
            </div>
        </Portal>
    );
}
