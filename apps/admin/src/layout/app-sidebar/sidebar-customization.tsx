import React from "react";

import {LucideIcon} from "@tryghost/shade/utils";
import {useNavigationItemVisibility, useToggleNavigationItemVisibility} from "./hooks/use-navigation-preferences";
import {SidebarCustomizationContext, type SidebarCustomizationItem, useSidebarCustomizationContext} from "./sidebar-customization-context";

function SidebarCustomizationProvider({children}: {children: React.ReactNode}) {
    const [items, setItems] = React.useState<SidebarCustomizationItem[]>([]);
    const [contextMenuPosition, setContextMenuPosition] = React.useState<{x: number; y: number} | null>(null);

    const registerItem = React.useCallback((item: SidebarCustomizationItem) => {
        setItems(currentItems => {
            const existingItem = currentItems.find(currentItem => currentItem.id === item.id);

            if (!existingItem) {
                return [...currentItems, item];
            }

            if (existingItem.label === item.label) {
                return currentItems;
            }

            return currentItems.map(currentItem => currentItem.id === item.id ? item : currentItem);
        });

        return () => {
            setItems(currentItems => currentItems.filter(currentItem => currentItem.id !== item.id));
        };
    }, []);

    const openContextMenu = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenuPosition({x: event.clientX, y: event.clientY});
    }, []);

    React.useEffect(() => {
        if (!contextMenuPosition) {
            return;
        }

        const closeContextMenu = () => setContextMenuPosition(null);
        const closeContextMenuOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeContextMenu();
            }
        };

        document.addEventListener("click", closeContextMenu);
        document.addEventListener("keydown", closeContextMenuOnEscape);

        return () => {
            document.removeEventListener("click", closeContextMenu);
            document.removeEventListener("keydown", closeContextMenuOnEscape);
        };
    }, [contextMenuPosition]);

    const value = React.useMemo(() => ({
        items,
        openContextMenu,
        registerItem,
    }), [items, openContextMenu, registerItem]);

    return (
        <SidebarCustomizationContext.Provider value={value}>
            {children}
            {contextMenuPosition && (
                <div
                    className="fixed z-50 min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    style={{left: contextMenuPosition.x, top: contextMenuPosition.y}}
                    onClick={event => event.stopPropagation()}
                >
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Customize sidebar
                    </div>
                    {items.map(item => (
                        <SidebarCustomizationMenuItem
                            key={item.id}
                            item={item}
                        />
                    ))}
                </div>
            )}
        </SidebarCustomizationContext.Provider>
    );
}

function SidebarCustomizationMenuItem({item}: {item: SidebarCustomizationItem}) {
    const visible = useNavigationItemVisibility(item.id);
    const setItemVisible = useToggleNavigationItemVisibility();

    return (
        <button
            className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xs px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent focus:bg-accent"
            type="button"
            role="menuitemcheckbox"
            aria-checked={visible}
            onClick={() => void setItemVisible(item.id, !visible)}
        >
            <span>{item.label}</span>
            {visible && (
                <LucideIcon.Check size={16} />
            )}
        </button>
    );
}

function HideableSidebarItem({children, id, label}: SidebarCustomizationItem & {children: React.ReactNode}) {
    const visible = useNavigationItemVisibility(id);
    const {registerItem} = useSidebarCustomizationContext();

    React.useEffect(() => {
        return registerItem({id, label});
    }, [id, label, registerItem]);

    if (!visible) {
        return null;
    }

    return <>{children}</>;
}

export {
    HideableSidebarItem,
    SidebarCustomizationProvider
};
