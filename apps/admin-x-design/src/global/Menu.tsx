import Button, {ButtonProps, ButtonSize} from './Button';
import Popover, {PopoverPosition} from './Popover';
import React from 'react';

export type MenuItem = {
    id: string,
    label: string;
    onClick?: () => void
}

interface MenuProps {
    trigger?: React.ReactNode;
    triggerButtonProps?: ButtonProps;
    triggerSize?: ButtonSize;
    items: MenuItem[];
    position?: PopoverPosition;
}

const Menu: React.FC<MenuProps> = ({
    trigger,
    triggerButtonProps,
    items,
    position = 'left'
}) => {
    if (!trigger) {
        trigger = <Button icon='ellipsis' label='Menu' hideLabel {...triggerButtonProps} />;
    }

    return (
        <Popover position={position} trigger={trigger} closeOnItemClick>
            <div className="flex min-w-[160px] flex-col justify-stretch py-1" role="none">
                {items.map(item => (
                    <button key={item.id} className="mx-1 block cursor-pointer rounded-[2.5px] px-4 py-1.5 text-left text-sm hover:bg-grey-100 dark:hover:bg-grey-800" type="button" onClick={item.onClick}>{item.label}</button>
                ))}
            </div>
        </Popover>
    );
};

export default Menu;
