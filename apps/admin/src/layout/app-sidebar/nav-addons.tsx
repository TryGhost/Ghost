import React from "react";
import {SidebarGroup, SidebarGroupContent, SidebarMenu} from "@tryghost/shade/components";
import {NavMenuItem} from "./nav-menu-item";
import {LucideIcon} from "@tryghost/shade/utils";
import {useLocation} from "@tryghost/admin-x-framework";
import {lucideFromManifest, useAddonInstalls} from "@tryghost/addon-kit/host";
import {useNavigationExpanded} from "./hooks/use-navigation-preferences";
import {useFeatureFlag} from "@/hooks/use-feature-flag";

const PAGE_TARGET = "admin.page.render";

function AppsNavItemContent({isActive}: {isActive: boolean}) {
    return (
        <NavMenuItem.Link
            to="apps"
            isActive={isActive}
        >
            <LucideIcon.Puzzle className="pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 sidebar:group-has-[button:focus-visible]/menu-item:opacity-0" />
            <NavMenuItem.Label>Apps</NavMenuItem.Label>
        </NavMenuItem.Link>
    );
}

/**
 * The "Apps" sidebar group (labs: addons): the header links to the installed
 * list at #/apps (the marketplace is behind the list's header action), and
 * each installed add-on with a page target gets a submenu entry — static manifest
 * metadata rendered by the host, no sandbox boots to paint a nav row.
 * (A future `ghost.sidebarItem.setBadge` bridge method is the documented
 * dynamic upgrade path.)
 */
export function NavAddons({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const addonsEnabled = useFeatureFlag("addons");
    const {installs} = useAddonInstalls();
    const [appsExpanded, setAppsExpanded] = useNavigationExpanded("apps");
    const location = useLocation();

    if (!addonsEnabled) {
        return null;
    }

    const entries = installs.filter(install => install.enabled && install.sidebar && install.targeting.some(entry => entry.target === PAGE_TARGET));

    // Active on the apps chrome (list, marketplace, detail, install screen) —
    // not on app pages, which highlight their own submenu entry.
    const onAppsChrome = location.pathname === "/apps"
        || location.pathname.startsWith("/apps/marketplace")
        || location.pathname.startsWith("/apps/install");
    const isEntryActive = (handle: string) => location.pathname === `/apps/${handle}` || location.pathname.startsWith(`/apps/${handle}/`);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem.Collapsible
                        expanded={appsExpanded}
                        id="apps-submenu"
                        onExpandedChange={setAppsExpanded}
                    >
                        <NavMenuItem.CollapsibleItem ariaLabel="Toggle installed apps">
                            <AppsNavItemContent isActive={onAppsChrome} />
                        </NavMenuItem.CollapsibleItem>

                        <NavMenuItem.CollapsibleMenu>
                            {entries.map((install) => {
                                const Icon = lucideFromManifest(install.sidebar?.icon);
                                const route = install.sidebar?.route?.replace(/^\//, "") ?? "";
                                const to = `apps/${install.handle}${route ? `/${route}` : ""}`;
                                return (
                                    <NavMenuItem.SubmenuItem
                                        key={install.handle}
                                        to={to}
                                        isActive={isEntryActive(install.handle)}
                                    >
                                        <Icon />
                                        <NavMenuItem.Label>{install.sidebar?.label ?? install.name}</NavMenuItem.Label>
                                    </NavMenuItem.SubmenuItem>
                                );
                            })}
                        </NavMenuItem.CollapsibleMenu>
                    </NavMenuItem.Collapsible>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
