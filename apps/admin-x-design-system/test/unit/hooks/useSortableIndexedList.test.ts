import {expect} from 'chai';
import {renderHook, act} from '@testing-library/react-hooks';
import useSortableIndexedList from '../../../src/hooks/useSortableIndexedList';

describe('useSortableIndexedList', function () {
    const initialItems = [{name: 'Item 1'}, {name: 'Item 2'}];
    const blankItem = {name: ''};

    const canAddNewItem = item => !!item.name;

    it('should initialize with the given items', function () {
        const {result} = renderHook(() => useSortableIndexedList({
            items: initialItems,
            setItems: () => {},
            blank: blankItem,
            canAddNewItem
        })
        );

        expect(result.current.items).to.deep.equal(
            initialItems.map((item, index) => ({item, id: index.toString()}))
        );
    });

    it('should add a new item', function () {
        let items = initialItems;
        const setItems = (newItems) => {
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

        expect(items).to.deep.equal([...initialItems, {name: 'New Item'}]);
    });

    it('should update an item', function () {
        let items = initialItems;
        const setItems = (newItems) => {
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

        expect(items[0]).to.deep.equal({name: 'Updated Item 1'});
    });

    it('should remove an item', function () {
        let items = initialItems;
        const setItems = (newItems) => {
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

        expect(items).to.deep.equal([initialItems[1]]);
    });

    it('should move an item', function () {
        let items = initialItems;
        const setItems = (newItems) => {
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

        expect(items).to.deep.equal([initialItems[1], initialItems[0]]);
    });
});
