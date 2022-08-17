import React from 'react';
import koenigEditorContext from '../contexts/koenig-editor-context';

const createItemMatcher = (query = '') => {
    // match everything before a space to a card. Keeps the relevant
    // card selected when providing attributes to a card, eg:
    // /twitter https://twitter.com/EffinBirds/status/1001765208958881792
    let card = query.split(/\s/)[0].replace(/^\//, '');

    return (item) => {
        // match every item before anything is typed
        if (!query) {
            return true;
        }

        // standard exact matching for items with a matches array
        if (Array.isArray(item.matches)) {
            return card ? item.matches.some(match => match.indexOf(card.toLowerCase()) === 0) : true;
        }

        // custom per-item matching, eg. snippets match any part of their title
        if (typeof item.matches === 'function') {
            return item.matches(query);
        }

        return false;
    };
};

const filterMenu = (fullMenu = [], query = '') => {
    let filteredMenu = fullMenu;

    if (query) {
        const itemMatcher = createItemMatcher(query);
        filteredMenu = fullMenu.map((group) => {
            // show items where there's a match of the beginning of one of the "item.matches" strings
            let matches = group.items.filter(itemMatcher);
            if (matches.length > 0) {
                return Object.assign({}, group, {items: matches});
            }

            return undefined;
        }).filter(i => i !== undefined);
    }

    return filteredMenu;
};

const menuContentReducer = (state, action) => {
    const moveSelection = (direction) => {
        if (state.filteredMenu.length === 0) {
            return;
        }

        const flatItems = [];

        state.filteredMenu.forEach((group) => {
            flatItems.push(...group.items);
        });

        let selectedIndex = flatItems.indexOf(state.selectedItem);

        if (direction === 'up') {
            selectedIndex = selectedIndex - 1;
            if (selectedIndex < 0) {
                selectedIndex = flatItems.length - 1;
            }
        }

        if (direction === 'down') {
            selectedIndex = selectedIndex + 1;
            if (selectedIndex >= flatItems.length) {
                selectedIndex = 0;
            }
        }

        return flatItems[selectedIndex];
    };

    switch (action.type) {
    case 'filter_menu': {
        const filteredMenu = filterMenu(action.fullMenu, action.query);
        const selectedItem = state.allowsKeyboardNav ? filteredMenu[0]?.items[0] : null;
        return {...state, filteredMenu, selectedItem};
    }
    case 'move_selection_down': {
        const selectedItem = moveSelection('down');
        return {...state, selectedItem};
    }
    case 'move_selection_up': {
        const selectedItem = moveSelection('up');
        return {...state, selectedItem};
    }
    default:
        return state;
    }
};

const CardMenuGroup = ({group, selectedItem, ...props}) => {
    return (
        <>
            <div className="mb-2 flex shrink-0 flex-col justify-center px-4 pt-3 text-xs font-medium uppercase tracking-[.06rem] text-grey-midlight" style={{minWidth: 'calc(100% - 3.2rem)'}}>
                {group.title}
            </div>
            <div>
                {group.items.map(item => <CardMenuItem item={item} isSelected={item === selectedItem} key={item.label} {...props} />)}
            </div>
        </>
    );
};

const CardMenuItem = ({item, isSelected, itemWasClicked}) => {
    const {IconComponent = () => <></>} = item;

    const handleClick = (event) => {
        event?.preventDefault();
        itemWasClicked(item);
    };

    return (
        <div
            className={`flex cursor-pointer flex-row items-center border border-transparent px-4 py-2 text-grey-middark hover:bg-grey-white ${isSelected && 'bg-grey-white'}`}
            data-kg="cardmenu-card"
            role="menuitem"
            title={item.label}
            onClick={handleClick}
        >
            <div className={`flex items-center ${item.iconClass}`} aria-hidden="true"><IconComponent className="w7 h7" /></div>
            <div className="flex flex-col">
                <div className="text-grey-darkgrey m-0 ml-4 grow truncate text-[1.3rem] font-normal leading-[1.333em] tracking-[.02rem]">{item.label}</div>
                <div className="m-0 ml-4 grow truncate text-xs font-normal leading-[1.333em] tracking-[.02rem] text-grey-midlight">{item.desc}</div>
            </div>
        </div>
    );
};

const CardMenuContent = ({replacementRange, itemWasClicked, allowsKeyboardNav = false, query, ...props}) => {
    const koenigEditor = React.useContext(koenigEditorContext);
    const [state, dispatch] = React.useReducer(
        menuContentReducer,
        {
            filteredMenu: [...koenigEditor.cardMenu],
            selectedItem: allowsKeyboardNav ? [...koenigEditor.cardMenu][0]?.items[0] : null,
            query,
            allowsKeyboardNav
        }
    );

    const {filteredMenu, selectedItem} = state;

    // set up keyboard event handlers on first render for selection via keyboard
    React.useEffect(() => {
        const editor = koenigEditor.mobiledocEditor;

        if (allowsKeyboardNav) {
            editor.registerKeyCommand({
                str: 'UP',
                name: 'card_menu_nav',
                run: () => {
                    dispatch({type: 'move_selection_up'});
                }
            });

            editor.registerKeyCommand({
                str: 'DOWN',
                name: 'card_menu_nav',
                run: () => {
                    dispatch({type: 'move_selection_down'});
                }
            });
        }

        return (() => {
            editor.unregisterKeyCommands('card_menu_nav');
        });
    }, [allowsKeyboardNav, koenigEditor]);

    // callback for inserting selected item via keyboard or clicked item
    const insertItem = React.useCallback((item = state.selectedItem) => {
        const range = replacementRange || koenigEditor.mobiledocEditor.range;

        if (item.type === 'card') {
            const payload = item.payload ? JSON.parse(JSON.stringify(item.payload)) : {};

            koenigEditor.replaceWithCardSection(item.replaceArg, range, payload);
        }

        itemWasClicked?.();
    }, [state.selectedItem, replacementRange, itemWasClicked, koenigEditor]);

    // set up keyboard event handler for inserting selected card on Enter
    React.useEffect(() => {
        const editor = koenigEditor.mobiledocEditor;

        if (allowsKeyboardNav) {
            editor.registerKeyCommand({
                str: 'ENTER',
                name: 'card_menu_selection',
                run: () => {
                    insertItem();
                }
            });
        }

        return (() => {
            editor.unregisterKeyCommands('card_menu_selection');
        });
    }, [insertItem, allowsKeyboardNav, koenigEditor]);

    // update filtered menu every time query changes
    React.useEffect(() => {
        dispatch({type: 'filter_menu', fullMenu: [...koenigEditor.cardMenu], query});
    }, [koenigEditor, query]);

    const MenuGroups = [];

    filteredMenu.forEach((group) => {
        if (group.items?.length) {
            MenuGroups.push(
                <CardMenuGroup
                    group={group}
                    selectedItem={selectedItem}
                    itemWasClicked={insertItem}
                    key={group.title}
                    {...props}
                />
            );
        }
    });

    return (
        <>{MenuGroups}</>
    );
};

export default CardMenuContent;
