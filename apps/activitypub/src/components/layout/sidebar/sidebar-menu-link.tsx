import * as React from 'react';
import {Button, ButtonProps} from '@tryghost/shade/components';
import {Link, resetScrollPosition, useLocation, useNavigationStack} from '@tryghost/admin-x-framework';
import {cn, formatNumber} from '@tryghost/shade/utils';

import {useAppBasePath} from '@src/hooks/use-app-base-path';

interface SidebarButtonProps extends ButtonProps {
    to?: string;
    children: React.ReactNode;
    count?: number;
}

const SidebarMenuLink = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({to, children, count, ...props}, ref) => {
        const location = useLocation();
        const {resetStack} = useNavigationStack();
        const basePath = useAppBasePath();

        // Build full path by prepending base path to absolute paths
        // Following the same pattern as useNavigateWithBasePath
        const fullPath = to && to.startsWith('/') ? `${basePath}${to}` : to;
        const isActive = fullPath && (
            location.pathname === fullPath ||
            location.pathname.startsWith(`${fullPath}/`)
        );

        const linkClass = cn(
            'h-8 justify-start font-medium text-gray-800 dark:text-gray-500 dark:hover:bg-gray-950/70 [&_svg]:size-[18px]',
            isActive && 'bg-gray-100 font-semibold text-black dark:bg-gray-950/70 dark:text-white'
        );

        const badge = count && count > 0 ? (
            <span className={cn(
                'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500 px-1.5 py-1 text-xs font-semibold text-white'
            )}>
                {formatNumber(count)}
            </span>
        ) : null;

        if (fullPath) {
            return (
                <Button className={linkClass} variant='ghost' asChild>
                    <Link to={fullPath} onClick={() => {
                        resetStack();
                        resetScrollPosition(fullPath);
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
