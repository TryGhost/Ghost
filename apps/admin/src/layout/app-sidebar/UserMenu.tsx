import React from "react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";

function UserMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
    const currentUser = useCurrentUser();

    return (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger asChild className="focus-visible:ring-0">
                <Button
                    variant="ghost"
                    className="flex text-gray-600 items-center gap-1 h-auto justify-start hover:bg-gray-200 rounded-full p-1 ml-1"
                >
                    <Avatar>
                        {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
                        <AvatarFallback className="text-gray-800 hover:text-black">
                            <LucideIcon.User />
                        </AvatarFallback>
                    </Avatar>
                    <LucideIcon.ChevronDown
                        strokeWidth={2}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
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
                            <span className="text-sm font-medium text-gray-900">
                                {currentUser.data?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                {currentUser.data?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                    <span>What's new?</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                    <span>Your profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" asChild>
                    <a href="https://ghost.org/help?utm_source=admin&utm_campaign=help" target="_blank" rel="noopener noreferrer">Help center</a>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" asChild>
                    <a href="https://ghost.org/resources?utm_source=admin&utm_campaign=resources" target="_blank" rel="noopener noreferrer">Resources & guides</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => {
                    fetch("/ghost/api/admin/session", {
                        method: "DELETE",
                    }).then(() => {
                        window.location.href = "/ghost";
                    }).catch((error) => {
                        console.error(error);
                    });
                }}>
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default UserMenu;
