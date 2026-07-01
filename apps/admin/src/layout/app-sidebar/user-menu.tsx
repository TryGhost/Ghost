import React from "react"

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, Indicator, SidebarMenuButton} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
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
import { getAdminToolbarUrl } from "@/utils/admin-toolbar-url";

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

const THEME_OPTIONS: Array<{value: ThemeMode; label: string; Icon: typeof LucideIcon.Moon}> = [
    {value: 'dark', label: 'Dark', Icon: LucideIcon.Moon},
    {value: 'light', label: 'Light', Icon: LucideIcon.Sun},
    {value: 'system', label: 'System', Icon: LucideIcon.Monitor},
];

const THEME_LABELS = Object.fromEntries(
    THEME_OPTIONS.map(({value, label}) => [value, label])
) as Record<ThemeMode, string>;

function UserMenuAppearance() {
    const {theme, setTheme, isSettingTheme} = useTheme();

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger
                className="cursor-pointer gap-2 text-base [&>svg:last-child]:-ml-1.5 [&>svg:last-child]:size-3.5 [&>svg:last-child]:text-muted-foreground"
                data-test-nav="appearance"
            >
                <LucideIcon.Palette />
                <UserMenuItem.Label>Appearance</UserMenuItem.Label>
                <span className="text-sm text-muted-foreground">{THEME_LABELS[theme]}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent alignOffset={-4} className="min-w-36">
                {THEME_OPTIONS.map(({value, label, Icon}) => (
                    <DropdownMenuItem
                        key={value}
                        disabled={isSettingTheme}
                        aria-label={`${label} appearance`}
                        data-test-theme-option={value}
                        onSelect={() => {
                            void setTheme(value);
                        }}
                    >
                        <Icon />
                        <span className="flex-1">{label}</span>
                        {theme === value && (
                            <LucideIcon.Check
                                aria-hidden="true"
                                className="text-muted-foreground"
                            />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
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
            // eslint-disable-next-line no-console
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
            <DropdownMenuTrigger asChild>
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
                        <span className="-mt-px truncate text-sm text-muted-foreground dark:text-gray-800">
                            {currentUser.data?.email}
                        </span>
                    </div>
                    <LucideIcon.ChevronsUpDown className="ml-auto size-4 text-grey-700" data-test-nav="arrow-down" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={10}
                className={`w-[var(--radix-dropdown-menu-trigger-width)] dark:bg-surface-elevated-2 ${showUpgradeBanner ? 'shadow-[0_18px_80px_0_rgba(0,0,0,0.07),0_7.52px_33.422px_0_rgba(0,0,0,0.05),0_4.021px_17.869px_0_rgba(0,0,0,0.04),0_2.254px_10.017px_0_rgba(0,0,0,0.04),0_1.197px_5.32px_0_rgba(0,0,0,0.03),0_0.498px_2.214px_0_rgba(0,0,0,0.02)]' : ''}`}
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
                <UserMenuAppearance />
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
 * - Appearance selector
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
    const siteUrl = getAdminToolbarUrl(site.data?.site.url ?? "");

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
                <UserMenuAppearance />
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
