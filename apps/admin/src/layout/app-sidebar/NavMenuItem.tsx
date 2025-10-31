import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem
} from '@tryghost/shade';
import {useLocation} from 'react-router';
import { useBaseRoute } from '@tryghost/admin-x-framework';

function NavMenuItem({ children, ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
    return (
        <SidebarMenuItem {...props}>
            {children}
        </SidebarMenuItem>
    );
}

type NavMenuLinkProps = React.ComponentProps<typeof SidebarMenuButton> & {
    href?: string
    target?: string
    rel?: string
    activeOnSubpath?: boolean
};
function NavMenuLink({
    href,
    target,
    rel,
    activeOnSubpath = false,
    children,
    ...props
}: NavMenuLinkProps) {
    const location = useLocation();
    const currentBaseRoute = useBaseRoute();

    // Normalize href: strip leading hash and any trailing fragment
    const normalizedHref = href?.startsWith('#') ? href.slice(1) : href;
    const hrefNoHash = normalizedHref?.split('#')[0];

    // Extract path (keep optional query for exact match mode)
    const [linkPath = ''] = (hrefNoHash ?? '').split('?');
    const linkBaseRoute = linkPath.split('/')[1] ?? '';

    let isActive = false;

    if (activeOnSubpath) {
        // Match by first segment only; ignore query and deeper segments
        isActive = !!linkBaseRoute && currentBaseRoute === linkBaseRoute;
    } else if (hrefNoHash) {
        // Exact path + query match
        const currentFull = `${location.pathname}${location.search}`;
        isActive = currentFull === hrefNoHash;
    }

    return (
        <SidebarMenuButton
            asChild
            isActive={isActive}
            {...props}>
            <a
                href={href}
                rel={target === '_blank' ? rel ?? 'noopener noreferrer' : rel}
                target={target}
                aria-current={isActive ? 'page' : undefined}
            >
                {children}
            </a>
        </SidebarMenuButton>
    )
}

interface NavMenuLabelProps extends React.HTMLAttributes<HTMLSpanElement>
{
    children?: React.ReactNode
}
function NavMenuLabel({children, ...props}: NavMenuLabelProps) {
    return (
        <span {...props}>{children}</span>
    );
}

NavMenuItem.Link = NavMenuLink;
NavMenuItem.Label = NavMenuLabel;

export { NavMenuItem, NavMenuLink, NavMenuLabel }
