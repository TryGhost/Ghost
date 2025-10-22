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

function UserMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
    return (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex text-gray-600 items-center gap-1 h-auto justify-start hover:bg-gray-200 rounded-full p-2"
                >
                    <Avatar>
                        <AvatarImage src="https://avatars.githubusercontent.com/u/2178663?s=200&v=4" />
                        <AvatarFallback>
                            US
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
                            <AvatarImage src="https://avatars.githubusercontent.com/u/2178663?s=200&v=4" />
                            <AvatarFallback>
                                US
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                                User Name
                            </span>
                            <span className="text-xs text-gray-500">
                                user@example.com
                            </span>
                        </div>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                    <span>Your profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => {
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
