import Icon from './Icon';
import React from 'react';

export type MenuItem = {
    id: string,
    label: string;
}

type PositionOptions = 'left' | 'right';

interface MenuProps {
    // trigger?: React.ReactNode;
    items: MenuItem[];
    position?: PositionOptions;
    className?: string;
}

const Menu: React.FC<MenuProps> = ({items, position, className}) => {
    let menuListStyles = 'absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none';

    switch (position) {
    case 'left':
        menuListStyles += ' right-0 ';
        break;
    case 'right':
        menuListStyles += ' left-0 ';
        break;
        
    default:
        menuListStyles += ' left-0 ';
        break;
    }

    return (
        /* Menu */
        <div className={className}>
            {/* Menu Trigger */}
            <div>
                <button aria-expanded="true" aria-haspopup="true" className="flex items-center rounded-sm bg-grey-100 px-2 py-1 text-grey-400 hover:text-grey-600" id="menu-button" type="button">
                    <span className="sr-only">Open menu</span>
                    <Icon color="grey-900" name="menu-horizontal" />
                </button>
            </div>
            {/* Menu List */}
            <div aria-labelledby="menu-button" aria-orientation="vertical" className={menuListStyles} role="menu">
                <div className="py-1" role="none">
                    {/* Menu Item */}
                    {items.map(item => (
                        <button key={item.id} className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-grey-900 hover:bg-grey-100" type="button">{item.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Menu;