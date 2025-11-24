import React from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon,
    Switch
} from "@tryghost/shade"
import { Link } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useUserPreferences, useEditUserPreferences } from "@/hooks/user-preferences";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { UserMenuAvatar } from "./UserMenuAvatar";
import { UserMenuHeader } from "./UserMenuHeader";
import { UserMenuItem } from "./UserMenuItem";

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
    const {data: preferences} = useUserPreferences();
    const {mutateAsync: editPreferences, isLoading: isEditingPreferences} = useEditUserPreferences();
    const site = useBrowseSite();
    const siteUrl = site.data?.site.url ?? "";

    const setNightShift = (nightShift: boolean) => {
        void editPreferences({nightShift});
    }

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
                <UserMenuItem>
                    <Link to={`/settings/staff/${currentUser.data?.slug}`}>
                        <LucideIcon.User />
                        <UserMenuItem.Label>Your profile</UserMenuItem.Label>
                    </Link>
                </UserMenuItem>
                <UserMenuItem
                    asChild={false}
                    className="cursor-pointer text-base"
                    onSelect={(e: Event) => {
                        e.preventDefault();
                        setNightShift(!preferences?.nightShift);
                    }}
                >
                    <LucideIcon.Moon />
                    <UserMenuItem.Label>Dark mode</UserMenuItem.Label>
                    <Switch
                        size='sm'
                        checked={preferences?.nightShift ?? false}
                        disabled={isEditingPreferences}
                        onCheckedChange={setNightShift}
                        onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
                        tabIndex={-1}
                    />
                </UserMenuItem>
                <DropdownMenuSeparator />
                <UserMenuItem
                    asChild={false}
                    className="cursor-pointer text-base" onClick={() => {
                        fetch("/ghost/api/admin/session", {
                            method: "DELETE",
                        }).then(() => {
                            window.location.href = "/ghost";
                        }).catch((error) => {
                            console.error(error);
                        });
                    }}
                >
                    <LucideIcon.LogOut />
                    <UserMenuItem.Label>Sign out</UserMenuItem.Label>
                </UserMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ContributorUserMenu;
