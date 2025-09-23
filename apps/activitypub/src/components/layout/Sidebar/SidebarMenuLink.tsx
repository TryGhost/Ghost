import * as React from 'react';
import {Button, ButtonProps, cn, formatNumber} from '@tryghost/shade';
import {Link, resetScrollPosition, useLocation, useNavigationStack} from '@tryghost/admin-x-framework';

interface SidebarButtonProps extends ButtonProps {
    to?: string;
    children: React.ReactNode;
    count?: number;
}

const SidebarMenuLink = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({to, children, count, ...props}, ref) => {
        const location = useLocation();
        const {resetStack} = useNavigationStack();

        const linkClass = cn(
            'justify-start text-md font-medium text-gray-800 dark:hover:bg-gray-925/70 dark:text-gray-500 h-9 [&_svg]:size-[18px]',
            (to && location.pathname === to) && 'bg-gray-100 dark:bg-gray-925/70 dark:text-white text-black font-semibold'
        );

        const badge = count && count > 0 ? (
            <span className={cn(
                'ml-auto bg-purple-500 text-white text-xs font-semibold py-1 px-1.5 rounded-full min-w-[20px] h-5 flex items-center justify-center'
            )}>
                {formatNumber(count)}
            </span>
        ) : null;

        if (to) {
            return (
                <Button className={linkClass} variant='ghost' asChild>
                    <Link to={to} onClick={() => {
                        resetStack();
                        resetScrollPosition(to);
                    }}>
                        {children}
                        {badge}
                    </Link>
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
                {badge}
            </Button>
        );
    }
);

SidebarMenuLink.displayName = 'SidebarMenuLink';

export default SidebarMenuLink;
