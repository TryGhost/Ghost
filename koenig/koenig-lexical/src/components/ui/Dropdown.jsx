import React from 'react';
import {ReactComponent as ArrowIcon} from '../../assets/icons/kg-arrow-down.svg';

export function Dropdown({value, menu, onChange}) {
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        setOpen(!open);
    };

    const handleSelect = (event, name) => {
        event.stopPropagation();
        setOpen(false);
        onChange(name);
    };

    const trigger = menu.find(menuItem => menuItem.name === value)?.label ?? '';

    return (
        <div className="relative font-sans text-sm font-normal">
            <button className={`relative w-full cursor-pointer border border-grey-300 py-2 px-3 text-left font-sans font-normal text-grey-900 focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800 ${open ? 'rounded-t' : 'rounded'}`} type="button" onClick={handleOpen}>
                {trigger}
                <ArrowIcon className={`absolute right-2 top-4 h-2 w-2 text-grey-600 ${open && 'rotate-180'}`} />
            </button>
            {open && (
                <ul className="absolute mt-[-1px] w-full rounded-b border border-grey-200 bg-white py-1 shadow dark:border-black dark:bg-black">
                    {menu.map(menuItem => (
                        <li key={menuItem.name} className="hover:bg-grey-100 dark:hover:bg-grey-950">
                            <button className="h-full w-full cursor-pointer px-3 py-1 text-left dark:text-white" type="button" onClick={event => handleSelect(event, menuItem.name)}>{menuItem.label}</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>

    );
}
