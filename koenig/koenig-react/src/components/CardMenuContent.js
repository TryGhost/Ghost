import React from 'react';

const MenuGroup = ({group}) => {
    return (
        <>
            <div className="mb-2 flex shrink-0 flex-col justify-center px-4 pt-3 text-xs font-medium uppercase tracking-[.06rem] text-grey-midlight" style={{minWidth: 'calc(100% - 3.2rem)'}}>
                {group.title}
            </div>
            <div>
                {group.items.map(item => <MenuItem item={item} key={item.label} />)}
            </div>
        </>
    );
};

const MenuItem = ({item}) => {
    const {IconComponent = () => <></>} = item;

    return (
        <div
            className="flex cursor-pointer flex-row items-center border border-transparent px-4 py-2 text-grey-middark"
            data-kg="cardmenu-card"
            role="menuitem"
            title={item.label}
        >
            <div className={`flex items-center ${item.iconClass}`} aria-hidden="true"><IconComponent className="w7 h7" /></div>
            <div className="flex flex-col">
                <div className="text-grey-darkgrey m-0 ml-4 grow truncate text-[1.3rem] font-normal leading-[1.333em] tracking-[.02rem]">{item.label}</div>
                <div className="m-0 ml-4 grow truncate text-xs font-normal leading-[1.333em] tracking-[.02rem] text-grey-midlight">{item.desc}</div>
            </div>
        </div>
    );
};

const MenuContent = ({menuContent}) => {
    // const [selectedItem, setSelectedItem] = React.useState(menuContent[0]?.items[0]);

    const menuGroups = [];

    menuContent.forEach((group) => {
        if (group.items?.length) {
            menuGroups.push(<MenuGroup group={group} key={group.title} />);
        }
    });

    return (
        <>{menuGroups}</>
    );
};

export default MenuContent;
