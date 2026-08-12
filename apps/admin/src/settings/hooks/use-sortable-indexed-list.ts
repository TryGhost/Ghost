import { arrayMove } from '@dnd-kit/sortable';
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

const stableStringify = (value: unknown) =>
  JSON.stringify(value, (_key, nestedValue: unknown) => {
    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      return Object.keys(nestedValue)
        .sort()
        .reduce<Record<string, unknown>>((sorted, key) => {
          sorted[key] = (nestedValue as Record<string, unknown>)[key];
          return sorted;
        }, {});
    }
    return nestedValue;
  });

export type SortableIndexedList<Item> = {
  items: Array<{ item: Item; id: string }>;
  /**
   * Accepts a plain value or an updater. Use the updater form when several
   * updates can land in one event (commit a URL, then clear its error) —
   * plain values built from the render snapshot would each revert the other.
   */
  updateItem: (id: string, item: Item | ((current: Item) => Item)) => void;
  /**
   * `overrides` are merged over the current new item. Pass them when the
   * caller already knows a field's value but the state update carrying it
   * hasn't flushed yet — e.g. committing an input and submitting in one event.
   */
  addItem: (overrides?: Partial<Item>) => void;
  removeItem: (id: string) => void;
  moveItem: (activeId: string, overId?: string) => void;
  newItem: Item;
  setNewItem: Dispatch<SetStateAction<Item>>;
};

const useSortableIndexedList = <Item>({
  items,
  setItems,
  blank,
  canAddNewItem,
}: {
  items: Item[];
  setItems: (newItems: Item[]) => void;
  blank: Item;
  canAddNewItem: (item: Item) => boolean;
}): SortableIndexedList<Item> => {
  // Copy items to a local state we can reorder without changing IDs, so that drag and drop animations work nicely
  const [editableItems, setEditableItemsState] = useState<Array<{ item: Item; id: string }>>(
    items.map((item, index) => ({ item, id: index.toString() })),
  );

  // Mirror of `editableItems` that is readable in the same event it was
  // written, so consecutive mutations in one event build on each other
  // instead of on the shared pre-event render snapshot
  const editableItemsRef = useRef(editableItems);
  const setEditableItems = (nextItems: Array<{ item: Item; id: string }>) => {
    editableItemsRef.current = nextItems;
    setEditableItemsState(nextItems);
  };

  const [newItem, setNewItem] = useState<Item>(blank);

  useEffect(() => {
    const allItems = editableItems.map(({ item }) => item);

    // If the user is adding a new item, save the new item if the form is saved
    if (canAddNewItem(newItem)) {
      allItems.push(newItem);
    }

    if (stableStringify(allItems) !== stableStringify(items)) {
      setItems(allItems);
    }
  }, [editableItems, newItem, items, setItems, canAddNewItem]);

  const updateItem = (id: string, item: Item | ((current: Item) => Item)) => {
    const updatedItems = editableItemsRef.current.map((current) => {
      if (current.id !== id) {
        return current;
      }
      return {
        ...current,
        item: typeof item === 'function' ? (item as (value: Item) => Item)(current.item) : item,
      };
    });
    setEditableItems(updatedItems);
    setItems(updatedItems.map((updatedItem) => updatedItem.item));
  };

  const addItem = (overrides?: Partial<Item>) => {
    const item = overrides ? { ...newItem, ...overrides } : newItem;

    if (canAddNewItem(item)) {
      const currentItems = editableItemsRef.current;
      const maxId = currentItems.reduce((max, current) => Math.max(max, parseInt(current.id)), 0);
      const updatedItems = currentItems.concat({ item, id: (maxId + 1).toString() });
      setEditableItems(updatedItems);
      setItems(updatedItems.map((updatedItem) => updatedItem.item));
      setNewItem(blank);
    }
  };

  const removeItem = (id: string) => {
    const updatedItems = editableItemsRef.current.filter((item) => item.id !== id);
    setEditableItems(updatedItems);
    setItems(updatedItems.map((updatedItem) => updatedItem.item));
  };

  const moveItem = (activeId: string, overId?: string) => {
    if (activeId !== overId) {
      const currentItems = editableItemsRef.current;
      const fromIndex = currentItems.findIndex((item) => item.id === activeId);
      const toIndex = overId ? currentItems.findIndex((item) => item.id === overId) : 0;
      const updatedItems = arrayMove(currentItems, fromIndex, toIndex);
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
};

export default useSortableIndexedList;
