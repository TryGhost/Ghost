import React from "react";
import {
    SidebarInset,
    SidebarProvider,
} from "@tryghost/shade";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { isContributorUser } from "@tryghost/admin-x-framework/api/users";
import { useSidebarVisibility } from "@/ember-bridge/ember-bridge";
import AppSidebar from "./app-sidebar";
import { MobileNavBar } from "./app-sidebar/mobile-nav-bar";
import { ContributorUserMenu } from "./app-sidebar/user-menu";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { data: currentUser } = useCurrentUser();
    const sidebarVisible = useSidebarVisibility();
    const isContributor = currentUser && isContributorUser(currentUser);

    // Contributors get a floating profile menu instead of the full sidebar
    if (isContributor) {
        return (
            <div className="relative h-full bg-background">
                <main className="h-full overflow-auto">{children}</main>
                <div className="fixed bottom-3.5 left-3.5 lg:bottom-8 lg:left-8 z-20">
                    <ContributorUserMenu />
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider open={!!currentUser && sidebarVisible}>
            <AppSidebar />
            <SidebarInset className={`bg-background overflow-y-auto sidebar:max-h-full ${sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full'}`}>
                <main className="flex-1">{children}</main>
                <MobileNavBar />
            </SidebarInset>
        </SidebarProvider>
    );
}
