import useSortableIndexedList from '@/settings/hooks/use-sortable-indexed-list';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('useSortableIndexedList', () => {
  // Mock initial items and blank item
  const initialItems = [{ name: 'Item 1' }, { name: 'Item 2' }];
  const blankItem = { name: '' };

  // Mock canAddNewItem function
  const canAddNewItem = (item: { name: string }) => !!item.name;

  it('should initialize with the given items', () => {
    const setItems = vi.fn();

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items: initialItems,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    // Assert initial items setup correctly
    expect(result.current.items).toStrictEqual(
      initialItems.map((item, index) => ({ item, id: index.toString() })),
    );
  });

  it('should add a new item', () => {
    let items = initialItems;
    const setItems = (newItems: { name: string }[]) => {
      items = newItems;
    };

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    act(() => {
      result.current.setNewItem({ name: 'New Item' });
      result.current.addItem();
    });

    // Assert items updated correctly after adding new item
    expect(items).toStrictEqual([...initialItems, { name: 'New Item' }]);
  });

  it('should update an item', () => {
    let items = initialItems;
    const setItems = (newItems: { name: string }[]) => {
      items = newItems;
    };

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    act(() => {
      result.current.updateItem('0', { name: 'Updated Item 1' });
    });

    // Assert item updated correctly
    expect(items[0]).toStrictEqual({ name: 'Updated Item 1' });
  });

  it('builds consecutive updates in one event on each other', () => {
    let items = initialItems;
    const setItems = (newItems: { name: string }[]) => {
      items = newItems;
    };

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    // Like saving a URL and clearing its error in one event: the second
    // update has to see the first
    act(() => {
      result.current.updateItem('0', { name: 'Committed' });
      result.current.updateItem('0', (current) => ({ name: `${current.name}!` }));
    });

    expect(items[0]).toStrictEqual({ name: 'Committed!' });
  });

  it('should remove an item', () => {
    let items = initialItems;
    const setItems = (newItems: { name: string }[]) => {
      items = newItems;
    };

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    act(() => {
      result.current.removeItem('0');
    });

    // Assert item removed correctly
    expect(items).toStrictEqual([initialItems[1]]);
  });

  it('should move an item', () => {
    let items = initialItems;
    const setItems = (newItems: { name: string }[]) => {
      items = newItems;
    };

    const { result } = renderHook(() =>
      useSortableIndexedList({
        items,
        setItems,
        blank: blankItem,
        canAddNewItem,
      }),
    );

    act(() => {
      result.current.moveItem('0', '1');
    });

    // Assert item moved correctly
    expect(items).toStrictEqual([initialItems[1], initialItems[0]]);
  });

  it('should not setItems for deeply equal items regardless of property order', () => {
    const setItems = vi.fn();
    const initialItem = [{ name: 'Item 1', url: 'http://example.com' }];
    const blankItem1 = { name: '', url: '' };

    const { rerender } = renderHook(
      // eslint-disable-next-line
      ({ items, setItems }) =>
        useSortableIndexedList({
          items,
          setItems,
          blank: blankItem1,
          canAddNewItem,
        }),
      {
        initialProps: {
          items: initialItem,
          setItems,
        },
      },
    );

    expect(setItems.mock.calls.length).toBe(0);

    // Re-render with items in different order but same content
    rerender({
      items: [{ url: 'http://example.com', name: 'Item 1' }],
      setItems,
    });

    // Expect no additional calls because the items are deeply equal
    expect(setItems.mock.calls.length).toBe(0);
  });
});
