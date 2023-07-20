import useSortableIndexedList from '../useSortableIndexedList';
import validator from 'validator';

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
    const hasNewItem = (newItem: NavigationItem) => Boolean((newItem.label && !newItem.label.match(/^\s*$/)) || newItem.url !== '/');

    const list = useSortableIndexedList<Omit<EditableItem, 'id'>>({
        items: items.map(item => ({...item, errors: {}})),
        setItems: newItems => setItems(newItems.map(({url, label}) => ({url, label}))),
        blank: {label: '', url: '/', errors: {}},
        canAddNewItem: hasNewItem
    });

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
        const errors = validateItem(list.newItem);

        if (Object.values(errors).some(message => message)) {
            list.setNewItem({...list.newItem, errors});
        } else {
            list.addItem();
        }
    };

    const removeItem = (id: string) => {
        list.removeItem(id);
    };

    const moveItem = (activeId: string, overId?: string) => {
        list.moveItem(activeId, overId);
    };

    const newItemId = 'new';

    const clearError = (id: string, key: keyof NavigationItem) => {
        if (id === newItemId) {
            list.setNewItem({...list.newItem, errors: {...list.newItem.errors, [key]: undefined}});
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

        newItem: {...list.newItem, id: newItemId},
        setNewItem: item => list.setNewItem({...list.newItem, ...item}),

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

            if (hasNewItem(list.newItem)) {
                const newItemErrors = validateItem(list.newItem);

                if (Object.values(newItemErrors).some(message => message)) {
                    isValid = false;
                    list.setNewItem({...list.newItem, errors: newItemErrors});
                }
            }

            return isValid;
        }
    };
};

export default useNavigationEditor;
