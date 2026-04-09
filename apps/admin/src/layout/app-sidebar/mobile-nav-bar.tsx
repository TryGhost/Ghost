import React from "react";
import {Button, SidebarTrigger, useSidebar} from "@tryghost/shade/components";
import {LucideIcon} from "@tryghost/shade/utils";
import { useIsActiveLink } from "./use-is-active-link";
import { useSidebarVisibility } from "@/ember-bridge/ember-bridge";

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
            className={`w-full max-w-16 min-w-9 rounded-full hover:bg-gray-200 ${isActive ? 'bg-gray-200' : 'bg-transparent'}`} {...props}
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
    const sidebarVisible = useSidebarVisibility();


    if (!isMobile || !sidebarVisible) {
        return <></>
    }

    return (
        <div className="safe-area-inset-bottom fixed right-0 bottom-0 left-0 z-50 h-[var(--mobile-navbar-height)] border-t border-sidebar-border bg-sidebar/80 backdrop-blur-md sidebar:hidden">
            <div className="mx-auto grid h-full w-full max-w-[300px] grid-cols-4 items-center justify-items-center px-5">
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
                <SidebarTrigger className="h-9 rounded-full px-8 hover:bg-transparent">
                    <LucideIcon.Ellipsis strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Toggle Sidebar</span>
                </SidebarTrigger>
            </div>
        </div>
    );
}
