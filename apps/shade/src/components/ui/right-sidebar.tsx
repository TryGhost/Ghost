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
            'justify-start text-md font-medium text-text-secondary hover:bg-accent h-9 [&_svg]:size-[18px]',
            active && 'bg-accent text-text-primary font-semibold'
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
