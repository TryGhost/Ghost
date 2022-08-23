import React, {useEffect} from 'react';
import koenigEditorContext from '../contexts/koenig-editor-context';
import CardMenuContent from './CardMenuContent';

const Y_OFFSET = 16;

const SlashMenu = ({closeMenu, containerId, ...props}) => {
    const koenigEditor = React.useContext(koenigEditorContext);

    // watch the window for mousedown events so that we can close the
    // menu when we detect a click outside. This is preferable to
    // watching the range because the range will change and remove the
    // menu before click events on the buttons are registered
    useEffect(() => {
        const handleWindowMousedown = (event) => {
            // clicks outside the menu should always close
            if (!event.target.closest(`#${containerId}, .fullscreen-modal-container`)) {
                closeMenu();

            // clicks on the menu but not on a button should be ignored so that the
            // cursor position isn't lost
            } else if (!event.target.closest('[data-kg="cardmenu-card"]')) {
                event.preventDefault();
            }
        };
        window.addEventListener('mousedown', handleWindowMousedown);

        koenigEditor.mobiledocEditor.registerKeyCommand({
            str: 'ESC',
            name: 'slash_menu_open',
            run: closeMenu
        });

        return () => {
            window.removeEventListener('mousedown', handleWindowMousedown);
            koenigEditor.mobiledocEditor.unregisterKeyCommands('slash_menu_open');
        };
    }, [koenigEditor, containerId, closeMenu]);

    return (
        <div className="absolute top-[-10px] left-[-16px] z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 pt-0 text-sm shadow" role="menu">
            <CardMenuContent itemWasClicked={closeMenu} allowsKeyboardNav={true} {...props} />
        </div>
    );
};

const menuStateReducer = (state, action) => {
    switch (action.type) {
    case 'update_selected_range': {
        const {selectedRange} = action;
        let {isShowingMenu, query, cachedRange} = state;

        if (isShowingMenu && selectedRange) {
            const {head: {section}} = selectedRange;

            // close the menu if we're on a non-slash section (eg, when / is deleted)
            if (section && (section.text || section.text === '') && section.text.indexOf('/') !== 0) {
                isShowingMenu = false;
                query = '';
            }

            // update the query when the menu is open and cursor is in our open range
            if (section === state.cachedRange?.head.section) {
                query = section.text.substring(
                    cachedRange.head.offset,
                    selectedRange.head.offset
                );
            }
        }

        return {...state, isShowingMenu, query, selectedRange};
    }
    case 'open_menu': {
        if (state.isShowingMenu) {
            return state;
        }

        const range = state.selectedRange;
        const {head: {section}} = range;

        // only open the menu if the slash is on an otherwise empty paragraph
        if (range.isCollapsed && section && !section.isListItem && section.text === '/') {
            const isShowingMenu = true;
            const query = '';
            const cachedRange = state.selectedRange;

            return {...state, isShowingMenu, query, cachedRange};
        }

        return state;
    }
    case 'close_menu': {
        const isShowingMenu = false;
        const query = '';
        return {...state, isShowingMenu, query};
    }
    default:
        return state;
    }
};

const SlashMenuContainer = ({selectedRange}) => {
    const [state, dispatch] = React.useReducer(menuStateReducer, {
        isShowingMenu: false,
        query: '',
        cachedRange: null
    });

    const koenigEditor = React.useContext(koenigEditorContext);
    const containerEl = React.useRef(null);

    // making closeMenu a callback avoids child components re-registering event
    // handlers on every render-causing key press
    const closeMenu = React.useCallback(() => {
        return dispatch({type: 'close_menu'});
    }, [dispatch]);

    // keep state updated with selected range, closing menu if needed
    React.useEffect(() => {
        dispatch({type: 'update_selected_range', selectedRange});
    }, [selectedRange]);

    // on first render, register the / text command and trigger handler
    React.useEffect(() => {
        koenigEditor.mobiledocEditor.onTextInput({
            name: 'slash_menu',
            text: '/',
            run: () => {
                dispatch({type: 'open_menu'});
            }
        });

        return () => {
            koenigEditor.mobiledocEditor.unregisterKeyCommands('slash_menu');
        };
    }, [koenigEditor]);

    let containerStyle = {};

    // calculate position on every render
    if (state.cachedRange || selectedRange) {
        const {head: {section}} = state.cachedRange || selectedRange;

        if (section && section.renderNode.element) {
            const containerRect = containerEl.current.parentNode.getBoundingClientRect();
            const selectedElement = section.renderNode.element;
            const selectedElementRect = selectedElement.getBoundingClientRect();
            const top = selectedElementRect.top + selectedElementRect.height - containerRect.top + Y_OFFSET;

            containerStyle.top = `${top}px`;
        }
    }

    return (
        <div id="koenig-slash-menu" className="absolute" style={containerStyle} ref={containerEl}>
            {state.isShowingMenu && <SlashMenu
                closeMenu={closeMenu}
                containerId={containerEl.current.id}
                query={state.query}
                replacementRange={state.cachedRange}
            /> }
        </div>
    );
};

export default SlashMenuContainer;
