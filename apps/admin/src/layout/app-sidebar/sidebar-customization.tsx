import React from "react";

import {LucideIcon} from "@tryghost/shade/utils";
import {useNavigationItemVisibility, useToggleNavigationItemVisibility} from "./hooks/use-navigation-preferences";
import {SidebarCustomizationContext, type SidebarCustomizationItem, useSidebarCustomizationContext} from "./sidebar-customization-context";

const MENU_SEPARATOR_AFTER_ITEM_IDS = new Set(['view-site']);

function SidebarCustomizationProvider({children}: {children: React.ReactNode}) {
    const [items, setItems] = React.useState<SidebarCustomizationItem[]>([]);
    const [contextMenuPosition, setContextMenuPosition] = React.useState<{x: number; y: number} | null>(null);
    const [itemContextMenu, setItemContextMenu] = React.useState<({x: number; y: number} & SidebarCustomizationItem) | null>(null);
    const itemOrder = React.useRef(new Map<string, number>());
    const nextItemOrder = React.useRef(0);

    const closeContextMenus = React.useCallback(() => {
        setContextMenuPosition(null);
        setItemContextMenu(null);
    }, []);

    const registerItem = React.useCallback((item: SidebarCustomizationItem) => {
        if (!itemOrder.current.has(item.id)) {
            itemOrder.current.set(item.id, nextItemOrder.current);
            nextItemOrder.current += 1;
        }

        setItems(currentItems => {
            const existingItem = currentItems.find(currentItem => currentItem.id === item.id);

            if (!existingItem) {
                return [...currentItems, item].sort((firstItem, secondItem) => {
                    return (itemOrder.current.get(firstItem.id) ?? 0) - (itemOrder.current.get(secondItem.id) ?? 0);
                });
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
        setItemContextMenu(null);
        setContextMenuPosition({x: event.clientX, y: event.clientY});
    }, []);

    const openItemContextMenu = React.useCallback((event: React.MouseEvent, item: SidebarCustomizationItem) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenuPosition(null);
        setItemContextMenu({x: event.clientX, y: event.clientY, ...item});
    }, []);

    React.useEffect(() => {
        if (!contextMenuPosition && !itemContextMenu) {
            return;
        }

        const closeContextMenuOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeContextMenus();
            }
        };

        document.addEventListener("click", closeContextMenus);
        document.addEventListener("keydown", closeContextMenuOnEscape);

        return () => {
            document.removeEventListener("click", closeContextMenus);
            document.removeEventListener("keydown", closeContextMenuOnEscape);
        };
    }, [closeContextMenus, contextMenuPosition, itemContextMenu]);

    const value = React.useMemo(() => ({
        closeContextMenus,
        items,
        openContextMenu,
        openItemContextMenu,
        registerItem,
    }), [closeContextMenus, items, openContextMenu, openItemContextMenu, registerItem]);

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
                        <React.Fragment key={item.id}>
                            <SidebarCustomizationMenuItem item={item} />
                            {MENU_SEPARATOR_AFTER_ITEM_IDS.has(item.id) && (
                                <div className="-mx-1 my-1 h-px bg-border" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}
            {itemContextMenu && (
                <SidebarItemContextMenu item={itemContextMenu} />
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

function SidebarItemContextMenu({item}: {item: {x: number; y: number} & SidebarCustomizationItem}) {
    const setItemVisible = useToggleNavigationItemVisibility();
    const {closeContextMenus} = useSidebarCustomizationContext();

    return (
        <div
            className="fixed z-50 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            style={{left: item.x, top: item.y}}
            onClick={event => event.stopPropagation()}
        >
            <button
                className="flex w-full cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent focus:bg-accent"
                type="button"
                onClick={() => {
                    void setItemVisible(item.id, false);
                    closeContextMenus();
                }}
            >
                Hide from sidebar
            </button>
        </div>
    );
}

function RegisterHideableSidebarItem({id, label}: SidebarCustomizationItem) {
    const {registerItem} = useSidebarCustomizationContext();

    React.useEffect(() => {
        return registerItem({id, label});
    }, [id, label, registerItem]);

    return null;
}

function HideableSidebarItem({children, id, label}: SidebarCustomizationItem & {children: React.ReactNode}) {
    const visible = useNavigationItemVisibility(id);
    const {openItemContextMenu} = useSidebarCustomizationContext();

    if (!visible) {
        return <RegisterHideableSidebarItem id={id} label={label} />;
    }

    const child = React.Children.only(children);

    if (!React.isValidElement<React.HTMLAttributes<HTMLElement>>(child)) {
        return (
            <>
                <RegisterHideableSidebarItem id={id} label={label} />
                {children}
            </>
        );
    }

    return (
        <>
            <RegisterHideableSidebarItem id={id} label={label} />
            {React.cloneElement(child, {
                onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
                    child.props.onContextMenu?.(event);

                    if (!event.defaultPrevented) {
                        openItemContextMenu(event, {id, label});
                    }
                },
            })}
        </>
    );
}

export {
    HideableSidebarItem,
    RegisterHideableSidebarItem,
    SidebarCustomizationProvider
};
