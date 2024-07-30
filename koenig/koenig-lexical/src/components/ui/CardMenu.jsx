import ExternalLinkIcon from '../../assets/icons/kg-help.svg?react';
import React from 'react';
import TrashCardIcon from '../../assets/icons/kg-trash.svg?react';
import trackEvent from '../../utils/analytics';

export const CardMenuSection = ({label, children, ...props}) => {
    let helpLink = '';
    if (label === 'Primary') {
        helpLink = 'https://ghost.org/help/cards/';
    } else if (label === 'Snippets') {
        helpLink = 'https://ghost.org/help/snippets/';
    }

    return (
        <li className="flex shrink-0 flex-col justify-center border-t border-grey-200 text-[1.1rem] font-semibold tracking-wide text-grey-600 first-of-type:border-t-0 dark:border-grey-900 dark:text-grey-600" role="separator" {...props}>
            <span
                className="flex items-center justify-between px-4 pb-2 pt-3 uppercase"
                data-card-menu-section="label"
                style={{minWidth: 'calc(100% - 3.2rem)'}}
            >{label}
                {helpLink && <a href={helpLink} rel="noreferrer" target='_blank'>
                    <ExternalLinkIcon className="-m-1 size-6 cursor-pointer p-1 transition-all hover:text-green-600" />
                </a>}
            </span>
            <ul className="md:grid md:gap-y-[.2rem] md:px-2" role="menu">
                {children}
            </ul>
        </li>
    );
};

export const CardMenuItem = ({label, shortcut, desc, isSelected, scrollToItem, onClick, Icon, ...props}) => {
    const buttonRef = React.useRef(null);

    React.useEffect(() => {
        if (scrollToItem) {
            buttonRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
        }
    }, [scrollToItem]);

    // browsers will move focus on mouseDown but we don't want that because it
    // removes focus from the editor meaning key commands don't work as
    // expected after a card is inserted
    const preventMouseDown = (event) => {
        event.preventDefault();
    };

    return (
        <li className="mb-0" role="presentation">
            <button
                ref={buttonRef}
                className={`group flex w-full cursor-pointer flex-row items-center gap-3 border border-transparent px-2 py-[.6rem] text-left text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900 md:rounded-md  ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
                data-kg-card-menu-item={label}
                data-kg-cardmenu-selected={isSelected}
                role="menuitem"
                type="button"
                onClick={onClick}
                onMouseDown={preventMouseDown}
                {...props}
            >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-grey-900 dark:bg-transparent dark:text-grey-500">
                    <Icon className="size-[1.8rem]" />
                </div>
                <div className="flex w-full justify-between">
                    <div className="m-0 truncate text-[1.35rem] font-medium leading-snug tracking-[.02rem] text-grey-900 dark:text-grey-200">{label}</div>
                    <div className="invisible m-0 truncate text-[1.35rem] font-medium leading-snug tracking-[.02rem] text-grey-500 group-hover:visible dark:text-grey-200">{shortcut}</div>
                </div>
            </button>
        </li>
    );
};

export const CardSnippetItem = ({label, isSelected, scrollToItem, Icon, onRemove, closeMenu, ...props}) => {
    const itemRef = React.useRef(null);

    React.useEffect(() => {
        if (scrollToItem) {
            itemRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
        }
    }, [scrollToItem]);

    const handleSnippetRemove = (event) => {
        event.stopPropagation(); // prevent snippet insertion
        onRemove();
        closeMenu();
    };

    const handleMouseDown = (event) => {
        // prevent menu closing before snippet insertion
        event.stopPropagation();
        event.preventDefault();
    };

    return (
        <li className="mb-0 md:col-span-2" role="presentation">
            <div
                ref={itemRef}
                className={`kg-cardmenu-card-hover group flex w-full cursor-pointer flex-row items-center rounded-md border border-transparent px-2 py-1 text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900 ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
                data-kg-cardmenu-selected={isSelected}
                role="menuitem"
                onMouseDown={handleMouseDown}
                {...props}
            >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-grey-900 dark:bg-transparent dark:text-grey-500">
                    <Icon className="size-[1.8rem] stroke-2" />
                </div>
                <div className="m-0 ml-4 truncate text-[1.35rem] font-medium leading-snug tracking-[.02rem] text-grey-900 dark:text-grey-200">{label}</div>
                {
                    !!onRemove && (
                        <button className="ml-auto cursor-pointer rounded-md p-[4px] hover:bg-grey-200 group-hover:block dark:hover:bg-grey-950" title="Remove snippet" type="button" onClick={handleSnippetRemove}>
                            <TrashCardIcon className="size-[1.8rem] stroke-red stroke-[1.5] text-red" />
                        </button>
                    )
                }
            </div>
        </li>
    );
};

export const CardMenu = ({menu = new Map(), insert = () => {}, selectedItemIndex, scrollToSelectedItem, closeMenu}) => {
    // build up the children arrays from the passed in menu Map
    const CardMenuSections = [];

    let itemIndex = 0;
    for (const [sectionLabel, items] of menu) {
        const CardMenuItems = [];

        items.forEach((item) => { // eslint-disable-line no-loop-func
            const isSelected = itemIndex === selectedItemIndex;
            const onClick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                insert?.(item.insertCommand, {insertParams: item.insertParams, queryParams: item.queryParams});
                const cardIdentifier = item.type === 'snippet' ? 'Snippet' : item.label;
                trackEvent('Card Added', {card: cardIdentifier});
            };

            if (!item.type || item.type === 'card') {
                CardMenuItems.push(
                    <CardMenuItem
                        key={itemIndex}
                        data-kg-cardmenu-idx={itemIndex}
                        desc={item.desc}
                        Icon={item.Icon}
                        isSelected={isSelected}
                        label={item.label}
                        scrollToItem={isSelected && scrollToSelectedItem}
                        shortcut={item.shortcut}
                        onClick={onClick}
                    />
                );
            } else if (item.type === 'snippet') {
                CardMenuItems.push(
                    <CardSnippetItem
                        key={itemIndex}
                        closeMenu={closeMenu}
                        data-kg-cardmenu-idx={itemIndex}
                        Icon={item.Icon}
                        isSelected={isSelected}
                        label={item.label}
                        scrollToItem={isSelected && scrollToSelectedItem}
                        onClick={onClick}
                        onRemove={item.onRemove}
                    />
                );
            }

            itemIndex = itemIndex + 1;
        });

        CardMenuSections.push(<CardMenuSection key={sectionLabel} label={sectionLabel}>{CardMenuItems}</CardMenuSection>);
    }

    return (
        <ul className="not-kg-prose z-[9999999] m-0 mb-3 max-h-[420px] w-[312px] scroll-p-2 flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 font-sans text-sm shadow-md after:block after:pb-1 dark:bg-grey-950 md:w-[348px]" role="menu">
            {CardMenuSections}
        </ul>
    );
};
