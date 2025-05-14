import React from 'react';
import {cn} from '@tryghost/shade';

interface NavbarActionsProps {
    children?: React.ReactNode;
    className?: string;
}

export const NavbarActions = React.forwardRef<HTMLDivElement, NavbarActionsProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex items-center gap-2', className)}
            {...props}
        >
            {children}
        </div>
    );
});

NavbarActions.displayName = 'NavbarActions';

interface NavbarProps {
    children?: React.ReactNode;
    className?: string;
}

const Navbar = React.forwardRef<HTMLDivElement, NavbarProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex items-center border-b justify-between gap-5', className)}
            {...props}
        >
            {children}
        </div>
    );
});

Navbar.displayName = 'Navbar';

// export {
//     RightSidebarMenu,
//     RightSidebarMenuLink
// };

export default Navbar;