import validator from 'validator';
import {useSortableIndexedList} from '@tryghost/admin-x-design-system';

export const NAVIGATION_ITEM_VISIBILITY = ['public', 'members', 'paid', 'public_free', 'public_paid', 'public_only', 'free_members', 'none'] as const;
export type NavigationItemVisibility = typeof NAVIGATION_ITEM_VISIBILITY[number];

export type NavigationItem = {
    label: string;
    url: string;
    icon?: string;
    visibility?: NavigationItemVisibility;
}

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
    const hasTextValue = (value?: string) => Boolean(value && !value.match(/^\s*$/));
    const hasNewItem = (newItem: NavigationItem) => Boolean(hasTextValue(newItem.label) || newItem.url !== '/' || hasTextValue(newItem.icon));
    const normalizeItem = (item: NavigationItem) => ({
        ...item,
        icon: item.icon || '',
        visibility: item.visibility || 'public',
        errors: {}
    });
    const serializeItem = ({url, label, icon, visibility}: NavigationItem): NavigationItem => ({
        url: url.trim(),
        label: label.trim(),
        ...(icon?.trim() ? {icon: icon.trim()} : {}),
        ...(visibility && visibility !== 'public' ? {visibility} : {})
    });

    const list = useSortableIndexedList<Omit<EditableItem, 'id'>>({
        items: items.map(normalizeItem),
        setItems: newItems => setItems(newItems.map(serializeItem)),
        blank: {url: '/', label: '', icon: '', visibility: 'public', errors: {}},
        canAddNewItem: hasNewItem
    });

    const urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9-]+:)/);
    const validateItem = (item: NavigationItem) => {
        const errors: NavigationItemErrors = {};
        const hasLabel = hasTextValue(item.label);
        const hasIcon = hasTextValue(item.icon);

        if (!hasLabel && !hasIcon) {
            errors.label = 'You must specify a label or icon';
        }

        if (!item.url || item.url.match(/\s/) || (!validator.isURL(item.url, {require_protocol: true}) && !item.url.match(urlRegex))) {
            errors.url = 'You must specify a valid URL or relative path';
        }

        if (item.visibility && !NAVIGATION_ITEM_VISIBILITY.includes(item.visibility)) {
            errors.visibility = 'You must specify a valid visibility';
        }

        return errors;
    };

    const mergeItemUpdates = (currentItem: Omit<EditableItem, 'id'>, item: Partial<NavigationItem>): Omit<EditableItem, 'id'> => {
        const errors = {...currentItem.errors};

        if (hasTextValue(item.icon)) {
            errors.icon = undefined;
            errors.label = undefined;
        }

        return {...currentItem, ...item, errors};
    };

    const updateItem = (id: string, item: Partial<NavigationItem>) => {
        const currentItem = list.items.find(current => current.id === id)!;
        list.updateItem(id, mergeItemUpdates(currentItem.item, item));
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
        setNewItem: item => list.setNewItem(mergeItemUpdates(list.newItem, item)),

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
