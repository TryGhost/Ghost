import React from "react";
import {
    Button,
    LucideIcon,
    SidebarTrigger,
    useSidebar,
} from "@tryghost/shade";
import { useIsActiveLink } from "./useIsActiveLink";

const ICON_STROKE_WIDTH = 1.5;

interface MobileNavBarButtonProps extends Omit<React.ComponentProps<typeof Button>, 'asChild'> {
    to?: string;
    activeOnSubpath?: boolean;
}

function MobileNavBarButton({ to, activeOnSubpath = false, children, ...props }: MobileNavBarButtonProps) {
    const isActive = useIsActiveLink({ path: to, activeOnSubpath });

    return (
        <Button
            asChild
            className={`rounded-full w-full max-w-16 min-w-9 hover:bg-gray-200 ${isActive ? 'bg-gray-200' : 'bg-transparent'}`} {...props}
            variant="ghost"
            size="icon"
            data-active={isActive}
        >
            <a href={to}>
                {children}
            </a>
        </Button>
    );
}

export function MobileNavBar() {
    const { isMobile } = useSidebar();

    if (!isMobile) {
        return <></>
    }

    return (
        <div className="sticky flex justify-center max-w-[100vw] bottom-0 w-full h-[var(--mobile-navbar-height)] bg-sidebar/80 backdrop-blur-md border-t border-sidebar-border px-5 z-50">
            <div className="grid grid-cols-4 items-center w-full justify-items-center max-w-[300px]">
                <MobileNavBarButton
                    activeOnSubpath
                    to="analytics"
                >
                    <LucideIcon.TrendingUp strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Analytics</span>
                </MobileNavBarButton>
                <MobileNavBarButton
                    activeOnSubpath
                    to="posts"
                >
                    <LucideIcon.PenLine strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Posts</span>
                </MobileNavBarButton>
                <MobileNavBarButton
                    activeOnSubpath
                    to="members"
                >
                    <LucideIcon.Users strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Members</span>
                </MobileNavBarButton>
                <SidebarTrigger className="rounded-full px-8 h-9 hover:bg-transparent">
                    <LucideIcon.Ellipsis strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Toggle Sidebar</span>
                </SidebarTrigger>
            </div>
        </div>
    );
}
