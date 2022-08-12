import React, {useEffect} from 'react';
import CardMenuContent from './CardMenuContent';

const Y_OFFSET = 16;

const SlashMenu = ({closeMenu, containerId, koenigEditor, ...props}) => {
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
        <div className="absolute top-[-10px] left-[-16px] z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 pt-0 text-sm shadow-xl" role="menu">
            <CardMenuContent itemWasClicked={closeMenu} allowsKeyboardNav={true} koenigEditor={koenigEditor} {...props} />
        </div>
    );
};

const SlashMenuContainer = ({selectedRange, koenigEditor}) => {
    const containerEl = React.useRef(null);
    const cachedRange = React.useRef(null);
    const lastSelectedRange = React.useRef(null);

    const [isShowingMenu, setIsShowingMenu] = React.useState(false);
    const [query, setQuery] = React.useState('');

    // hack to get around not being able to read props/state inside a useEffect callback
    // without this we could end up registering/unregistering key commands on every keystroke
    const selectedRangeRef = React.useRef(null);
    selectedRangeRef.current = selectedRange;

    const closeMenu = React.useCallback(() => {
        setIsShowingMenu(false);
        setQuery('');
        cachedRange.current = null;
    }, []);

    // on first render, register the / text command and trigger handler
    React.useEffect(() => {
        const showMenu = () => {
            const range = selectedRangeRef.current;
            const {head: {section}} = range;

            // only show the menu if the slash is on an otherwise empty paragraph
            if (range.isCollapsed && section && !section.isListItem && section.text === '/') {
                setIsShowingMenu((prevValue) => {
                    if (prevValue === false) {
                        setQuery('');
                        cachedRange.current = selectedRangeRef.current;
                        return true;
                    }
                });
            }
        };

        koenigEditor.mobiledocEditor.onTextInput({
            name: 'slash_menu',
            text: '/',
            run: showMenu
        });

        return () => {
            koenigEditor.mobiledocEditor.unregisterKeyCommands('slash_menu');
        };
    }, [koenigEditor]);

    let containerStyle = {};

    // handle selection changes
    if (selectedRange !== lastSelectedRange.current) {
        // close menu if open when selection changes
        if (isShowingMenu && selectedRange) {
            const {head: {section}} = selectedRange;

            // close the menu if we're on a non-slash section (eg, when / is deleted)
            if (section && (section.text || section.text === '') && section.text.indexOf('/') !== 0) {
                closeMenu();
            }

            // update the query when the menu is open and cursor is in our open range
            if (section === cachedRange.current?.head.section) {
                setQuery(section.text.substring(
                    cachedRange.current.head.offset,
                    selectedRange.head.offset
                ));
            }
        }
    }

    // calculate position on every render
    if (cachedRange.current || selectedRange) {
        const {head: {section}} = cachedRange.current || selectedRange;

        if (section && section.renderNode.element) {
            const containerRect = containerEl.current.parentNode.getBoundingClientRect();
            const selectedElement = section.renderNode.element;
            const selectedElementRect = selectedElement.getBoundingClientRect();
            const top = selectedElementRect.top + selectedElementRect.height - containerRect.top + Y_OFFSET;

            containerStyle.top = `${top}px`;
        }
    }

    // keep lastSelectedRange up to date so we can track changes
    lastSelectedRange.current = selectedRange;

    return (
        <div id="koenig-slash-menu" className="absolute" style={containerStyle} ref={containerEl}>
            {isShowingMenu && <SlashMenu closeMenu={closeMenu} containerId={containerEl.current.id} query={query} replacementRange={cachedRange.current} koenigEditor={koenigEditor} /> }
        </div>
    );
};

export default SlashMenuContainer;
