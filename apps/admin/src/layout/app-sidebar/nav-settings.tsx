import React from "react"

import {SidebarGroup, SidebarGroupContent, SidebarMenu} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canAccessSettings } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import { useAdminTranslation } from "@/i18n/admin-i18n";

function NavSettings({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const showSettings = currentUser && canAccessSettings(currentUser);
    const {t} = useAdminTranslation();

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {showSettings && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="settings">
                                <LucideIcon.Settings />
                                <NavMenuItem.Label>{t('settings')}</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}

                    <NavMenuItem>
                        <NavMenuItem.Link
                            to="https://ghost.org/help?utm_source=admin&utm_campaign=help"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <LucideIcon.HelpCircle />
                            <NavMenuItem.Label>{t('help')}</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavSettings;
