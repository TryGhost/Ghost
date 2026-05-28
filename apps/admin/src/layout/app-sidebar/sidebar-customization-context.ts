import React from "react";

export type SidebarCustomizationItem = {
    id: string;
    label: string;
};

export type SidebarCustomizationContextValue = {
    closeContextMenus: () => void;
    items: SidebarCustomizationItem[];
    openContextMenu: (event: React.MouseEvent) => void;
    openItemContextMenu: (event: React.MouseEvent, item: SidebarCustomizationItem) => void;
    registerItem: (item: SidebarCustomizationItem) => () => void;
};

export const SidebarCustomizationContext = React.createContext<SidebarCustomizationContextValue | null>(null);

export function useSidebarCustomizationContext() {
    const context = React.useContext(SidebarCustomizationContext);

    if (!context) {
        throw new Error("Sidebar customization components must be used within SidebarCustomizationProvider");
    }

    return context;
}
