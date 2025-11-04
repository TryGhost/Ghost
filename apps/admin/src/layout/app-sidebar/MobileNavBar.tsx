import React from "react";
import {
    Button,
    LucideIcon,
    SidebarTrigger,
} from "@tryghost/shade";
import { useIsActiveLink } from "./useIsActiveLink";

const ICON_STROKE_WIDTH = 1.5;

interface MobileNavBarButtonProps extends Omit<React.ComponentProps<typeof Button>, 'asChild'> {
    href?: string;
    activeOnSubpath?: boolean;
}

function MobileNavBarButton({ href, activeOnSubpath = false, children, ...props }: MobileNavBarButtonProps) {
    const isActive = useIsActiveLink({ href, activeOnSubpath });

    return (
        <Button
            asChild
            className={`rounded-full px-8 ${isActive ? 'bg-gray-200' : 'bg-transparent'}`} {...props}
            variant="ghost"
            size="icon"
            data-active={isActive}
        >
            <a href={href}>
                {children}
            </a>
        </Button>
    );
}

export function MobileNavBar() {
    return (
        <div className="absolute flex justify-center bottom-0 w-full h-[55px] bg-sidebar bg-sidebar border-t border-sidebar-border">
            <div className="grid grid-cols-4 items-center w-full justify-items-center max-w-[330px]">
                <MobileNavBarButton href="#/analytics" activeOnSubpath>
                    <LucideIcon.TrendingUp strokeWidth={ICON_STROKE_WIDTH} />
                </MobileNavBarButton>
                <MobileNavBarButton href="#/posts" activeOnSubpath>
                    <LucideIcon.PenLine strokeWidth={ICON_STROKE_WIDTH} />
                </MobileNavBarButton>
                <MobileNavBarButton href="#/members" activeOnSubpath>
                    <LucideIcon.Users strokeWidth={ICON_STROKE_WIDTH} />
                </MobileNavBarButton>
                <SidebarTrigger className="rounded-full px-8">
                    <LucideIcon.Ellipsis strokeWidth={ICON_STROKE_WIDTH} />
                    <span className="sr-only">Toggle Sidebar</span>
                </SidebarTrigger>
            </div>
        </div>
    );
}
