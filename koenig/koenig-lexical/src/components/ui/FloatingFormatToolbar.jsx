import FloatingToolbar from '../../components/ui/FloatingToolbar';
import FormatToolbar from './FormatToolbar';
import React from 'react';
import {LinkActionToolbar} from './LinkActionToolbar.jsx';
import {SnippetActionToolbar} from './SnippetActionToolbar';

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
    selectionRangeRect
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
        if (toolbarItemType && toolbarRef.current.style.opacity === '0') {
            toolbarRef.current.style.opacity = '1';
            updateArrowStyles();
        }
    }, [toolbarItemType, updateArrowStyles]);

    React.useEffect(() => {
        document.addEventListener('mouseup', toggleVisibility);
        return () => {
            document.removeEventListener('mouseup', toggleVisibility);
        };
    }, [toggleVisibility]);

    React.useEffect(() => {
        const shiftUp = (e) => {
            if (e.key === 'Shift') {
                toggleVisibility();
            }
        };
        document.addEventListener('keyup', shiftUp);
        return () => {
            document.removeEventListener('keyup', shiftUp);
        };
    }, [toggleVisibility]);

    const handleActionToolbarClose = () => {
        setToolbarItemType(null);
    };

    const handleLinkUpdate = () => {
        setToolbarItemType(toolbarItemTypes.text);
        toggleVisibility();
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
                    onUpdate={handleLinkUpdate}
                />
            )}
            {isTextToolbar && (
                <FormatToolbar
                    arrowStyles={arrowStyles}
                    editor={editor}
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
