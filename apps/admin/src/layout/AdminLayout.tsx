import React from "react";
import {
    SidebarInset,
    SidebarProvider,
} from "@tryghost/shade";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import AppSidebar from "./app-sidebar";
import { MobileNavBar } from "./app-sidebar/MobileNavBar";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { data: currentUser } = useCurrentUser();

    return (
        <SidebarProvider open={!!currentUser}>
            <AppSidebar />
            <SidebarInset className="bg-background">
                <main className="flex-1">{children}</main>
                <MobileNavBar />
            </SidebarInset>
        </SidebarProvider>
    );
}
