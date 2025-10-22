import React from "react";
import {
    SidebarInset,
    SidebarProvider,
} from "@tryghost/shade";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import AppSidebar from "./app-sidebar";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { data: currentUser } = useCurrentUser();

    return (
        <SidebarProvider open={!!currentUser}>
            <AppSidebar />
            <SidebarInset className="bg-white">
                <main className="flex-1 min-h-screen">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
