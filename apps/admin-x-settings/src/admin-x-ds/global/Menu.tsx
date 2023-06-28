import Button, {ButtonProps, ButtonSize} from './Button';
import React, {useState} from 'react';
import clsx from 'clsx';

export type MenuItem = {
    id: string,
    label: string;
    onClick?: () => void
}

type MenuPosition = 'left' | 'right';

interface MenuProps {
    trigger?: React.ReactNode;
    triggerButtonProps?: ButtonProps;
    triggerSize?: ButtonSize;
    items: MenuItem[];
    position?: MenuPosition;
    className?: string;
}

const Menu: React.FC<MenuProps> = ({trigger, triggerButtonProps, items, position, className}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setMenuOpen(false);
        }
    };

    if (!trigger) {
        trigger = <Button icon='ellipsis' label='Menu' hideLabel {...triggerButtonProps} />;
    }

    const menuClasses = clsx(
        'absolute z-40 mt-2 w-max min-w-[160px] origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none',
        position === 'left' && 'right-0',
        (position === 'right' || !position) && 'left-0',
        menuOpen ? 'block' : 'hidden'
    );

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`fixed inset-0 z-40 ${menuOpen ? 'block' : 'hidden'}`} data-testid="menu-overlay" onClick={handleBackdropClick}></div>
            {/* Menu Trigger */}
            <div className='relative z-30' onClick={toggleMenu}>
                {trigger}
            </div>
            {/* Menu List */}
            <div aria-labelledby="menu-button" aria-orientation="vertical" className={menuClasses} role="menu">
                <div className="flex flex-col justify-stretch py-1" role="none">
                    {items.map(item => (
                        <button key={item.id} className="mx-1 block cursor-pointer rounded-[2.5px] px-4 py-1.5 text-left text-sm hover:bg-grey-100" type="button" onClick={item.onClick}>{item.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Menu;
