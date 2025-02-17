import * as React from 'react';
import {Button, ButtonProps, cn} from '@tryghost/shade';

interface SidebarButtonProps extends ButtonProps {
    active: boolean;
    children: React.ReactNode;
}

const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({active, children, ...props}, ref) => {
        return (
            <Button
                ref={ref}
                className={cn(
                    'justify-start text-md font-medium text-gray-800 h-9 [&_svg]:size-[18px]',
                    active ? 'bg-gray-100 text-black font-semibold' : ''
                )}
                variant='ghost'
                {...props}
            >
                {children}
            </Button>
        );
    }
);

SidebarButton.displayName = 'SidebarButton';

export default SidebarButton;