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
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-base font-semibold text-foreground truncate">
                        {name}
                    </span>
                    <span className="text-xs text-foreground-muted -mt-px truncate">
                        {email}
                    </span>
                </div>
            </div>
        </div>
    );
}
