import Icon from './Icon';
import React from 'react';

export type DropdownMenuItem = {
    label: string;
}

interface MenuProps {
    // trigger?: React.ReactNode;
    items: DropdownMenuItem[];
}

const DropdownMenu: React.FC<MenuProps> = ({items}) => {
    return (
        /* DropdownMenu */
        <div className="relative inline-block text-left">
            {/* DropdownMenu Trigger */}
            <div>
                <button aria-expanded="true" aria-haspopup="true" className="bg-gray-100 text-gray-400 hover:text-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-100 flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2" id="menu-button" type="button">
                    <span className="sr-only">Open menu</span>
                    <Icon name="menu-horizontal" />
                </button>
            </div>

            {/* DropdownMenu List */}
            <div aria-labelledby="menu-button" aria-orientation="vertical" className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none" role="menu">
                <div className="py-1" role="none">
                    {/* DropdownMenu Item */}
                    <button className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-grey-900 hover:bg-grey-100" type="button">Item</button>
                    {/* DropdownMenu Item */}
                    <button className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-grey-900 hover:bg-grey-100" type="button">Item</button>
                    {/* DropdownMenu Item */}
                    <button className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-grey-900 hover:bg-grey-100" type="button">Item</button>
                </div>
            </div>
        </div>
    );
};

export default DropdownMenu;