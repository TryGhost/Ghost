import type React from "react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    LucideIcon
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";

type UserMenuAvatarProps = React.ComponentProps<typeof Avatar>;

export function UserMenuAvatar(props: UserMenuAvatarProps) {
    const currentUser = useCurrentUser();

    return (
        <Avatar {...props}>
            {currentUser.data?.profile_image && <AvatarImage src={currentUser.data?.profile_image} />}
            <AvatarFallback className="text-foreground-muted hover:text-foreground">
                <LucideIcon.User />
            </AvatarFallback>
        </Avatar>
    );
}
