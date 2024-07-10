import {expect} from 'chai';
import {renderHook, act} from '@testing-library/react-hooks';
import useSortableIndexedList from '../../../src/hooks/useSortableIndexedList';
import sinon from 'sinon';

describe('useSortableIndexedList', function () {
    // Mock initial items and blank item
    const initialItems = [{name: 'Item 1'}, {name: 'Item 2'}];
    const blankItem = {name: ''};

    // Mock canAddNewItem function
    const canAddNewItem = (item: { name: string }) => !!item.name;

    it('should initialize with the given items', function () {
        const setItems = sinon.spy();

        const {result} = renderHook(() => useSortableIndexedList({
            items: initialItems,
            setItems,
            blank: blankItem,
            canAddNewItem
        })
        );

        // Assert initial items setup correctly
        expect(result.current.items).to.deep.equal(initialItems.map((item, index) => ({item, id: index.toString()})));
    });

    it('should add a new item', function () {
        let items = initialItems;
        const setItems = (newItems: any[]) => {
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
        expect(items).to.deep.equal([...initialItems, {name: 'New Item'}]);
    });

    it('should update an item', function () {
        let items = initialItems;
        const setItems = (newItems: any[]) => {
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
        expect(items[0]).to.deep.equal({name: 'Updated Item 1'});
    });

    it('should remove an item', function () {
        let items = initialItems;
        const setItems = (newItems: any[]) => {
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
        expect(items).to.deep.equal([initialItems[1]]);
    });

    it('should move an item', function () {
        let items = initialItems;
        const setItems = (newItems: any[]) => {
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
        expect(items).to.deep.equal([initialItems[1], initialItems[0]]);
    });

    it('should not setItems for deeply equal items regardless of property order', function () {
        const setItems = sinon.spy();
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

        expect(setItems.callCount).to.equal(0);

        // Re-render with items in different order but same content
        rerender({
            items: [{url: 'http://example.com', name: 'Item 1'}],
            setItems
        });

        // Expect no additional calls because the items are deeply equal
        expect(setItems.callCount).to.equal(0);
    });
});
