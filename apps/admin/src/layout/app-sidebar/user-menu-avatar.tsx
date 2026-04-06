import type React from "react";
import {Avatar, AvatarFallback, AvatarImage} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";

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
