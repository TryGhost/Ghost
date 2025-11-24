import React from "react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Indicator,
    LucideIcon,
    SidebarMenuButton,
    Switch
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useUserPreferences, useEditUserPreferences } from "@/hooks/user-preferences";
import { useWhatsNew } from "@/whats-new/hooks/use-whats-new";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";
import { UserMenuItem } from "./UserMenuItem";
import { Link } from "@tryghost/admin-x-framework";

interface UserMenuProps extends React.ComponentProps<typeof DropdownMenu> {
    onOpenWhatsNew?: () => void;
}

function UserMenu(props: UserMenuProps) {
    const currentUser = useCurrentUser();
    const {data: preferences} = useUserPreferences();
    const {mutateAsync: editPreferences, isLoading: isEditingPreferences} = useEditUserPreferences();
    const { data: whatsNewData } = useWhatsNew();
    const { showUpgradeBanner } = useUpgradeStatus();

    const setNightShift = (nightShift: boolean) => {
        void editPreferences({nightShift});
    }

    return (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger asChild className="focus-visible:ring-0">
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    aria-label="User menu"
                >
                <div className="relative">
                    <Avatar>
                        {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                        <AvatarFallback className="text-foreground-muted hover:text-foreground">
                            <LucideIcon.User />
                        </AvatarFallback>
                    </Avatar>
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
                <UserMenuItem>
                    <Link to={`/settings/staff/${currentUser.data?.slug}`}>
                        <LucideIcon.User />
                        <UserMenuItem.Label>Your profile</UserMenuItem.Label>
                    </Link>
                </UserMenuItem>
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
                <DropdownMenuSeparator />
                <UserMenuItem
                    asChild={false}
                    onClick={() => {
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

export default UserMenu;
