import {arrayMove} from '@dnd-kit/sortable';
import {useState} from 'react';

export type SortableIndexedList<Item> = {
    items: Array<{ item: Item; id: string }>;
    updateItem: (id: string, item: Item) => void;
    addItem: (item: Item) => void;
    removeItem: (id: string) => void;
    moveItem: (activeId: string, overId?: string) => void;
}

const useSortableIndexedList = <Item extends unknown>({items, setItems}: {
    items: Item[];
    setItems: (newItems: Item[]) => void;
}): SortableIndexedList<Item> => {
    // Copy items to a local state we can reorder without changing IDs, so that drag and drop animations work nicely
    const [editableItems, setEditableItems] = useState<Array<{ item: Item; id: string }>>(items.map((item, index) => ({item, id: index.toString()})));

    const updateItem = (id: string, item: Item) => {
        const updatedItems = editableItems.map(current => (current.id === id ? {...current, item} : current));
        setEditableItems(updatedItems);
        setItems(updatedItems.map(updatedItem => updatedItem.item));
    };

    const addItem = (item: Item) => {
        const maxId = editableItems.reduce((max, current) => Math.max(max, parseInt(current.id)), 0);
        const updatedItems = editableItems.concat({item, id: (maxId + 1).toString()});
        setEditableItems(updatedItems);
        setItems(updatedItems.map(updatedItem => updatedItem.item));
    };

    const removeItem = (id: string) => {
        const updatedItems = editableItems.filter(item => item.id !== id);
        setEditableItems(updatedItems);
        setItems(updatedItems.map(updatedItem => updatedItem.item));
    };

    const moveItem = (activeId: string, overId?: string) => {
        if (activeId !== overId) {
            const fromIndex = editableItems.findIndex(item => item.id === activeId);
            const toIndex = overId ? editableItems.findIndex(item => item.id === overId) : 0;
            const updatedItems = arrayMove(editableItems, fromIndex, toIndex);
            setEditableItems(updatedItems);
            setItems(updatedItems.map(updatedItem => updatedItem.item));
        }
    };

    return {
        items: editableItems,

        updateItem,
        addItem,
        removeItem,
        moveItem
    };
};

export default useSortableIndexedList;
