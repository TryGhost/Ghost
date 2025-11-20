import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from '@tryghost/shade';
import { useIsActiveLink } from './useIsActiveLink';

function NavMenuItem({ children, ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
    return (
        <SidebarMenuItem {...props}>
            {children}
        </SidebarMenuItem>
    );
}

type NavMenuLinkProps = React.ComponentProps<typeof SidebarMenuButton> & {
    to?: string
    target?: string
    rel?: string
    activeOnSubpath?: boolean
    /**
     * Optionally override the active state (useful with submenu hooks)
     */
    isActive?: boolean
};

function NavMenuLink({
    to,
    target,
    rel,
    activeOnSubpath = false,
    isActive: isActiveProp,
    children,
    ...props
}: NavMenuLinkProps) {
    const href = `#/${to}`;
    const computedActive = useIsActiveLink({ path: to, activeOnSubpath });
    
    // Use prop if provided, otherwise compute from route
    const isActive = isActiveProp !== undefined ? isActiveProp : computedActive;
    
    const { isMobile, setOpenMobile } = useSidebar();

    const handleClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarMenuButton
            asChild
            isActive={isActive}
            {...props}>
            <a
                href={target === '_blank' ? to : href}
                rel={target === '_blank' ? rel ?? 'noopener noreferrer' : rel}
                target={target}
                aria-current={isActive ? 'page' : undefined}
                onClick={handleClick}
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
