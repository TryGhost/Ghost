import React from "react"

import {DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger, Indicator, SidebarMenuButton} from "@tryghost/shade/components"
import {cn, LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { useWhatsNew } from "@/whats-new/hooks/use-whats-new";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { UserMenuItem } from "./user-menu-item";
import { UserMenuAvatar } from "./user-menu-avatar";
import { UserMenuHeader } from "./user-menu-header";
import { Link } from "@tryghost/admin-x-framework";

function UserMenuProfile() {
    const currentUser = useCurrentUser();

    return (
        <UserMenuItem>
            <Link to={`/settings/staff/${currentUser.data?.slug}`}>
                <LucideIcon.User />
                <UserMenuItem.Label>Your profile</UserMenuItem.Label>
            </Link>
        </UserMenuItem>
    );
}

const THEME_OPTIONS: Array<{value: ThemeMode; Icon: typeof LucideIcon.Sun; label: string}> = [
    {value: 'light', Icon: LucideIcon.Sun, label: 'Light'},
    {value: 'system', Icon: LucideIcon.Monitor, label: 'System'},
    {value: 'dark', Icon: LucideIcon.Moon, label: 'Dark'},
];

function UserMenuDarkMode() {
    const {theme, setTheme} = useTheme();

    const activeIndex = THEME_OPTIONS.findIndex(o => o.value === theme);

    return (
        <div className="px-2 py-1.5">
            <div className="relative flex items-center rounded-full bg-muted p-[3px]">
                <div
                    className="absolute top-[3px] bottom-[3px] rounded-full bg-background shadow-xs transition-[left] duration-200"
                    style={{
                        width: 'calc((100% - 6px) / 3)',
                        left: `calc(3px + ${activeIndex} * (100% - 6px) / 3)`,
                    }}
                />
                {THEME_OPTIONS.map(({value, Icon, label}) => (
                    <button
                        key={value}
                        type="button"
                        className={cn(
                            'relative z-10 flex flex-1 items-center justify-center gap-1 rounded-full py-[5px] text-xs font-medium transition-colors duration-150',
                            theme === value
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            setTheme(value);
                        }}
                        aria-label={`${label} theme`}
                    >
                        <Icon className="size-3.5 stroke-[1.5px]" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function UserMenuSignOut() {
    const handleSignOut = () => {
        const {apiRoot, adminRoot} = getGhostPaths();
        fetch(`${apiRoot}/session`, {
            method: "DELETE",
        }).then(() => {
            window.location.href = adminRoot;
        }).catch((error) => {
            console.error(error);
        });
    };

    return (
        <UserMenuItem
            asChild={false}
            onSelect={handleSignOut}
        >
            <LucideIcon.LogOut />
            <UserMenuItem.Label>Sign out</UserMenuItem.Label>
        </UserMenuItem>
    );
}

interface UserMenuProps extends React.ComponentProps<typeof DropdownMenu> {
    onOpenWhatsNew?: () => void;
}
function UserMenu(props: UserMenuProps) {
    const currentUser = useCurrentUser();
    const { data: whatsNewData } = useWhatsNew();
    const { showUpgradeBanner } = useUpgradeStatus();

    return (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger asChild className="focus-visible:ring-0">
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    aria-label="User menu"
                >
                    <div className="relative">
                        <UserMenuAvatar />
                        {whatsNewData?.hasNew && (
                            <span className="absolute -top-0.5 -right-0.5">
                                <Indicator
                                    variant="success"
                                    size="sm"
                                    label="New updates available"
                                    data-test-whats-new-avatar-badge
                                />
                            </span>
                        )}
                    </div>
                    <div className="grid flex-1 text-left text-base leading-tight">
                        <span className="truncate font-semibold">{currentUser.data?.name}</span>
                        <span className="-mt-px truncate text-xs text-muted-foreground">
                            {currentUser.data?.email}
                        </span>
                    </div>
                    <LucideIcon.ChevronsUpDown className="ml-auto size-4 text-grey-700" data-test-nav="arrow-down" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={10}
                className={`w-[var(--radix-dropdown-menu-trigger-width)] ${showUpgradeBanner ? 'shadow-[0_18px_80px_0_rgba(0,0,0,0.07),0_7.52px_33.422px_0_rgba(0,0,0,0.05),0_4.021px_17.869px_0_rgba(0,0,0,0.04),0_2.254px_10.017px_0_rgba(0,0,0,0.04),0_1.197px_5.32px_0_rgba(0,0,0,0.03),0_0.498px_2.214px_0_rgba(0,0,0,0.02)]' : ''}`}
            >
                <UserMenuHeader
                    name={currentUser.data?.name}
                    email={currentUser.data?.email}
                >
                    <UserMenuAvatar />
                </UserMenuHeader>
                <DropdownMenuSeparator />
                <UserMenuItem
                    data-test-nav="whatsnew"
                    asChild={false}
                    onSelect={() => {
                        props.onOpenWhatsNew?.();
                    }}
                >
                    <LucideIcon.Sparkles />
                    <UserMenuItem.Label>What’s new?</UserMenuItem.Label>
                    {whatsNewData?.hasNew && (
                        <div className="flex flex-1 justify-end">
                            <Indicator
                                variant="success"
                                size="sm"
                                label="New updates available"
                                data-test-whats-new-menu-badge
                                />
                        </div>
                    )}
                </UserMenuItem>
                <UserMenuProfile />
                <DropdownMenuSeparator />
                <UserMenuItem>
                    <a
                        href="https://ghost.org/resources?utm_source=admin&utm_campaign=resources"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <LucideIcon.Book />
                        <UserMenuItem.Label>Resources & guides</UserMenuItem.Label>
                    </a>
                </UserMenuItem>
                <UserMenuDarkMode />
                <DropdownMenuSeparator />
                <UserMenuSignOut />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Floating profile menu for contributor users
 * Positioned in top-right corner, minimal menu with essential actions only
 *
 * Mirrors Ember behavior where contributors have a simplified menu with:
 * - Posts (navigate to posts list)
 * - View site (open site in new tab)
 * - Your profile (navigate to profile settings)
 * - Dark mode toggle
 * - Sign out
 *
 * Contributors do not have access to:
 * - What's new
 * - Help center / Resources & guides
 * - Settings navigation
 */
function ContributorUserMenu() {
    const currentUser = useCurrentUser();
    const site = useBrowseSite();
    const siteUrl = site.data?.site.url ?? "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center justify-center rounded-full border border-border bg-background p-0.5 shadow-lg transition-shadow hover:shadow-xl focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-muted"
                    aria-label="Open user menu"
                >
                    <UserMenuAvatar className="h-11 w-11" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={10}
                className="mb-2 min-w-56"
            >
                <UserMenuHeader
                    name={currentUser.data?.name}
                    email={currentUser.data?.email}
                >
                    <UserMenuAvatar />
                </UserMenuHeader>
                <DropdownMenuSeparator />
                <UserMenuItem>
                    <Link to="/posts">
                        <LucideIcon.FileText />
                        <UserMenuItem.Label>Posts</UserMenuItem.Label>
                    </Link>
                </UserMenuItem>
                <UserMenuItem>
                    <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                        <LucideIcon.ExternalLink />
                        <UserMenuItem.Label>View site</UserMenuItem.Label>
                    </a>
                </UserMenuItem>
                <DropdownMenuSeparator />
                <UserMenuProfile />
                <UserMenuDarkMode />
                <DropdownMenuSeparator />
                <UserMenuSignOut />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export {
    UserMenu,
    ContributorUserMenu
};
