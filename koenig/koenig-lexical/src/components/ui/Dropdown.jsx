import React from 'react';
import {ReactComponent as ArrowIcon} from '../../assets/icons/kg-arrow-down.svg';

export function Dropdown({trigger, menu}) {
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        setOpen(!open);
    };

    return (
        <div className="relative font-sans text-sm font-normal">
            <button className={`relative w-full cursor-pointer border border-grey-300 py-2 px-3 text-left font-sans font-normal text-grey-900 focus-visible:outline-none ${open ? 'rounded-t' : 'rounded'}`} type="button" onClick={handleOpen}>
                {trigger}
                <ArrowIcon className={`absolute right-2 top-4 h-2 w-2 text-grey-600 ${open && 'rotate-180'}`} />
            </button>
            {open && (
                <ul className="absolute mt-[-1px] w-full rounded-b border border-grey-200 bg-white py-1 shadow">
                    {menu.map((menuItem, index) => (
                        <li key={index} className="hover:bg-grey-100">
                            <button className="h-full w-full cursor-pointer px-3 py-1 text-left" type="button" onClick={handleOpen}>{menuItem}</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>

    );
}
