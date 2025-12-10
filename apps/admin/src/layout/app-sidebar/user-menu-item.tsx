import React from 'react';
import {
    DropdownMenuItem
} from '@tryghost/shade';

interface UserMenuLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
    children?: React.ReactNode
}

function UserMenuLabel({children, ...props}: UserMenuLabelProps) {
    return (
        <span className="flex-1" {...props}>{children}</span>
    );
}

type UserMenuItemComponent =
    React.FC<React.ComponentProps<typeof DropdownMenuItem>> & {
        Label: typeof UserMenuLabel;
    };

const UserMenuItem: UserMenuItemComponent = ({ children, ...props }) => {
    return (
        <DropdownMenuItem
            className="cursor-pointer text-base"
            asChild
            {...props}
        >
            {children}
        </DropdownMenuItem>
    );
};

UserMenuItem.Label = UserMenuLabel;

export { UserMenuItem, UserMenuLabel };
