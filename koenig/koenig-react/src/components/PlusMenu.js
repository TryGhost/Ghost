import React from 'react';
import {v4 as uuidv4} from 'uuid';
import koenigEditorContext from '../contexts/koenig-editor-context';
import CardMenuContent from './CardMenuContent';
import PlusIcon from '../icons/plus.svg';
import rangeIsABlankParagraph from '../utils/range-is-blank-paragraph';
import getTopPositionOfRange from '../utils/get-top-position-of-range';

const PlusButton = ({onClick}) => {
    return (
        <button
            type="button"
            aria-label="Add a card"
            className="group relative mt-[-2px] ml-[-66px] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-grey bg-white transition-all ease-linear hover:border-grey-900 md:h-9 md:w-9"
            onClick={onClick}
        ><PlusIcon className="h-4 w-4 stroke-grey-800 stroke-2 group-hover:stroke-grey-900" /></button>
    );
};

const PlusMenu = ({containerId, closeMenu, ...props}) => {
    // close menu on clicks outside or Escape
    React.useEffect(() => {
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

    return (
        <div className="absolute top-[-10px] left-[-16px] z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 pt-0 text-sm shadow" role="menu">
            <CardMenuContent {...props} />
        </div>
    );
};

const menuStateReducer = (state, action) => {
    switch (action.type) {
    case 'selected_range_changed': {
        const {selectedRange} = action;
        let {isShowingMenu, cachedRange, buttonPositionedByCursor} = state;

        // override cached range
        if (!isShowingMenu && rangeIsABlankParagraph(selectedRange)) {
            cachedRange = selectedRange;
            buttonPositionedByCursor = true;
        }

        // close the menu if selectedRange changes
        if (isShowingMenu && !state.ignoreSelectedRangeChange && selectedRange && !selectedRange.isBlank) {
            isShowingMenu = false;
            cachedRange = null;
            buttonPositionedByCursor = false;
        }

        return {
            ...state,
            selectedRange,
            isShowingMenu,
            cachedRange,
            buttonPositionedByCursor,
            ignoreSelectedRangeChange: false,
            resetCursorPositionOnNextRender: null
        };
    }
    case 'pointer_range_changed': {
        const {pointerRange} = action;

        if (rangeIsABlankParagraph(pointerRange)) {
            return {...state, cachedRange: pointerRange};
        } else {
            // hide button unless we have a valid range where the cursor is sitting
            if (state.buttonPositionedByCursor !== true) {
                return {...state, cachedRange: null};
            }
        }

        return state;
    }
    case 'open_menu': {
        // move the cursor to the blank paragraph, ensures any selected card
        // gets inserted in the correct place because editorRange will be
        // wherever the cursor currently is if the menu was opened via a
        // mouseover button

        return {
            ...state,
            isShowingMenu: true,
            ignoreSelectedRangeChange: true,
            resetCursorPositionOnNextRender: state.cachedRange
        };
    }
    case 'close_menu': {
        let {ignoreSelectedRangeChange} = state;

        let resetCursorPositionOnNextRender = state.cachedRange;

        if (action.resetCursorPosition) {
            ignoreSelectedRangeChange = true;
            resetCursorPositionOnNextRender = state.cachedRange;
        }

        const isShowingMenu = false;
        const cachedRange = null;

        return {...state, isShowingMenu, cachedRange, ignoreSelectedRangeChange, resetCursorPositionOnNextRender};
    }
    default:
        return state;
    }
};

const PlusMenuContainer = ({selectedRange}) => {
    const koenigEditor = React.useContext(koenigEditorContext);

    const [state, dispatch] = React.useReducer(menuStateReducer, {
        selectedRange,
        isShowingMenu: false,
        cachedRange: null, // primary range used for positioning/display, can be set to selected range or pointer range
        buttonPositionedByCursor: false, // used to indicate cachedRange was set by cursor (selected range) rather than mouse movement
        ignoreSelectedRangeChange: false, // used to avoid infinite loop due to selectedRange changing when closing menu
        resetCursorPositionOnNextRender: null // used to push cursor positioning into a useEffect to avoid state-update-during-render errors
    });

    const containerId = React.useRef(`kg-plus-${uuidv4()}`);
    const containerEl = React.useRef();

    const closeMenu = React.useCallback(({resetCursorPosition = false} = {}) => {
        dispatch({type: 'close_menu', resetCursorPosition});
    }, []);

    // override cached range when mouse moves
    React.useEffect(() => {
        const handleMousemove = (event) => {
            if (state.isShowingMenu) {
                return;
            }

            const editor = koenigEditor.mobiledocEditor;
            let {pageX, pageY} = event;

            // add a horizontal buffer to the pointer position so that the
            // (+) button doesn't disappear when the mouse hovers over it due
            // to it being outside of the editor canvas
            const containerRect = containerEl.current.parentNode.getBoundingClientRect();
            if (pageX < containerRect.left) {
                pageX = pageX + 40;
            }

            // grab a range from the editor position under the pointer
            try {
                const position = editor.positionAtPoint(pageX, pageY);
                if (position) {
                    const pointerRange = position.toRange();
                    dispatch({type: 'pointer_range_changed', pointerRange});
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
    }, [state.isShowingMenu, koenigEditor]);

    // adjust the cursor position as required after any state updates
    React.useEffect(() => {
        if (state.resetCursorPositionOnNextRender) {
            koenigEditor.mobiledocEditor.selectRange(state.resetCursorPositionOnNextRender);
        }
    }, [koenigEditor, state.resetCursorPositionOnNextRender]);

    // update state when selected range in mobiledoc is changed
    React.useEffect(() => {
        dispatch({type: 'selected_range_changed', selectedRange});
    }, [selectedRange]);

    // calculate show/hide of button on each render
    const isShowingButton = rangeIsABlankParagraph(state.cachedRange);
    const top = isShowingButton ? getTopPositionOfRange(state.cachedRange, containerEl.current) : null;
    const style = top !== null ? {top: `${top}px`} : {};

    // Event handlers ----------------------------------------------------------

    const handleButtonClick = (event) => {
        event.preventDefault();
        state.isShowingMenu ? closeMenu() : dispatch({type: 'open_menu'});
    };

    const handleItemClick = () => {
        dispatch({type: 'close_menu'});
    };

    return (
        <div id={containerId.current} data-kg="plus-menu" className="absolute" style={style} ref={containerEl}>
            {isShowingButton && <PlusButton onClick={handleButtonClick} />}
            {state.isShowingMenu && <PlusMenu containerId={containerId.current} closeMenu={closeMenu} replacementRange={state.cachedRange} itemWasClicked={handleItemClick} />}
        </div>
    );
};

export default PlusMenuContainer;
