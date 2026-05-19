import React from 'react';
import {Button, SidebarMenuButton, SidebarMenuItem, useSidebar} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import { useIsActiveLink } from './use-is-active-link';

function NavMenuItem({ children, ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
    return (
        <SidebarMenuItem {...props}>
            {children}
        </SidebarMenuItem>
    );
}

interface NavMenuCollapsibleContextValue {
    expanded: boolean;
    id: string;
    onExpandedChange: (expanded: boolean) => void | Promise<void>;
}

const NavMenuCollapsibleContext = React.createContext<NavMenuCollapsibleContextValue | null>(null);

function useNavMenuCollapsibleContext() {
    const context = React.useContext(NavMenuCollapsibleContext);

    if (!context) {
        throw new Error('NavMenuItem.Collapsible components must be used within NavMenuItem.Collapsible');
    }

    return context;
}

interface NavMenuCollapsibleProps {
    children: React.ReactNode;
    expanded: boolean;
    id: string;
    onExpandedChange: (expanded: boolean) => void | Promise<void>;
}

function NavMenuCollapsible({children, expanded, id, onExpandedChange}: NavMenuCollapsibleProps) {
    const value = {
        expanded,
        id,
        onExpandedChange
    };

    return (
        <NavMenuCollapsibleContext.Provider value={value}>
            {children}
        </NavMenuCollapsibleContext.Provider>
    );
}

interface NavMenuCollapsibleItemProps {
    ariaLabel: string;
    children: React.ReactNode;
}

function NavMenuCollapsibleItem({ariaLabel, children}: NavMenuCollapsibleItemProps) {
    const {expanded, id, onExpandedChange} = useNavMenuCollapsibleContext();

    return (
        <NavMenuItem>
            <Button
                aria-controls={id}
                aria-expanded={expanded}
                aria-label={ariaLabel}
                variant="ghost"
                size="icon"
                className="hover:text-gray-black absolute top-0 left-3 h-[34px]! w-auto p-0 text-sidebar-accent-foreground transition-all group-hover/menu-item:opacity-100 hover:bg-transparent focus-visible:opacity-100 sidebar:opacity-0"
                onClick={() => void onExpandedChange(!expanded)}
            >
                <LucideIcon.ChevronRight
                    size={16}
                    className={`transition-all ${expanded ? 'rotate-[90deg]' : ''}`}
                />
            </Button>
            {children}
        </NavMenuItem>
    );
}

interface NavMenuCollapsibleMenuProps {
    children: React.ReactNode;
}

function NavMenuCollapsibleMenu({children}: NavMenuCollapsibleMenuProps) {
    const {expanded, id} = useNavMenuCollapsibleContext();

    return (
        <div
            id={id}
            className={`grid transition-all duration-200 ease-out ${expanded ? 'mb-5 grid-rows-[1fr]' : 'mb-0 grid-rows-[0fr]'}`}
        >
            <div className="overflow-hidden">
                {expanded ? children : null}
            </div>
        </div>
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
NavMenuItem.Collapsible = NavMenuCollapsible;
NavMenuItem.CollapsibleItem = NavMenuCollapsibleItem;
NavMenuItem.CollapsibleMenu = NavMenuCollapsibleMenu;

export { NavMenuItem, NavMenuLink, NavMenuLabel, NavMenuButton }
