import React from "react";
import {
    SidebarInset,
    SidebarProvider,
} from "@tryghost/shade";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { isContributorUser } from "@tryghost/admin-x-framework/api/users";
import { useSidebarVisibility } from "@/ember-bridge/EmberBridge";
import AppSidebar from "./app-sidebar";
import { MobileNavBar } from "./app-sidebar/MobileNavBar";
import ContributorProfileMenu from "./app-sidebar/ContributorProfileMenu";

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
            <div className="relative h-screen bg-background">
                <main className="h-full overflow-auto">{children}</main>
                <div className="fixed bottom-6 left-6 z-50">
                    <ContributorProfileMenu />
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider open={!!currentUser && sidebarVisible}>
            <AppSidebar />
            <SidebarInset className="bg-background">
                <main className="flex-1">{children}</main>
                <MobileNavBar />
            </SidebarInset>
        </SidebarProvider>
    );
}
