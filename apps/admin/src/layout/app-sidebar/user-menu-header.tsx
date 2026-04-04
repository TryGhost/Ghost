import React from "react"
import { useFeatureFlag } from "@/hooks/use-feature-flag";

interface UserMenuHeaderProps {
    name?: string;
    email?: string;
    children?: React.ReactNode;
}

export function UserMenuHeader({ name, email, children }: UserMenuHeaderProps) {
    const adminUiRedesign = useFeatureFlag('adminUiRedesign');

    return (
        <div className="p-3">
            <div className={adminUiRedesign ? "flex flex-col items-center gap-3" : "flex items-center gap-3"}>
                {children}
                <div className={adminUiRedesign ? "flex min-w-0 flex-1 flex-col text-center" : "flex min-w-0 flex-1 flex-col"}>
                    <span className="truncate text-base font-semibold text-foreground">
                        {name}
                    </span>
                    <span className={adminUiRedesign ? "text-foreground-muted -mt-px truncate text-sm" : "text-foreground-muted -mt-px truncate text-xs"}>
                        {email}
                    </span>
                </div>
            </div>
        </div>
    );
}
