import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem
} from '@tryghost/shade';
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
};
function NavMenuLink({ href, children, ...props }: NavMenuLinkProps) {
    const currentBaseRoute = useBaseRoute()
    const normalizedHref = href?.startsWith('#') ? href.slice(1) : href
    const linkBaseRoute = normalizedHref?.split('/')[1]
    const isActive = currentBaseRoute === linkBaseRoute

    return (
        <SidebarMenuButton {...props} asChild isActive={isActive}>
            <a href={href} aria-current={isActive ? 'page' : undefined}>
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
