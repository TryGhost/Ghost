import type {Meta, StoryObj} from '@storybook/react';
import {ReactNode} from 'react';

import {useSortableIndexedList} from '..';
import SortableList, {DragIndicator, SortableItemContainerProps} from './SortableList';
import Table from './Table';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';
import * as TableRowStories from './TableRow.stories';

const meta = {
    title: 'Global / Table',
    component: Table,
    tags: ['autodocs']
} satisfies Meta<typeof Table>;

const {/*id,*/ ...tableRowProps} = TableRowStories.HiddenAction.args || {};

const tableHeader = (
    <>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
    </>
);

const tableRows = (
    <>
        <TableRow {...tableRowProps}>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow {...tableRowProps}>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow {...tableRowProps}>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow {...tableRowProps}>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow {...tableRowProps}>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
    </>
);

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
    args: {
        children: tableRows
    },
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '600px'}}>{_story()}</div>)]
};

export const WithHeader: Story = {
    args: {
        header: tableHeader,
        children: tableRows
    }
};

export const WithPageTitle: Story = {
    args: {
        pageTitle: 'This is a page title',
        children: tableRows
    }
};

export const WithRowAction: Story = {
    args: {
        header: tableHeader,
        children: tableRows
    }
};

export const WithHint: Story = {
    args: {
        header: tableHeader,
        children: tableRows,
        hint: 'This is a hint',
        hintSeparator: true
    }
};

export const Loading: Story = {
    args: {
        header: tableHeader,
        children: tableRows,
        isLoading: true,
        hint: 'This is a hint',
        hintSeparator: true
    }
};

// Components for Sortable example

const SortableContainer: React.FC<Partial<SortableItemContainerProps>> = ({setRef, isDragging, style, children, ...props}) => {
    const container = (
        <TableRow ref={setRef} className={isDragging ? 'opacity-75' : ''} style={style} hideActions>
            {(props.dragHandleAttributes || isDragging) && <TableCell className='w-10'>
                <DragIndicator className='h-5' isDragging={isDragging || false} {...props} />
            </TableCell>}
            {children}
        </TableRow>
    );

    if (isDragging) {
        return <Table>{container}</Table>;
    } else {
        return container;
    }
};

const SortableItem: React.FC<{id: string; item: string}> = ({id, item}) => {
    return (
        <>
            <TableCell className='whitespace-nowrap'>{id}.</TableCell>
            <TableCell className='w-full'>{item}</TableCell>
        </>
    );
};

const SortableTable = () => {
    const list = useSortableIndexedList({
        items: ['First', 'Second'],
        setItems: () => {},
        blank: '',
        canAddNewItem: () => false
    });

    return <SortableList
        container={props => <SortableContainer {...props} />}
        items={list.items}
        renderItem={item => <SortableItem {...item} />}
        wrapper={Table}
        onMove={list.moveItem}
    />;
};

/**
 * Example of combining Table and SortableList to create a sortable table.
 * This is a little complex as each type of container/item needs to be overridden
 * to end up with the correct table->tbody->tr->td structure.
 */
export const Sortable: Story = {
    render: () => <SortableTable />
};
