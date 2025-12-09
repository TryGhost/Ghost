import {cn} from '@/lib/utils';
import React from 'react';

interface NavbarActionsProps {
    children?: React.ReactNode;
    className?: string;
}

const NavbarActions = React.forwardRef<HTMLDivElement, NavbarActionsProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('[grid-area:actions] mt-3 lg:mt-0 flex items-center gap-2', className)}
            data-navbar='navbar-actions'
            {...props}
        >
            {children}
        </div>
    );
});

NavbarActions.displayName = 'NavbarActions';

interface NavbarNavigationProps {
    children?: React.ReactNode;
    className?: string;
}

const NavbarNavigation = React.forwardRef<HTMLDivElement, NavbarNavigationProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('[grid-area:navigation]', className)}
            data-navbar='navbar-navigation'
            {...props}
        >
            {children}
        </div>
    );
});

NavbarNavigation.displayName = 'NavbarNavigation';

interface NavbarProps {
    children?: React.ReactNode;
    className?: string;
}

const Navbar = React.forwardRef<HTMLDivElement, NavbarProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(`grid grid-cols-[1fr] [grid-template-areas:'navigation''actions''subactions'] lg:grid-cols-[1fr_auto] lg:[grid-template-areas:'navigation_actions''subactions_subactions'] border-b justify-between gap-x-5 gap-y-2`, className)}
            data-navbar='navbar'
            {...props}
        >
            {children}
        </div>
    );
});

Navbar.displayName = 'Navbar';

export {
    NavbarActions,
    NavbarNavigation,
    Navbar
};
