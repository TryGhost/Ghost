import React from 'react';
import Button, {ButtonProps, ButtonSize} from './Button';
import Popover, {PopoverPosition} from './Popover';

export type MenuItem = {
    id: string,
    label: string;
    destructive?: boolean;
    onClick?: (e: React.MouseEvent) => void
}

export interface MenuProps {
    trigger?: React.ReactNode;
    triggerButtonProps?: ButtonProps;
    triggerSize?: ButtonSize;
    items: MenuItem[];
    position?: PopoverPosition;
    open?: boolean;
    setOpen?: (value: boolean) => void
}

const Menu: React.FC<MenuProps> = ({
    trigger,
    triggerButtonProps,
    items,
    position = 'start',
    open,
    setOpen
}) => {
    if (!trigger) {
        trigger = <Button icon='ellipsis' label='Menu' hideLabel {...triggerButtonProps}/>;
    }

    return (
        <Popover open={open} position={position} setOpen={setOpen} trigger={trigger} closeOnItemClick>
            <div className="flex min-w-[160px] flex-col justify-stretch py-1" role="none">
                {items.map(item => (
                    <button key={item.id} className={`mx-1 block cursor-pointer rounded-[2.5px] px-4 py-1.5 text-left text-sm hover:bg-grey-100 dark:hover:bg-grey-925 ${item.destructive && ' text-red-500'}`} type="button" onClick={(e) => {
                        if (item.onClick) {
                            item.onClick(e);
                        }
                    }}>{item.label}</button>
                ))}
            </div>
        </Popover>
    );
};

export default Menu;
