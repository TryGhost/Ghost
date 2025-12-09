import React from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Indicator,
    LucideIcon,
    SidebarMenuButton,
    Switch
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useUserPreferences, useEditUserPreferences } from "@/hooks/user-preferences";
import { useWhatsNew } from "@/whats-new/hooks/use-whats-new";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { UserMenuItem } from "./UserMenuItem";
import { UserMenuAvatar } from "./UserMenuAvatar";
import { UserMenuHeader } from "./UserMenuHeader";
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

function UserMenuDarkMode() {
    const {data: preferences} = useUserPreferences();
    const {mutateAsync: editPreferences, isLoading: isEditingPreferences} = useEditUserPreferences();

    const setNightShift = (nightShift: boolean) => {
        void editPreferences({nightShift});
    };

    return (
        <UserMenuItem
            asChild={false}
            onSelect={(e: Event) => {
                e.preventDefault();
                setNightShift(!preferences?.nightShift);
            }}
        >
            <LucideIcon.Moon />
            <UserMenuItem.Label className="flex-1">Dark mode</UserMenuItem.Label>
            <Switch
                size='sm'
                checked={preferences?.nightShift ?? false}
                disabled={isEditingPreferences}
                onCheckedChange={setNightShift}
                onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
                tabIndex={-1}
            />
        </UserMenuItem>
    );
}

function UserMenuSignOut() {
    const handleSignOut = () => {
        fetch("/ghost/api/admin/session", {
            method: "DELETE",
        }).then(() => {
            window.location.href = "/ghost";
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
                        <span className="text-muted-foreground truncate text-xs -mt-px">
                            {currentUser.data?.email}
                        </span>
                    </div>
                    <LucideIcon.ChevronsUpDown className="ml-auto size-4 text-grey-700" data-test-nav="arrow-down" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className={`w-full min-w-[240px] sidebar:min-w-[260px] ${showUpgradeBanner ? 'shadow-[0_18px_80px_0_rgba(0,0,0,0.07),0_7.52px_33.422px_0_rgba(0,0,0,0.05),0_4.021px_17.869px_0_rgba(0,0,0,0.04),0_2.254px_10.017px_0_rgba(0,0,0,0.04),0_1.197px_5.32px_0_rgba(0,0,0,0.03),0_0.498px_2.214px_0_rgba(0,0,0,0.02)]' : ''}`}
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
                        // Workaround for Radix UI bug where opening Dialog from DropdownMenu
                        // leaves pointer-events: none on body, freezing the UI
                        // https://github.com/radix-ui/primitives/issues/3317
                        queueMicrotask(() => props.onOpenWhatsNew?.());
                    }}
                >
                    <LucideIcon.Sparkles />
                    <UserMenuItem.Label>What’s new?</UserMenuItem.Label>
                    {whatsNewData?.hasNew && (
                        <div className="flex-1 flex justify-end">
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
                    className="rounded-full shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 flex items-center justify-center border border-border dark:bg-muted bg-background"
                    aria-label="Open user menu"
                >
                    <UserMenuAvatar className="w-11 h-11" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={10}
                className="w-full min-w-[240px] mb-2"
            >
                <UserMenuHeader
                    name={currentUser.data?.name}
                    email={currentUser.data?.email}
                >
                    <UserMenuAvatar />
                </UserMenuHeader>
                <DropdownMenuSeparator />
                <UserMenuItem>
                    <Link to="/">
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
