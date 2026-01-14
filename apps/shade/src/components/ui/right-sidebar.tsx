import {cn} from '@/lib/utils';
import React from 'react';
import {Button, ButtonProps} from './button';

interface RightSidebarButtonProps extends ButtonProps {
    active?: boolean;
    children: React.ReactNode;
}

const RightSidebarMenuLink = React.forwardRef<HTMLButtonElement, RightSidebarButtonProps>(
    ({active, children, ...props}, ref) => {
        const linkClass = cn(
            'justify-start text-md font-medium text-gray-800 dark:hover:bg-gray-925/70 dark:text-gray-500 h-9 [&_svg]:size-[18px]',
            active && 'bg-gray-100 dark:bg-gray-925/70 dark:text-white text-black font-semibold'
        );

        return (
            <Button
                ref={ref}
                className={linkClass}
                variant='ghost'
                {...props}
            >
                {children}
            </Button>
        );
    }
);

RightSidebarMenuLink.displayName = 'RightSidebarMenuLink';

interface RightSidebarMenuProps {
    children?: React.ReactNode;
    className?: string;
}

const RightSidebarMenu = React.forwardRef<HTMLDivElement, RightSidebarMenuProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex flex-col gap-px', className)}
            {...props}
        >
            {children}
        </div>
    );
});

RightSidebarMenu.displayName = 'RightSidebarMenu';

export {
    RightSidebarMenu,
    RightSidebarMenuLink
};