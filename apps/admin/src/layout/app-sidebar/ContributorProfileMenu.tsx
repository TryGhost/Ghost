import React from "react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon,
    Switch
} from "@tryghost/shade"
import { Link } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useUserPreferences, useEditUserPreferences } from "@/hooks/user-preferences";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

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
function ContributorProfileMenu() {
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
                    <Avatar className="w-11 h-11">
                        {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                        <AvatarFallback className="text-foreground-muted hover:text-foreground bg-background dark:bg-muted">
                            <LucideIcon.User />
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={10}
                className="w-full min-w-[240px] mb-2"
            >
                <div className="p-3">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                            <AvatarFallback className="text-foreground-muted hover:text-foreground">
                                <LucideIcon.User />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-base font-semibold text-foreground">
                                {currentUser.data?.name}
                            </span>
                            <span className="text-xs text-foreground-muted -mt-px">
                                {currentUser.data?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-base" asChild>
                    <Link to="/">
                        <LucideIcon.FileText />
                        <span>Posts</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-base" asChild>
                    <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                        <LucideIcon.ExternalLink />
                        <span>View site</span>
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-base" asChild>
                    <Link to={`/settings/staff/${currentUser.data?.slug}`}>
                        <LucideIcon.User />
                        <span>Your profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-base"
                    onSelect={(e: Event) => {
                        e.preventDefault();
                        setNightShift(!preferences?.nightShift);
                    }}
                >
                    <LucideIcon.Moon />
                    <span className="flex-1">Dark mode</span>
                    <Switch
                        size='sm'
                        checked={preferences?.nightShift ?? false}
                        disabled={isEditingPreferences}
                        onCheckedChange={setNightShift}
                        onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
                        tabIndex={-1}
                    />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-base" onClick={() => {
                    fetch("/ghost/api/admin/session", {
                        method: "DELETE",
                    }).then(() => {
                        window.location.href = "/ghost";
                    }).catch((error) => {
                        console.error(error);
                    });
                }}>
                    <LucideIcon.LogOut />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ContributorProfileMenu;
