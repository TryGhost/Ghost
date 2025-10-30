import React, { useState } from "react"

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
    SidebarMenuButton,
    Switch
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";

function UserMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
    const currentUser = useCurrentUser();
    const [dummyDarkMode, setDummyDarkMode] = useState(false);

    return (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger asChild className="focus-visible:ring-0">
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                <Avatar>
                    {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                    <AvatarFallback className="text-gray-800 hover:text-black">
                        <LucideIcon.User />
                    </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-base leading-tight">
                    <span className="truncate font-semibold">{currentUser.data?.name}</span>
                    <span className="text-muted-foreground truncate text-xs -mt-px">
                        {currentUser.data?.email}
                    </span>
                </div>
                <LucideIcon.ChevronsUpDown className="ml-auto size-4 text-grey-700" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="min-w-[260px]"
            >
                <div className="p-3">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                            <AvatarFallback className="text-gray-800 hover:text-black">
                                <LucideIcon.User />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-base font-semibold text-gray-900">
                                {currentUser.data?.name}
                            </span>
                            <span className="text-xs text-gray-700 -mt-px">
                                {currentUser.data?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-base">
                    <LucideIcon.Sparkles />
                    <span>What's new?</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-base">
                    <LucideIcon.User />
                    <span>Your profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-base" asChild>
                    <a href="https://ghost.org/resources?utm_source=admin&utm_campaign=resources" target="_blank" rel="noopener noreferrer">
                        <LucideIcon.Book />
                        Resources & guides
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-base"
                    onSelect={(e) => {
                        e.preventDefault();
                        setDummyDarkMode(!dummyDarkMode);
                    }}
                >
                    <LucideIcon.Moon />
                    <span className="flex-1">Dark mode</span>
                    <Switch
                        size='sm'
                        checked={dummyDarkMode}
                        onCheckedChange={setDummyDarkMode}
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

export default UserMenu;
