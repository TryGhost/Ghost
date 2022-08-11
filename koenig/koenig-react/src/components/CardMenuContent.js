import React from 'react';

const CardMenuGroup = ({group, ...props}) => {
    return (
        <>
            <div className="mb-2 flex shrink-0 flex-col justify-center px-4 pt-3 text-xs font-medium uppercase tracking-[.06rem] text-grey-midlight" style={{minWidth: 'calc(100% - 3.2rem)'}}>
                {group.title}
            </div>
            <div>
                {group.items.map(item => <CardMenuItem item={item} key={item.label} {...props} />)}
            </div>
        </>
    );
};

const CardMenuItem = ({item, itemWasClicked, replacementRange, koenigEditor}) => {
    const {IconComponent = () => <></>} = item;

    const handleClick = (event) => {
        event?.preventDefault();

        const range = replacementRange || koenigEditor.mobiledocEditor.range;

        if (item.type === 'card') {
            const payload = item.payload ? JSON.parse(JSON.stringify(item.payload)) : {};

            koenigEditor.replaceWithCardSection(item.replaceArg, range, payload);
        }

        itemWasClicked?.();
    };

    return (
        <div
            className="flex cursor-pointer flex-row items-center border border-transparent px-4 py-2 text-grey-middark"
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

const CardMenuContent = ({koenigEditor, ...props}) => {
    // const [selectedItem, setSelectedItem] = React.useState(menuContent[0]?.items[0]);

    const menuGroups = [];

    koenigEditor.cardMenu.forEach((group) => {
        if (group.items?.length) {
            menuGroups.push(<CardMenuGroup group={group} koenigEditor={koenigEditor} key={group.title} {...props} />);
        }
    });

    return (
        <>{menuGroups}</>
    );
};

export default CardMenuContent;
