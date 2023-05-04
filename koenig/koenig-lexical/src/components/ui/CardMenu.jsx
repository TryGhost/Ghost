import React from 'react';
import {ReactComponent as TrashCardIcon} from '../../assets/icons/kg-trash-outline.svg';

export const CardMenuSection = ({label, children, ...props}) => {
    return (
        <li className="flex shrink-0 flex-col justify-center text-[1.1rem] font-semibold tracking-wide text-grey dark:text-grey-800" role="separator" {...props}>
            <span
                className="mb-2 block px-4 pt-3 uppercase"
                data-card-menu-section="label"
                style={{minWidth: 'calc(100% - 3.2rem)'}}
            >{label}</span>
            <ul role="menu">
                {children}
            </ul>
        </li>
    );
};

export const CardMenuItem = ({label, desc, isSelected, onClick, Icon, ...props}) => {
    // browsers will move focus on mouseDown but we don't want that because it
    // removes focus from the editor meaning key commands don't work as
    // expected after a card is inserted
    const preventMouseDown = (event) => {
        event.preventDefault();
    };

    return (
        <li className="mb-0" role="presentation">
            <button
                className={`flex w-full cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-left text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900  ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
                data-kg-card-menu-item={label}
                data-kg-cardmenu-selected={isSelected} role="menuitem" type="button" onClick={onClick}
                onMouseDown={preventMouseDown}
                {...props}
            >
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-medium leading-[1.6rem] tracking-[.02rem] text-grey-900 dark:text-grey-200">{label}</div>
                    <div className="m-0 ml-4 truncate text-xs font-normal leading-[1.6rem] tracking-[.02rem] text-grey dark:text-grey-700">{desc}</div>
                </div>
            </button>
        </li>
    );
};

export const CardSnippetItem = ({label, isSelected, Icon, onRemove, closeMenu, ...props}) => {
    const handleSnippetRemove = (event) => {
        event.stopPropagation(); // prevent snippet insertion
        onRemove();
        closeMenu();
    };

    return (
        <li className="mb-0" role="presentation">
            <div
                className={`kg-cardmenu-card-hover group flex w-full cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900 ${isSelected ? 'bg-grey-100 dark:hover:bg-grey-900' : ''}`}
                data-kg-cardmenu-selected={isSelected}
                role="menuitem"
                {...props}
            >
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="m-0 ml-4 truncate text-[1.3rem] font-normal leading-[1.6rem] text-grey-900 dark:text-grey-200">{label}</div>
                {
                    !!onRemove && (
                        <button className="ml-auto cursor-pointer rounded p-[4px] hover:bg-grey-200 group-hover:block dark:hover:bg-grey-950" title="Remove snippet" type="button" onClick={handleSnippetRemove}>
                            <TrashCardIcon className="h-4 w-4 stroke-red text-red" />
                        </button>
                    )
                }
            </div>
        </li>
    );
};

export const CardMenu = ({menu = new Map(), insert = () => {}, selectedItemIndex, closeMenu}) => {
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
        <ul className="not-kg-prose z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-md bg-white bg-clip-padding p-0 font-sans text-sm shadow-md after:block after:pb-4 dark:bg-grey-950" role="menu">
            {CardMenuSections}
        </ul>
    );
};
