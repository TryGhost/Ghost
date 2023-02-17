import React from 'react';

export const CardMenuSection = ({label, children, ...props}) => {
    return (
        <li role="separator" className="flex shrink-0 flex-col justify-center text-[1.1rem] font-semibold uppercase tracking-wide text-grey" {...props}>
            <span className="mb-2 block px-4 pt-3" style={{minWidth: 'calc(100% - 3.2rem)'}}>{label}</span>
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
        <li role="presentation">
            <button
                type="button"
                role="menuitem"
                className={`flex w-full cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-left text-grey-800 hover:bg-grey-100  ${isSelected ? 'bg-grey-100' : ''}`} onMouseDown={preventMouseDown} onClick={onClick} data-kg-card-menu-item={label}
                data-kg-cardmenu-selected={isSelected}
                {...props}
            >
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-medium leading-[1.6rem] tracking-[.02rem] text-grey-900">{label}</div>
                    <div className="m-0 ml-4 truncate text-xs font-normal leading-[1.6rem] tracking-[.02rem] text-grey">{desc}</div>
                </div>
            </button>
        </li>
    );
};

export const CardSnippetItem = ({label, isSelected, Icon, ...props}) => {
    return (
        <li role="presentation">
            <button
                type="button"
                role="menuitem"
                className={`flex w-full cursor-pointer flex-row items-center border border-transparent px-4 py-[1rem] text-grey-800 hover:bg-grey-100 ${isSelected ? 'bg-grey-100' : ''}`}
                data-kg-cardmenu-selected={isSelected}
                {...props}
            >
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-medium leading-[1.6rem] tracking-[.02rem] text-grey-900">{label}</div>
                </div>
            </button>
        </li>
    );
};

export const CardMenu = ({menu = new Map(), insert = () => {}, selectedItemIndex}) => {
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
                        label={item.label}
                        desc={item.desc}
                        Icon={item.Icon}
                        isSelected={isSelected}
                        onClick={onClick}
                        data-kg-cardmenu-idx={itemIndex}
                    />
                );
            } else if (item.type === 'snippet') {
                CardMenuItems.push(
                    <CardSnippetItem
                        key={itemIndex}
                        label={item.label}
                        Icon={item.Icon}
                        isSelected={isSelected}
                        onClick={onClick}
                        data-kg-cardmenu-idx={itemIndex}
                    />
                );
            }

            itemIndex = itemIndex + 1;
        });

        CardMenuSections.push(<CardMenuSection key={sectionLabel} label={sectionLabel}>{CardMenuItems}</CardMenuSection>);
    }

    return (
        <ul role="menu" className="not-kg-prose z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-md bg-white bg-clip-padding p-0 font-sans text-sm shadow-md after:block after:pb-4">
            {CardMenuSections}
        </ul>
    );
};
