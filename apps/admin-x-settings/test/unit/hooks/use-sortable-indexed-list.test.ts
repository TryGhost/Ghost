import assert from 'node:assert/strict';
import useSortableIndexedList from '@src/hooks/use-sortable-indexed-list';
import {act, renderHook} from '@testing-library/react';
import {describe, it, vi} from 'vitest';

describe('useSortableIndexedList', () => {
    // Mock initial items and blank item
    const initialItems = [{name: 'Item 1'}, {name: 'Item 2'}];
    const blankItem = {name: ''};

    // Mock canAddNewItem function
    const canAddNewItem = (item: { name: string }) => !!item.name;

    it('should initialize with the given items', () => {
        const setItems = vi.fn();

        const {result} = renderHook(() => useSortableIndexedList({
            items: initialItems,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        // Assert initial items setup correctly
        assert.deepEqual(result.current.items, initialItems.map((item, index) => ({item, id: index.toString()})));
    });

    it('should add a new item', () => {
        let items = initialItems;
        const setItems = (newItems: {name: string}[]) => {
            items = newItems;
        };

        const {result} = renderHook(() => useSortableIndexedList({
            items,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        act(() => {
            result.current.setNewItem({name: 'New Item'});
            result.current.addItem();
        });

        // Assert items updated correctly after adding new item
        assert.deepEqual(items, [...initialItems, {name: 'New Item'}]);
    });

    it('should update an item', () => {
        let items = initialItems;
        const setItems = (newItems: {name: string}[]) => {
            items = newItems;
        };

        const {result} = renderHook(() => useSortableIndexedList({
            items,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        act(() => {
            result.current.updateItem('0', {name: 'Updated Item 1'});
        });

        // Assert item updated correctly
        assert.deepEqual(items[0], {name: 'Updated Item 1'});
    });

    it('should remove an item', () => {
        let items = initialItems;
        const setItems = (newItems: {name: string}[]) => {
            items = newItems;
        };

        const {result} = renderHook(() => useSortableIndexedList({
            items,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        act(() => {
            result.current.removeItem('0');
        });

        // Assert item removed correctly
        assert.deepEqual(items, [initialItems[1]]);
    });

    it('should move an item', () => {
        let items = initialItems;
        const setItems = (newItems: {name: string}[]) => {
            items = newItems;
        };

        const {result} = renderHook(() => useSortableIndexedList({
            items,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        act(() => {
            result.current.moveItem('0', '1');
        });

        // Assert item moved correctly
        assert.deepEqual(items, [initialItems[1], initialItems[0]]);
    });

    it('should not setItems for deeply equal items regardless of property order', () => {
        const setItems = vi.fn();
        const initialItem = [{name: 'Item 1', url: 'http://example.com'}];
        const blankItem1 = {name: '', url: ''};

        const {rerender} = renderHook(
            // eslint-disable-next-line
            ({items, setItems}) => useSortableIndexedList({
                items,
                setItems,
                blank: blankItem1,
                canAddNewItem
            }),
            {
                initialProps: {
                    items: initialItem,
                    setItems
                }
            }
        );

        assert.equal(setItems.mock.calls.length, 0);

        // Re-render with items in different order but same content
        rerender({
            items: [{url: 'http://example.com', name: 'Item 1'}],
            setItems
        });

        // Expect no additional calls because the items are deeply equal
        assert.equal(setItems.mock.calls.length, 0);
    });
});
