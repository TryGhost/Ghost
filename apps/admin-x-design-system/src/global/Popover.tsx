import React, {useState} from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

export type PopoverPosition = 'center' | 'end' | 'start' | undefined;

export interface PopoverProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    position?: PopoverPosition;
    closeOnItemClick?: boolean;
    open?: boolean;
    setOpen?: (value: boolean) => void;
}

const Popover: React.FC<PopoverProps> = ({
    trigger,
    children,
    position = 'start',
    closeOnItemClick,
    open: openState,
    setOpen: setOpenState
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    
    const open = openState !== undefined ? openState : internalOpen;
    const setOpen = setOpenState || setInternalOpen;

    const handleContentClick = () => {
        if (closeOnItemClick) {
            setOpen(false);
        }
    };

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Anchor asChild>
                <PopoverPrimitive.Trigger asChild onClick={e => e.stopPropagation()}>
                    {trigger}
                </PopoverPrimitive.Trigger>
            </PopoverPrimitive.Anchor>
            <PopoverPrimitive.Content align={position} className="z-[9999] mt-2 origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none dark:bg-grey-900 dark:text-white" data-testid='popover-content' side="bottom" onClick={handleContentClick}>
                {children}
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
    );
};

export default Popover;
