import Portal from '../../components/ui/Portal';
import React from 'react';
import {$getSelection} from 'lexical';
import {$getSelectionRangeRect} from '../../utils/$getSelectionRangeRect';
import {getScrollParent} from '../../utils/getScrollParent';
import {setFloatingElemPosition} from '../../utils/setFloatingElemPosition';

export default function FloatingToolbar({
    anchorElem,
    children,
    editor,
    isVisible,
    toolbarRef,
    targetElem,
    onReposition,
    shouldReposition = true,
    controlOpacity
}) {
    const updateToolbarPosition = React.useCallback((reposition = true) => {
        editor.update(() => {
            const toolbarElement = toolbarRef?.current;
            if (!toolbarElement) {
                return;
            }

            // don't reposition toolbar if visible and reposition disabled
            if (toolbarElement.style.opacity === '1' && !reposition) {
                return;
            }

            let rangeRect;

            if (targetElem) {
                rangeRect = targetElem.getClientRects()[0];
            }

            if (!rangeRect) {
                const selection = $getSelection();
                rangeRect = $getSelectionRangeRect({editor, selection});
            }
            setFloatingElemPosition(rangeRect, toolbarElement, anchorElem, {controlOpacity});
        });
    }, [anchorElem, controlOpacity, editor, targetElem, toolbarRef]);

    React.useEffect(() => {
        if (isVisible) {
            updateToolbarPosition(shouldReposition);

            if (shouldReposition) {
                onReposition?.();
            }
        }
    }, [isVisible, onReposition, shouldReposition, updateToolbarPosition]);

    React.useEffect(() => {
        const scrollElement = getScrollParent(anchorElem);

        window.addEventListener('resize', updateToolbarPosition);
        if (scrollElement) {
            scrollElement.addEventListener('scroll', updateToolbarPosition);
        }

        return () => {
            window.removeEventListener('resize', updateToolbarPosition);
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', updateToolbarPosition);
            }
        };
    }, [anchorElem, updateToolbarPosition]);

    if (!isVisible) {
        return null;
    }

    return (
        <Portal>
            <div ref={toolbarRef} className="not-kg-prose fixed z-[10000]" style={{opacity: 0}} data-kg-floating-toolbar>
                {children}
            </div>
        </Portal>
    );
}
