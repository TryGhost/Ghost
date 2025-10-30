import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem
} from '@tryghost/shade';

// Example composition:

// <NavmenuItem>
//     before
//     <NavMenuItem.Link>
//         <LucideIcon.User />
//         <NavMenuItem.Label>User</NavMenuItem.Label>
//     </NavMenuItem.Link>
//     after
// </NavmenuItem>

function NavMenuItem({ ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
    return (
        <SidebarMenuItem {...props}>
            children
        </SidebarMenuItem>
    );
}

function NavMenuLink({ ...props }: React.ComponentProps<typeof SidebarMenuButton>) {
    const isActive = false;

    return (
        <SidebarMenuButton asChild isActive={isActive} {...props}>
            <a href='' aria-current={isActive ? 'page' : undefined}>
                children
            </a>
        </SidebarMenuButton>
    )
}

function NavMenuLabel() {
    return (
        <span>label</span>
    );
}

NavMenuItem.Link = NavMenuLink;
NavMenuItem.Label = NavMenuLabel;

export { NavMenuItem, NavMenuLink, NavMenuLabel }
