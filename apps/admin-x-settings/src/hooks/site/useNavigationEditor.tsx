import useSortableIndexedList from '../useSortableIndexedList';
import validator from 'validator';
import {useCallback, useEffect, useState} from 'react';

export type NavigationItem = {
    label: string;
    url: string;
}

// eslint-disable-next-line no-unused-vars
export type NavigationItemErrors = { [key in keyof NavigationItem]?: string }
export type EditableItem = NavigationItem & { id: string; errors: NavigationItemErrors }

export type NavigationEditor = {
    items: EditableItem[]
    updateItem: (id: string, item: Partial<NavigationItem>) => void
    addItem: () => void
    removeItem: (id: string) => void
    moveItem: (activeId: string, overId?: string) => void
    newItem: EditableItem
    setNewItem: (item: Partial<NavigationItem>) => void
    clearError: (id: string, key: keyof NavigationItem) => void
    validate: () => boolean
}

const useNavigationEditor = ({items, setItems}: {
    items: NavigationItem[];
    setItems: (newItems: NavigationItem[]) => void;
}): NavigationEditor => {
    const [newItem, setNewItem] = useState<EditableItem>({label: '', url: '/', id: 'new', errors: {}});

    const isEditingNewItem = Boolean((newItem.label && !newItem.label.match(/^\s*$/)) || newItem.url !== '/');

    const setAllItems = useCallback((newItems: Array<NavigationItem>) => {
        const allItems = newItems.map(({url, label}) => ({url, label}));

        // If the user is adding a new item, save the new item if the form is saved
        if (isEditingNewItem) {
            allItems.push({url: newItem.url, label: newItem.label});
        }

        if (JSON.stringify(allItems) !== JSON.stringify(items)) {
            setItems(allItems);
        }
    }, [isEditingNewItem, items, newItem.label, newItem.url, setItems]);

    const list = useSortableIndexedList<Omit<EditableItem, 'id'>>({
        items: items.map(item => ({...item, errors: {}})),
        setItems: setAllItems
    });

    // Also make sure the list is updated when newItem or other setAllItems dependencies change
    useEffect(() => setAllItems(list.items.map(({item}) => item)), [list.items, setAllItems]);

    const urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9-]+:)/);

    const validateItem = (item: NavigationItem) => {
        const errors: NavigationItemErrors = {};

        if (!item.label || item.label.match(/^\s*$/)) {
            errors.label = 'You must specify a label';
        }

        if (!item.url || item.url.match(/\s/) || (!validator.isURL(item.url, {require_protocol: true}) && !item.url.match(urlRegex))) {
            errors.url = 'You must specify a valid URL or relative path';
        }

        return errors;
    };

    const updateItem = (id: string, item: Partial<NavigationItem>) => {
        const currentItem = list.items.find(current => current.id === id)!;
        list.updateItem(id, {...currentItem.item, ...item});
    };

    const addItem = () => {
        const errors = validateItem(newItem);

        if (Object.values(errors).some(message => message)) {
            setNewItem({...newItem, errors});
        } else {
            list.addItem(newItem);
            setNewItem({label: '', url: '/', id: 'new', errors: {}});
        }
    };

    const removeItem = (id: string) => {
        list.removeItem(id);
    };

    const moveItem = (activeId: string, overId?: string) => {
        list.moveItem(activeId, overId);
    };

    const clearError = (id: string, key: keyof NavigationItem) => {
        if (id === newItem.id) {
            setNewItem({...newItem, errors: {...newItem.errors, [key]: undefined}});
        } else {
            const currentItem = list.items.find(current => current.id === id)!.item;
            list.updateItem(id, {...currentItem, errors: {...currentItem.errors, [key]: undefined}});
        }
    };

    return {
        items: list.items.map(({item, id}) => ({...item, id})),

        updateItem,
        addItem,
        removeItem,
        moveItem,

        newItem,
        setNewItem: item => setNewItem({...newItem, ...item}),

        clearError,
        validate: () => {
            let isValid = true;

            list.items.forEach(({item, id}) => {
                let errors = validateItem(item);

                if (Object.values(errors).some(message => message)) {
                    isValid = false;
                    list.updateItem(id, {...item, errors});
                }
            });

            const newItemErrors = validateItem(newItem);

            if (Object.values(newItemErrors).some(message => message)) {
                isValid = false;
                setNewItem({...newItem, errors: newItemErrors});
            }

            return isValid;
        }
    };
};

export default useNavigationEditor;
