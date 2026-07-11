import React from 'react';
import trackEvent from '../../utils/analytics';
import {$getSelection} from 'lexical';
import {InputListGroup} from './InputList';
import {KeyboardSelectionWithGroups} from './KeyboardSelectionWithGroups';
import {LinkInputSearchItem} from './LinkInputSearchItem';
import {getScrollParent} from '../../utils/getScrollParent';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function AtLinkResultsPopup({atLinkNode, isSearching, listOptions, query, onSelect}) {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!query) {
            trackEvent('Link dropdown: Opened', {context: 'at-link'});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scrollContainer = React.useMemo(() => {
        return getScrollParent(editor.getRootElement());
    }, [editor]);

    const popupRef = React.useRef(null);

    const testId = 'at-link-results';

    // Position the results popup when they open.
    // Appears below the at-link node unless at bottom of the document where it appears above.
    const updatePopupPosition = React.useCallback(() => {
        editor.update(() => {
            const popupElement = popupRef.current;
            if (!popupElement) {
                return;
            }

            const selection = $getSelection();
            if (!selection) {
                return;
            }

            const atLinkElement = editor.getElementByKey(atLinkNode.getKey());
            const atLinkRect = atLinkElement.getBoundingClientRect();

            const editorElem = editor.getRootElement();

            if (!atLinkRect || !editorElem || !popupElement) {
                return;
            }

            const editorRect = editorElem.getBoundingClientRect();

            const top = atLinkRect.bottom + 10;
            const left = editorRect.left;
            const right = editorRect.right;

            popupElement.style.top = `${top}px`;
            popupElement.style.left = `${left}px`;
            popupElement.style.width = `${right - left}px`;

            // TODO: Max height is hardcoded to 30% of window height for results list + 54px (toolbar height),
            //  this is based on current styling and will need adjusting if styles change. We make this calculation
            //  to avoid the toolbar jumping between above/below positioning when the results list changes size.
            const popupMaxHeight = (window.innerHeight / 100 * 30) + 54;
            const popupRect = popupElement.getBoundingClientRect();

            if (scrollContainer.scrollTop + popupRect.top + popupMaxHeight > scrollContainer.scrollHeight) {
                popupElement.style.top = `${atLinkRect.top - popupRect.height - 10}px`;
            }
        });
    }, [editor, atLinkNode, scrollContainer]);

    React.useEffect(() => {
        updatePopupPosition();
    }, [updatePopupPosition]);

    // re-position on document scroll, window resize,
    // plus search results change to avoid gap appearing when positioned above the toolbar
    React.useEffect(() => {
        window.addEventListener('resize', updatePopupPosition);
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updatePopupPosition);
        }

        const popupElement = popupRef.current;
        const popupMutationObserver = new MutationObserver(updatePopupPosition);
        popupMutationObserver.observe(popupElement, {childList: true, subtree: true});

        return () => {
            window.removeEventListener('resize', updatePopupPosition);
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', updatePopupPosition);
            }
            if (popupElement) {
                popupMutationObserver.disconnect();
            }
        };
    }, [editor, scrollContainer, updatePopupPosition]);

    const getItem = (item, selected, onMouseOver, scrollIntoView) => {
        return (
            <LinkInputSearchItem
                key={item.value}
                dataTestId={testId}
                highlightString={query}
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                onClick={onSelect}
                onMouseOver={onMouseOver}
            />
        );
    };

    const getGroup = (group, {showSpinner} = {}) => {
        return (
            <InputListGroup dataTestId={testId} group={group} showSpinner={showSpinner} />
        );
    };

    return (
        <div ref={popupRef} className="not-kg-prose fixed z-[10000]" data-testid="at-link-results">
            <div className="relative m-0 flex w-full flex-col rounded-lg bg-white p-1 px-2 font-sans text-sm font-medium shadow-md dark:bg-grey-950">
                <ul className="max-h-[30vh] w-full overflow-y-auto bg-white py-1 dark:bg-grey-950">
                    <KeyboardSelectionWithGroups
                        getGroup={getGroup}
                        getItem={getItem}
                        groups={listOptions}
                        isLoading={isSearching}
                        onSelect={onSelect}
                    />
                </ul>
            </div>
        </div>
    );
}

export default AtLinkResultsPopup;
