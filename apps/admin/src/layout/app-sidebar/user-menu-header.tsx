import React from "react"

interface UserMenuHeaderProps {
    name?: string;
    email?: string;
    children?: React.ReactNode;
}

export function UserMenuHeader({ name, email, children }: UserMenuHeaderProps) {
    return (
        <div className="p-3">
            <div className="flex items-center gap-3">
                {children}
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-foreground">
                        {name}
                    </span>
                    <span className="text-foreground-muted -mt-px truncate text-xs">
                        {email}
                    </span>
                </div>
            </div>
        </div>
    );
}
