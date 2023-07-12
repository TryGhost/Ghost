import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import SortableList, {SortableListProps} from './SortableList';
import clsx from 'clsx';
import {arrayMove} from '@dnd-kit/sortable';
import {useState} from 'react';

const Wrapper = (props: SortableListProps<any> & {updateArgs: (args: Partial<SortableListProps<any>>) => void}) => {
    // Seems like Storybook recreates items on every render, so we need to keep our own state
    const [items, setItems] = useState(props.items);

    return <SortableList {...props} items={items} onMove={(activeId, overId) => {
        if (activeId !== overId) {
            const fromIndex = items.findIndex(item => item.id === activeId);
            const toIndex = overId ? items.findIndex(item => item.id === overId) : 0;
            setItems(arrayMove(items, fromIndex, toIndex));
            // But still update the args so that the storybook panel updates
            props.updateArgs({items: arrayMove(items, fromIndex, toIndex)});
        }
    }} />;
};

const meta = {
    title: 'Global / List / Sortable',
    component: SortableList,
    tags: ['autodocs'],
    render: function Component(args) {
        const [, updateArgs] = useArgs();
        return <Wrapper {...args} updateArgs={updateArgs} />;
    }
} satisfies Meta<typeof SortableList>;

export default meta;
type Story = StoryObj<typeof SortableList>;

export const Default: Story = {
    args: {
        title: 'Sortable list',
        titleSeparator: true,
        items: [{id: 'first item'}, {id: 'second item'}, {id: 'third item'}],
        renderItem: item => <span className="self-center">{item.id}</span>,
        hint: 'Drag items to order'
    }
};

export const CustomContainer: Story = {
    args: {
        items: [{id: 'first item'}, {id: 'second item'}, {id: 'third item'}],
        renderItem: item => <span className="self-center">{item.id}</span>,
        container: ({setRef, isDragging, dragHandleAttributes, dragHandleListeners, style, children}) => (
            <div ref={setRef} className={clsx('mb-2 rounded border border-grey-200 p-4', isDragging && 'bg-grey-50')} style={style} {...dragHandleAttributes} {...dragHandleListeners}>
                Drag this whole row! Item: {children}
            </div>
        )
    }
};
