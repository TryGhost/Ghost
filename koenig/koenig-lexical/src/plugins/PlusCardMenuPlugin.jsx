import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isParagraphNode, $isRangeSelection} from 'lexical';
import {getSelectedNode} from '../utils/getSelectedNode';
import {PlusButton, PlusMenu} from '../components/PlusMenu';
import {buildCardMenu} from '../utils/buildCardMenu';

function usePlusCardMenu(editor) {
    const [isShowingButton, setIsShowingButton] = React.useState(false);
    const [isShowingMenu, setIsShowingMenu] = React.useState(false);
    const [topPosition, setTopPosition] = React.useState(0);
    const [cachedRange, setCachedRange] = React.useState(null);
    const [cardMenu] = React.useState(buildCardMenu(editor));
    const containerRef = React.useRef(null);

    function getTopPosition(elem) {
        const elemRect = elem.getBoundingClientRect();
        const containerRect = elem.parentNode.getBoundingClientRect();

        return elemRect.top - containerRect.top;
    }

    function getElementRange(elem) {
        const range = new Range();
        range.setStart(elem, 0);
        range.setEnd(elem, 0);
        return range;
    }

    const moveCursorToCachedRange = React.useCallback(() => {
        if (!cachedRange) {
            return;
        }
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(cachedRange);
    }, [cachedRange]);

    const showButton = React.useCallback((elem) => {
        const range = getElementRange(elem);
        setCachedRange(range);
        setIsShowingButton(true);
    }, [setIsShowingButton, setCachedRange]);

    const hideButton = React.useCallback(() => {
        setIsShowingButton(false);
        setIsShowingMenu(false);
        setCachedRange(null);
    }, [setIsShowingButton, setIsShowingMenu, setCachedRange]);

    const openMenu = React.useCallback((event) => {
        event?.preventDefault();
        moveCursorToCachedRange();
        setIsShowingMenu(true);
    }, [moveCursorToCachedRange, setIsShowingMenu]);

    const closeMenu = React.useCallback(({resetCursor = false} = {}) => {
        if (resetCursor) {
            moveCursorToCachedRange();
        }
        setIsShowingMenu(false);
    }, [moveCursorToCachedRange, setIsShowingMenu]);

    const updateButton = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // don't do anything when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();

            if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                hideButton();
                return;
            }

            const node = getSelectedNode(selection);

            if (!$isParagraphNode(node) || node.getTextContent() !== '') {
                hideButton();
                return;
            }

            const nativeSelection = window.getSelection();
            const p = nativeSelection.anchorNode;
            const rootElement = editor.getRootElement();

            if (p?.tagName !== 'P' || !rootElement.contains(p)) {
                hideButton();
                return;
            }

            setTopPosition(getTopPosition(p));
            showButton(p);
        });
    }, [editor, showButton, hideButton]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateButton();
        }, [editor, updateButton]);
    });

    // hide the button as soon as there's any selection made outside of the
    // editor canvas - any click outside makes a selection so no need for
    // additional mouse tracking for this
    const hideButtonOnOutsideSelection = React.useCallback(() => {
        if (isShowingButton) {
            const nativeSelection = window.getSelection();

            // clicking inside the menu changes native selection, we don't want
            // to close the menu when that occurs
            if (isShowingMenu && containerRef.current?.contains(nativeSelection.anchorNode)) {
                return;
            }

            const rootElement = editor.getRootElement();

            if (!rootElement.contains(nativeSelection.anchorNode)) {
                hideButton();
            }
        }
    }, [editor, isShowingButton, isShowingMenu, hideButton]);

    React.useEffect(() => {
        document.addEventListener('selectionchange', hideButtonOnOutsideSelection);
        return () => {
            document.removeEventListener('selectionchange', hideButtonOnOutsideSelection);
        };
    }, [hideButtonOnOutsideSelection]);

    // show or move the button when the mouse moves over a blank paragraph
    const updateButtonOnMousemove = React.useCallback((event) => {
        // once the menu is open moving the mouse should not have any effect on button/menu positioning
        if (isShowingMenu) {
            return;
        }

        const rootElement = editor.getRootElement();
        let {pageX, pageY} = event;

        // add a horizontal buffer to the pointer position so that the button
        // doesn't disappear when moving across the gap between button and paragraph
        let containerRect = rootElement.getBoundingClientRect();
        if (pageX < containerRect.left) {
            pageX = pageX + 40;
        }

        // use the page coordinates to find the element under the pointer

        // TODO: this basic implementation isn't quite as forgiving as the mobiledoc implementation
        //   which appears to have a threshold around the point which creates a bigger hit area for
        //   nearby elements, whereas this removes the button immediately on margin mouseover. See:
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/editor/editor.ts#L1306
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/cursor/position.ts#L115
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/selection-utils.ts#L39-L90
        const hoveredElem = document.elementFromPoint(pageX, pageY);

        if (rootElement.contains(hoveredElem)) {
            if (hoveredElem?.tagName === 'P' && hoveredElem.textContent === '') {
                // place cursor next to the hovered paragraph
                setTopPosition(getTopPosition(hoveredElem));
                showButton(hoveredElem);
            } else {
                // reset button based on cursor position
                updateButton();
            }
        }
    }, [editor, isShowingMenu, setTopPosition, showButton, updateButton]);

    React.useEffect(() => {
        window.addEventListener('mousemove', updateButtonOnMousemove);
        return () => {
            window.removeEventListener('mousemove', updateButtonOnMousemove);
        };
    }, [updateButtonOnMousemove]);

    // when menu is open, watch the window for mousedown events so that we can
    // close it when we detect a click outside
    const closeMenuOnClickOutside = React.useCallback((event) => {
        if (isShowingMenu) {
            if (!containerRef.current?.contains(event.target)) {
                return closeMenu();
            }
        }
    }, [isShowingMenu, closeMenu]);

    React.useEffect(() => {
        window.addEventListener('mousedown', closeMenuOnClickOutside);
        return () => {
            window.removeEventListener('mousedown', closeMenuOnClickOutside);
        };
    }, [closeMenuOnClickOutside]);

    // when menu is open, close it when Escape or arrow keys are pressed
    const handleKeydown = React.useCallback((event) => {
        if (isShowingMenu) {
            if (event.key === 'Escape') {
                closeMenu({resetCursor: true});
                return;
            }

            let arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                closeMenu();
            }
        }
    }, [isShowingMenu, closeMenu]);

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    const style = {
        top: `${topPosition}px`
    };

    return (
        <div className="absolute" style={style} ref={containerRef} data-kg-plus-container>
            {isShowingButton && <PlusButton onClick={openMenu} />}
            {isShowingMenu && <PlusMenu>{cardMenu}</PlusMenu>}
        </div>
    );
}

export default function PlusCardMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    return usePlusCardMenu(editor);
}
