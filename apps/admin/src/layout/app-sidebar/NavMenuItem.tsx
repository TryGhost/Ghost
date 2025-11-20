import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from '@tryghost/shade';
import { useIsActiveLink } from './useIsActiveLink';
import { useSubmenuHasActiveChild, useRegisterActiveChild } from './SubmenuContext';

function NavMenuItem({ children, ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
    return (
        <SidebarMenuItem {...props}>
            {children}
        </SidebarMenuItem>
    );
}

type NavMenuLinkBaseProps = {
    to?: string
    target?: string
    rel?: string
    activeOnSubpath?: boolean
};

type NavMenuLinkInternalProps = {
    /**
     * If true, this link will not show as active when any submenu child is active.
     * Used internally by Submenu for parent links.
     * @internal
     */
    suppressWhenChildActive?: boolean
    /**
     * If true, this link will register itself as an active child in the submenu context.
     * Used internally by Submenu.Item for child links.
     * @internal
     */
    isSubmenuItem?: boolean
};

type NavMenuLinkProps = React.ComponentProps<typeof SidebarMenuButton> & 
    NavMenuLinkBaseProps & 
    NavMenuLinkInternalProps;
function NavMenuLink({
    to,
    target,
    rel,
    activeOnSubpath = false,
    suppressWhenChildActive = false,
    isSubmenuItem = false,
    children,
    ...props
}: NavMenuLinkProps) {
    const href = `#/${to}`;
    const linkIsActive = useIsActiveLink({ path: to, activeOnSubpath });
    const hasActiveChild = useSubmenuHasActiveChild();
    
    // Determine final active state
    const isActive = suppressWhenChildActive && hasActiveChild ? false : linkIsActive;
    
    // Register this link as active child if it's a submenu item
    useRegisterActiveChild(isSubmenuItem && linkIsActive);
    
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
