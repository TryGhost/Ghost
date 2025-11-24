import React from 'react';
import {
    DropdownMenuItem
} from '@tryghost/shade';

function UserMenuItem({ children, ...props }: React.ComponentProps<typeof DropdownMenuItem>) {
    return (
        <DropdownMenuItem
            className="cursor-pointer text-base"
            asChild
            {...props}
        >
            {children}
        </DropdownMenuItem>
    );
}

interface UserMenuLabelProps extends React.HTMLAttributes<HTMLSpanElement>
{
    children?: React.ReactNode
}
function UserMenuLabel({children, ...props}: UserMenuLabelProps) {
    return (
        <span className="flex-1" {...props}>{children}</span>
    );
}

UserMenuItem.Label = UserMenuLabel;

export { UserMenuItem, UserMenuLabel };
