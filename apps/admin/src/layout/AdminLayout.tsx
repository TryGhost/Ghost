import React from "react";
import {
    Button,
    LucideIcon,
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
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
            <div className="absolute flex justify-center bottom-0 w-full h-[55px] bg-sidebar bg-sidebar border-t border-sidebar-border">
                <div className="grid grid-cols-4 items-center w-full justify-items-center max-w-[330px]">
                    <Button variant="ghost" size="icon">
                        <LucideIcon.TrendingUp strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <LucideIcon.PenLine />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <LucideIcon.Users />
                    </Button>
                    <SidebarTrigger className="-ml-1">
                        <LucideIcon.Ellipsis />
                        <span className="sr-only">Toggle Sidebar</span>
                    </SidebarTrigger>
                </div>
            </div>
        </SidebarProvider>
    );
}
