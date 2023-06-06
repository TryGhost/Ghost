import React, {useState} from 'react';

export type MenuItem = {
    id: string,
    label: string;
    onClick?: () => void
}

type MenuPosition = 'left' | 'right';

interface MenuProps {
    trigger?: React.ReactNode;
    items: MenuItem[];
    position?: MenuPosition;
    className?: string;
}

const Menu: React.FC<MenuProps> = ({trigger, items, position, className}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    let menuListStyles = 'absolute z-40 mt-2 min-w-[160px] w-max origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none';

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {        
        if (e.target === e.currentTarget) {
            setMenuOpen(false);
        }
    };

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

    menuListStyles += menuOpen ? 'block' : 'hidden';

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`fixed inset-0 z-40 ${menuOpen ? 'block' : 'hidden'}`} onClick={handleBackdropClick}></div>
            {/* Menu Trigger */}
            <div className='relative z-50' onClick={toggleMenu}>
                {trigger}
            </div>
            {/* Menu List */}
            <div aria-labelledby="menu-button" aria-orientation="vertical" className={menuListStyles} role="menu">
                <div className="py-1" role="none">
                    {items.map(item => (
                        <button key={item.id} className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-grey-900 hover:bg-grey-100" type="button" onClick={item.onClick}>{item.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Menu;