import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";

/**
 * Index-keyed sortable list state, ported from the legacy old-DS
 * useSortableIndexedList for the tier benefits editor. The pending new item
 * is folded into the emitted list whenever it is addable, so saving a form
 * with an un-added benefit still includes it (the legacy contract).
 */

export interface SortableIndexedList<Item> {
    items: Array<{ item: Item; id: string }>;
    updateItem: (id: string, item: Item) => void;
    addItem: () => void;
    removeItem: (id: string) => void;
    moveItem: (activeId: string, overId?: string) => void;
    newItem: Item;
    setNewItem: (item: Item) => void;
}

export function useSortableIndexedList<Item>({ items, setItems, blank, canAddNewItem }: {
    items: Item[];
    setItems: (newItems: Item[]) => void;
    blank: Item;
    canAddNewItem: (item: Item) => boolean;
}): SortableIndexedList<Item> {
    // Copy items to a local state we can reorder without changing IDs, so
    // drag and drop animations work nicely.
    const [editableItems, setEditableItems] = useState<Array<{ item: Item; id: string }>>(
        items.map((item, index) => ({ item, id: index.toString() })),
    );
    const [newItem, setNewItem] = useState<Item>(blank);

    useEffect(() => {
        const allItems = editableItems.map(({ item }) => item);

        // If the user is typing a new item, saving the form must include it.
        if (canAddNewItem(newItem)) {
            allItems.push(newItem);
        }

        if (JSON.stringify(allItems) !== JSON.stringify(items)) {
            setItems(allItems);
        }
    }, [editableItems, newItem, items, setItems, canAddNewItem]);

    const updateItem = (id: string, item: Item) => {
        const updatedItems = editableItems.map((current) => (current.id === id ? { ...current, item } : current));
        setEditableItems(updatedItems);
        setItems(updatedItems.map((updatedItem) => updatedItem.item));
    };

    const addItem = () => {
        if (canAddNewItem(newItem)) {
            const maxId = editableItems.reduce((max, current) => Math.max(max, parseInt(current.id)), 0);
            const updatedItems = editableItems.concat({ item: newItem, id: (maxId + 1).toString() });
            setEditableItems(updatedItems);
            setItems(updatedItems.map((updatedItem) => updatedItem.item));
            setNewItem(blank);
        }
    };

    const removeItem = (id: string) => {
        const updatedItems = editableItems.filter((item) => item.id !== id);
        setEditableItems(updatedItems);
        setItems(updatedItems.map((updatedItem) => updatedItem.item));
    };

    const moveItem = (activeId: string, overId?: string) => {
        if (activeId !== overId) {
            const fromIndex = editableItems.findIndex((item) => item.id === activeId);
            const toIndex = overId ? editableItems.findIndex((item) => item.id === overId) : 0;
            const updatedItems = arrayMove(editableItems, fromIndex, toIndex);
            setEditableItems(updatedItems);
            setItems(updatedItems.map((updatedItem) => updatedItem.item));
        }
    };

    return {
        items: editableItems,
        updateItem,
        addItem,
        removeItem,
        moveItem,
        newItem,
        setNewItem,
    };
}
