import {arrayMove} from '@dnd-kit/sortable';
import {useEffect, useState} from 'react';
import _ from 'lodash';

export type SortableIndexedList<Item> = {
    items: Array<{ item: Item; id: string }>;
    updateItem: (id: string, item: Item) => void;
    addItem: () => void;
    removeItem: (id: string) => void;
    moveItem: (activeId: string, overId?: string) => void;
    newItem: Item;
    setNewItem: (item: Item) => void;
}

// TODO: figure out if we need to extend `unknown`?
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const useSortableIndexedList = <Item extends unknown>({items, setItems, blank, canAddNewItem}: {
    items: Item[];
    setItems: (newItems: Item[]) => void;
    blank: Item
    canAddNewItem: (item: Item) => boolean
}): SortableIndexedList<Item> => {
    // Copy items to a local state we can reorder without changing IDs, so that drag and drop animations work nicely
    const [editableItems, setEditableItems] = useState<Array<{ item: Item; id: string }>>(items.map((item, index) => ({item, id: index.toString()})));

    const [newItem, setNewItem] = useState<Item>(blank);

    useEffect(() => {
        const allItems = editableItems.map(({item}) => item);

        // If the user is adding a new item, save the new item if the form is saved
        if (canAddNewItem(newItem)) {
            allItems.push(newItem);
        }

        if (!_.isEqual(JSON.parse(JSON.stringify(allItems)), JSON.parse(JSON.stringify(items)))) {
            setItems(allItems);
        }
    }, [editableItems, newItem, items, setItems, canAddNewItem]);

    const updateItem = (id: string, item: Item) => {
        const updatedItems = editableItems.map(current => (current.id === id ? {...current, item} : current));
        setEditableItems(updatedItems);
        setItems(updatedItems.map(updatedItem => updatedItem.item));
    };

    const addItem = () => {
        if (canAddNewItem(newItem)) {
            const maxId = editableItems.reduce((max, current) => Math.max(max, parseInt(current.id)), 0);
            const updatedItems = editableItems.concat({item: newItem, id: (maxId + 1).toString()});
            setEditableItems(updatedItems);
            setItems(updatedItems.map(updatedItem => updatedItem.item));
            setNewItem(blank);
        }
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
        moveItem,

        newItem,
        setNewItem
    };
};

export default useSortableIndexedList;
