import * as React from 'react';
import {Button, ButtonProps, cn} from '@tryghost/shade';
import {Link, resetScrollPosition, useLocation, useNavigationStack} from '@tryghost/admin-x-framework';

interface SidebarButtonProps extends ButtonProps {
    to?: string;
    children: React.ReactNode;
}

const SidebarMenuLink = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({to, children, ...props}, ref) => {
        const location = useLocation();
        const {resetStack} = useNavigationStack();

        const linkClass = cn(
            'justify-start text-md font-medium text-gray-800 dark:hover:bg-gray-925/70 dark:text-gray-500 h-9 [&_svg]:size-[18px]',
            (to && location.pathname === to) && 'bg-gray-100 dark:bg-gray-925/70 dark:text-white text-black font-semibold'
        );

        if (to) {
            return (
                <Button className={linkClass} variant='ghost' asChild>
                    <Link to={to} onClick={() => {
                        resetStack();
                        resetScrollPosition(to);
                    }}>{children}</Link>
                </Button>
            );
        }

        return (
            <Button
                ref={ref}
                className={linkClass}
                variant='ghost'
                onClick={props.onClick}
                {...props}
            >
                {children}
            </Button>
        );
    }
);

SidebarMenuLink.displayName = 'SidebarMenuLink';

export default SidebarMenuLink;
