import FloatingToolbar from '../../components/ui/FloatingToolbar';
import FormatToolbar from './FormatToolbar';
import React from 'react';
import {$getSelection, $isRangeSelection} from 'lexical';
import {LinkActionToolbar} from './LinkActionToolbar.jsx';
import {SnippetActionToolbar} from './SnippetActionToolbar';
import {debounce} from 'lodash-es';

export const toolbarItemTypes = {
    snippet: 'snippet',
    link: 'link',
    text: 'text'
};

export function FloatingFormatToolbar({
    editor,
    anchorElem,
    href,
    isSnippetsEnabled,
    toolbarItemType,
    setToolbarItemType,
    selectionRangeRect,
    hiddenFormats = []
}) {
    const toolbarRef = React.useRef(null);
    const [arrowStyles, setArrowStyles] = React.useState(null);

    const updateArrowStyles = React.useCallback(() => {
        const styles = getArrowPositionStyles({ref: toolbarRef, selectionRangeRect});
        setArrowStyles(styles);
    }, [selectionRangeRect]);

    // toolbar opacity is 0 by default
    // shouldn't display until selection via mouse is complete to avoid toolbar re-positioning while dragging
    const toggleVisibility = React.useCallback(() => {
        if (toolbarItemType && toolbarRef.current?.style.opacity === '0') {
            toolbarRef.current.style.opacity = '1';
            updateArrowStyles();
        }
    }, [toolbarItemType, updateArrowStyles]);

    // TODO: Arrow not updating position on selection change (select all)

    React.useEffect(() => {
        document.addEventListener('mouseup', toggleVisibility); // desktop
        document.addEventListener('touchend', toggleVisibility); // mobile

        return () => {
            document.removeEventListener('mouseup', toggleVisibility); // desktop
            document.removeEventListener('touchend', toggleVisibility); // mobile
        };
    }, [toggleVisibility]);

    React.useEffect(() => {
        const onMouseMove = (e) => {
            // ignore drag events
            if (e?.buttons > 0) {
                return;
            }
            // should not show floating toolbar when we don't have a text selection
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if (selection === null || !$isRangeSelection(selection)) {
                    return;
                }
                if (selection.getTextContent() !== null) {
                    toggleVisibility();
                }
            });
        };
        const debouncedOnMouseMove = debounce(onMouseMove, 10);
        document.addEventListener('mousemove', debouncedOnMouseMove);
        return () => {
            document.removeEventListener('mousemove', debouncedOnMouseMove);
        };
    }, [editor, toggleVisibility]);

    const handleActionToolbarClose = () => {
        setToolbarItemType(null);
    };

    const isSnippetToolbar = toolbarItemTypes.snippet === toolbarItemType;
    const isLinkToolbar = toolbarItemTypes.link === toolbarItemType;
    const isTextToolbar = toolbarItemTypes.text === toolbarItemType;

    return (
        <FloatingToolbar
            anchorElem={anchorElem}
            // toolbar opacity is 0 by default
            // shouldn't display until selection via mouse is complete to avoid toolbar re-positioning while dragging
            controlOpacity={!isTextToolbar}
            editor={editor}
            isVisible={!!toolbarItemType}
            shouldReposition={toolbarItemType !== toolbarItemTypes.text} // format toolbar shouldn't reposition when applying formats
            toolbarRef={toolbarRef}
            onReposition={updateArrowStyles}
        >
            {isSnippetToolbar && (
                <SnippetActionToolbar
                    arrowStyles={arrowStyles}
                    onClose={handleActionToolbarClose}
                />
            )}

            {isLinkToolbar && (
                <LinkActionToolbar
                    arrowStyles={arrowStyles}
                    href={href}
                    onClose={handleActionToolbarClose}
                />
            )}
            {isTextToolbar && (
                <FormatToolbar
                    arrowStyles={arrowStyles}
                    editor={editor}
                    hiddenFormats={hiddenFormats}
                    isLinkSelected={!!href}
                    isSnippetsEnabled={isSnippetsEnabled}
                    onLinkClick={() => setToolbarItemType(toolbarItemTypes.link)}
                    onSnippetClick={() => setToolbarItemType(toolbarItemTypes.snippet)}
                />
            )}
        </FloatingToolbar>
    );
}

function getArrowPositionStyles({ref, selectionRangeRect}) {
    const ARROW_WIDTH = 8;

    if (!ref.current || !selectionRangeRect) {
        return {};
    }
    const selectionLeft = selectionRangeRect.left;
    const toolbarRect = ref.current.getClientRects()[0];
    const toolbarLeft = toolbarRect.left;
    const arrowLeftPosition = (selectionLeft - toolbarLeft) + selectionRangeRect?.width / 2 - ARROW_WIDTH;
    const max = toolbarRect.width - (ARROW_WIDTH * 3);
    const min = ARROW_WIDTH / 2;

    if (arrowLeftPosition > max) {
        return {left: `${max}px`};
    }

    if (arrowLeftPosition < min) {
        return {left: `${min}px`};
    }

    return ({left: `${Math.round(arrowLeftPosition)}px`});
}
