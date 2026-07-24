import validator from "validator";
import { arrayMove } from "@dnd-kit/sortable";
import { dequal } from "dequal";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Navigation list editing state, ported from the legacy
 * hooks/site/use-navigation-editor.tsx with the old-DS
 * useSortableIndexedList folded in: index-keyed items for stable drag ids,
 * a pending "new item" row that joins the saved list once filled, and the
 * label/URL validation the suites assert on.
 */

export type NavigationItem = {
    label: string;
    url: string;
};

export type NavigationItemErrors = { [key in keyof NavigationItem]?: string };
export type EditableItem = NavigationItem & { id: string; errors: NavigationItemErrors };

type IndexedItem = { item: Omit<EditableItem, "id">; id: string };

const hasNewItem = (newItem: Omit<EditableItem, "id">): boolean => Boolean((newItem.label && !newItem.label.match(/^\s*$/)) || newItem.url !== "/");

export type NavigationEditor = {
    items: EditableItem[];
    updateItem: (id: string, item: Partial<NavigationItem>) => void;
    addItem: () => void;
    removeItem: (id: string) => void;
    moveItem: (activeId: string, overId?: string) => void;
    newItem: EditableItem;
    setNewItem: (item: Partial<NavigationItem>) => void;
    clearError: (id: string, key: keyof NavigationItem) => void;
    validate: () => boolean;
};

const blankItem: Omit<EditableItem, "id"> = { url: "/", label: "", errors: {} };

const urlRegex = /^(\/|#|[a-zA-Z0-9-]+:)/;

const validateItem = (item: NavigationItem): NavigationItemErrors => {
    const errors: NavigationItemErrors = {};

    if (!item.label || item.label.match(/^\s*$/)) {
        errors.label = "You must specify a label";
    }

    if (!item.url || item.url.match(/\s/) || (!validator.isURL(item.url, { require_protocol: true }) && !item.url.match(urlRegex))) {
        errors.url = "You must specify a valid URL or relative path";
    }

    return errors;
};

export function useNavigationEditor({ items, setItems }: {
    items: NavigationItem[];
    setItems: (newItems: NavigationItem[]) => void;
}): NavigationEditor {
    // Local index-keyed copy so drag reordering keeps stable ids.
    const [editableItems, setEditableItems] = useState<IndexedItem[]>(
        items.map((item, index) => ({ item: { ...item, errors: {} }, id: index.toString() })),
    );
    const [newItem, setNewItemState] = useState<Omit<EditableItem, "id">>(blankItem);

    const toNavigationItems = useCallback((indexed: IndexedItem[], pending: Omit<EditableItem, "id">): NavigationItem[] => {
        const all = indexed.map(({ item: { url, label } }) => ({ url, label }));
        if (hasNewItem(pending)) {
            all.push({ url: pending.url, label: pending.label });
        }
        return all;
    }, []);

    // A pending new-item row counts as part of the list the moment it's
    // filled, so typing into it marks the settings form dirty (the legacy
    // useSortableIndexedList sync effect).
    useEffect(() => {
        const allItems = toNavigationItems(editableItems, newItem);
        if (!dequal(allItems, items)) {
            setItems(allItems);
        }
    }, [editableItems, newItem, items, setItems, toNavigationItems]);

    const commit = (indexed: IndexedItem[], pending: Omit<EditableItem, "id"> = newItem) => {
        setEditableItems(indexed);
        setItems(toNavigationItems(indexed, pending));
    };

    const updateItem = (id: string, updates: Partial<NavigationItem>) => {
        commit(editableItems.map((current) => (current.id === id ? { ...current, item: { ...current.item, ...updates } } : current)));
    };

    const setNewItem = (updates: Partial<NavigationItem>) => {
        setNewItemState((current) => ({ ...current, ...updates }));
    };

    const addItem = () => {
        const errors = validateItem(newItem);

        if (Object.values(errors).some((message) => message)) {
            setNewItemState({ ...newItem, errors });
            return;
        }

        if (hasNewItem(newItem)) {
            const maxId = editableItems.reduce((max, current) => Math.max(max, parseInt(current.id)), 0);
            const updatedItems = editableItems.concat({ item: newItem, id: (maxId + 1).toString() });
            setNewItemState(blankItem);
            commit(updatedItems, blankItem);
        }
    };

    const removeItem = (id: string) => {
        commit(editableItems.filter((item) => item.id !== id));
    };

    const moveItem = (activeId: string, overId?: string) => {
        if (activeId !== overId) {
            const fromIndex = editableItems.findIndex((item) => item.id === activeId);
            const toIndex = overId ? editableItems.findIndex((item) => item.id === overId) : 0;
            commit(arrayMove(editableItems, fromIndex, toIndex));
        }
    };

    const newItemId = "new";

    const clearError = (id: string, key: keyof NavigationItem) => {
        if (id === newItemId) {
            setNewItemState((current) => ({ ...current, errors: { ...current.errors, [key]: undefined } }));
        } else {
            setEditableItems((current) => current.map((entry) => (
                entry.id === id ? { ...entry, item: { ...entry.item, errors: { ...entry.item.errors, [key]: undefined } } } : entry
            )));
        }
    };

    const editorItems = useMemo(() => editableItems.map(({ item, id }) => ({ ...item, id })), [editableItems]);

    return {
        items: editorItems,

        updateItem,
        addItem,
        removeItem,
        moveItem,

        newItem: { ...newItem, id: newItemId },
        setNewItem,

        clearError,
        validate: () => {
            let isValid = true;

            const validated = editableItems.map((entry) => {
                const errors = validateItem(entry.item);
                if (Object.values(errors).some((message) => message)) {
                    isValid = false;
                    return { ...entry, item: { ...entry.item, errors } };
                }
                return entry;
            });

            if (!isValid) {
                setEditableItems(validated);
            }

            if (hasNewItem(newItem)) {
                const newItemErrors = validateItem(newItem);

                if (Object.values(newItemErrors).some((message) => message)) {
                    isValid = false;
                    setNewItemState({ ...newItem, errors: newItemErrors });
                }
            }

            return isValid;
        },
    };
}
