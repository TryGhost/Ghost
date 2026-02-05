import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from '@tryghost/shade';
import { useIsActiveLink } from './use-is-active-link';

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
    isActive?: boolean
};
function NavMenuLink({
    to,
    target,
    rel,
    activeOnSubpath = false,
    isActive: controlledIsActive,
    children,
    ...props
}: NavMenuLinkProps) {
    const href = `#/${to?.replace(/^\/?#\//, '')}`;
    const computedIsActive = useIsActiveLink({ path: to, activeOnSubpath });
    const isActive = controlledIsActive !== undefined ? controlledIsActive : computedIsActive;
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

type NavMenuButtonProps = React.ComponentProps<typeof SidebarMenuButton> & {
    onClick?: () => void
};
function NavMenuButton({
    onClick,
    children,
    ...props
}: NavMenuButtonProps) {
    const { isMobile, setOpenMobile } = useSidebar();

    const handleClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
        onClick?.();
    };

    return (
        <SidebarMenuButton
            onClick={handleClick}
            {...props}
        >
            {children}
        </SidebarMenuButton>
    );
}

NavMenuItem.Link = NavMenuLink;
NavMenuItem.Label = NavMenuLabel;
NavMenuItem.Button = NavMenuButton;

export { NavMenuItem, NavMenuLink, NavMenuLabel, NavMenuButton }
