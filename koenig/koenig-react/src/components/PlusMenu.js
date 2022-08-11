import {v4 as uuidv4} from 'uuid';
import React, {useEffect} from 'react';
import PlusIcon from '../icons/plus.svg';
import rangeIsABlankParagraph from '../utils/range-is-blank-paragraph';
import getTopPositionOfRange from '../utils/get-top-position-of-range';

const PlusButton = ({onClick}) => {
    return (
        <button
            type="button"
            aria-label="Add a card"
            className="relative mt-[-2px] ml-[-66px] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border bg-white md:h-9 md:w-9"
            onClick={onClick}
        ><PlusIcon className="h-4 w-4 stroke-grey-midlight stroke-2" /></button>
    );
};

const PlusMenu = ({containerId, closeMenu}) => {
    // close menu on clicks outside or Escape
    useEffect(() => {
        const handleMousedown = (event) => {
            if (!event.target.closest(`#${containerId}`)) {
                closeMenu();
            }
        };

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                closeMenu({resetCursorPosition: true});
                return;
            }

            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                closeMenu();
            }
        };

        window.addEventListener('mousedown', handleMousedown);
        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('mousedown', handleMousedown);
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [containerId, closeMenu]);

    // TODO: render a real card menu
    return (
        <div className="absolute top-[-10px] left-[-16px] z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 pt-0 text-sm shadow-xl" role="menu">
            <div className="h-[500px]">
                <p>Testing menu</p>
            </div>
        </div>
    );
};

const PlusMenuContainer = ({koenigEditor, selectedRange}) => {
    const containerId = React.useRef(`kg-plus-${uuidv4()}`);
    const containerEl = React.useRef();
    const lastSelectedRange = React.useRef(null); // used to trigger selectedRange prop change behavior
    const buttonPositionedByCursor = React.useRef(false); // used to indicate cachedRange was set by cursor (selected range) rather than mouse movement
    const ignoreSelectedRangeChange = React.useRef(false); // used to avoid infinite loop due to selectedRange changing when closing menu

    const [cachedRange, setCachedRange] = React.useState(null); // primary range used for positioning/display, can be set to selected range or pointer range
    const [isShowingMenu, setIsShowingMenu] = React.useState(false);

    const openMenu = () => {
        // move the cursor to the blank paragraph, ensures any selected card
        // gets inserted in the correct place because editorRange will be
        // wherever the cursor currently is if the menu was opened via a
        // mouseover button
        moveCursorToCachedRange();

        setIsShowingMenu(true);
    };

    const closeMenu = ({resetCursorPosition = false} = {}) => {
        if (resetCursorPosition) {
            moveCursorToCachedRange();
        }

        setIsShowingMenu(false);
    };

    const moveCursorToCachedRange = () => {
        ignoreSelectedRangeChange.current = true;
        koenigEditor.mobiledocEditor.selectRange(cachedRange);
    };

    // override cached range when mouse moves
    useEffect(() => {
        const handleMousemove = (event) => {
            if (isShowingMenu) {
                return;
            }

            const editor = koenigEditor.mobiledocEditor;
            let {pageX, pageY} = event;

            // add a horizontal buffer to the pointer position so that the
            // (+) button doesn't disappear when the mouse hovers over it due
            // to it being outside of the editor canvas
            let containerRect = containerEl.current.parentNode.getBoundingClientRect();
            if (pageX < containerRect.left) {
                pageX = pageX + 40;
            }

            // grab a range from the editor position under the pointer
            try {
                let position = editor.positionAtPoint(pageX, pageY);
                if (position) {
                    let pointerRange = position.toRange();
                    if (rangeIsABlankParagraph(pointerRange)) {
                        setCachedRange(pointerRange);
                    } else {
                        // hide button unless we have a valid range where the cursor is sitting
                        if (buttonPositionedByCursor.current !== true) {
                            setCachedRange(null);
                        }
                    }
                }
            } catch (e) {
                // mobiledoc-kit can generate the following harmless error
                // from positionAtPoint(x,y) whilst dragging a selection
                // TypeError: Failed to execute 'compareDocumentPosition' on 'Node': parameter 1 is not of type 'Node'.
                if (e instanceof TypeError === false) {
                    throw e;
                }
            }
        };

        window.addEventListener('mousemove', handleMousemove);

        return () => {
            window.removeEventListener('mousemove', handleMousemove);
        };
    }, [koenigEditor, isShowingMenu]);

    // override cached range when selectedRange prop changes
    if (!isShowingMenu && selectedRange !== lastSelectedRange.current) {
        if (rangeIsABlankParagraph(selectedRange)) {
            setCachedRange(selectedRange);
            buttonPositionedByCursor.current = true;
        } else {
            setCachedRange(null);
            setIsShowingMenu(false);
            buttonPositionedByCursor.current = false;
        }
    }

    // close the menu if selectedRange changes
    if (isShowingMenu && !ignoreSelectedRangeChange.current && selectedRange && !selectedRange.isBlank && !selectedRange.isEqual(lastSelectedRange.current)) {
        closeMenu();
    }

    // calculate show/hide of button on each render
    const isShowingButton = rangeIsABlankParagraph(cachedRange);
    const top = isShowingButton ? getTopPositionOfRange(cachedRange, containerEl.current) : null;
    const style = top !== null ? {top: `${top}px`} : {};

    // ensure we can track when selectedRange changes
    lastSelectedRange.current = selectedRange;
    ignoreSelectedRangeChange.current = false;

    // Event handlers ----------------------------------------------------------

    const handleButtonClick = (event) => {
        event.preventDefault();
        isShowingMenu ? closeMenu() : openMenu();
    };

    return (
        <div id={containerId.current} data-kg="plus-menu" className="absolute" style={style} ref={containerEl}>
            {isShowingButton && <PlusButton onClick={handleButtonClick} />}
            {isShowingMenu && <PlusMenu containerId={containerId.current} closeMenu={closeMenu} />}
        </div>
    );
};

export default PlusMenuContainer;
