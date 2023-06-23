import validator from 'validator';
import {arrayMove} from '@dnd-kit/sortable';
import {useEffect, useState} from 'react';

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
    // Copy items to a local state we can reorder without changing IDs, so that drag and drop animations work nicely
    const [editableItems, setEditableItems] = useState<EditableItem[]>(items.map((item, index) => ({...item, id: index.toString(), errors: {}})));
    const [newItem, setNewItem] = useState<EditableItem>({label: '', url: '/', id: 'new', errors: {}});

    const isEditingNewItem = Boolean((newItem.label && !newItem.label.match(/^\s*$/)) || newItem.url !== '/');

    useEffect(() => {
        const allItems = editableItems.map(({url, label}) => ({url, label}));

        // If the user is adding a new item, save the new item if the form is saved
        if (isEditingNewItem) {
            allItems.push({url: newItem.url, label: newItem.label});
        }

        if (JSON.stringify(allItems) !== JSON.stringify(items)) {
            setItems(allItems);
        }
    }, [editableItems, newItem, isEditingNewItem, items, setItems]);

    const urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9-]+:)/);

    const validateItem = (item: EditableItem) => {
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
        setEditableItems(editableItems.map(current => (current.id === id ? {...current, ...item} : current)));
    };

    const addItem = () => {
        const errors = validateItem(newItem);

        if (Object.values(errors).some(message => message)) {
            setNewItem({...newItem, errors});
        } else {
            setEditableItems(editableItems.concat({...newItem, id: editableItems.length.toString(), errors: {}}));
            setNewItem({label: '', url: '/', id: 'new', errors: {}});
        }
    };

    const removeItem = (id: string) => {
        setEditableItems(editableItems.filter(item => item.id !== id));
    };

    const moveItem = (activeId: string, overId?: string) => {
        if (activeId !== overId) {
            const fromIndex = editableItems.findIndex(item => item.id === activeId);
            const toIndex = overId ? editableItems.findIndex(item => item.id === overId) : 0;
            setEditableItems(arrayMove(editableItems, fromIndex, toIndex));
        }
    };

    const clearError = (id: string, key: keyof NavigationItem) => {
        if (id === newItem.id) {
            setNewItem({...newItem, errors: {...newItem.errors, [key]: undefined}});
        } else {
            setEditableItems(editableItems.map(current => (current.id === id ? {...current, errors: {...current.errors, [key]: undefined}} : current)));
        }
    };

    return {
        items: editableItems,

        updateItem,
        addItem,
        removeItem,
        moveItem,

        newItem,
        setNewItem: item => setNewItem({...newItem, ...item}),

        clearError,
        validate: () => {
            const errors: { [id: string]: NavigationItemErrors } = {};

            editableItems.forEach((item) => {
                errors[item.id] = validateItem(item);
            });

            if (isEditingNewItem) {
                errors[newItem.id] = validateItem(newItem);
            }

            if (Object.values(errors).some(error => Object.values(error).some(message => message))) {
                setEditableItems(editableItems.map(item => ({...item, errors: errors[item.id] || {}})));
                setNewItem({...newItem, errors: errors[newItem.id] || {}});
                return false;
            }

            return true;
        }
    };
};

export default useNavigationEditor;
