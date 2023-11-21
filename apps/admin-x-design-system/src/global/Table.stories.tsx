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

/**
 * Sticky header
 */

// const complexTableHeader = (sticky: boolean) => (
//     <>
//         <TableHead sticky={sticky}>Member</TableHead>
//         <TableHead sticky={sticky}>Status</TableHead>
//         <TableHead sticky={sticky}>Open rate</TableHead>
//         <TableHead sticky={sticky}>Location</TableHead>
//         <TableHead sticky={sticky}>Created</TableHead>
//         <TableHead sticky={sticky}>Signed up on post</TableHead>
//         <TableHead sticky={sticky}>Newsletter</TableHead>
//         <TableHead sticky={sticky}>Billing Period</TableHead>
//         <TableHead sticky={sticky}>Email sent</TableHead>
//     </>
// );

// const complexTableRows = (rows: number) => {
//     const data = [];
//     for (let i = 0; i < rows; i++) {
//         data.push(
//             <>
//                 <TableRow>
//                     <TableCell>
//                         <div className='flex items-center gap-2'>
//                             {i % 3 === 0 && <Avatar bgColor='green' label='JL' labelColor='white' />}
//                             {i % 3 === 1 && <Avatar bgColor='orange' label='GS' labelColor='white' />}
//                             {i % 3 === 2 && <Avatar bgColor='black' label='ZB' labelColor='white' />}
//                             <div>
//                                 {i % 3 === 0 && <div className='whitespace-nowrap'>Jamie Larson</div>}
//                                 {i % 3 === 1 && <div className='whitespace-nowrap'>Giana Septimus</div>}
//                                 {i % 3 === 2 && <div className='whitespace-nowrap'>Zaire Bator</div>}
//                                 <div className='text-sm text-grey-700'>jamie@larson.com</div>
//                             </div>
//                         </div>
//                     </TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>Free</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>40%</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>London, UK</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>22 June 2023</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>Hiking in the Nordic</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>Subscribed</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>Monthly</TableCell>
//                     <TableCell className='whitespace-nowrap' valign='center'>1,303</TableCell>
//                 </TableRow>
//             </>
//         );
//     }
//     return data;
// };

// export const HorizontalScroll: Story = {
//     args: {
//         header: complexTableHeader(false),
//         children: complexTableRows(100),
//         hint: 'Massive table',
//         hintSeparator: true
//     }
// };

// export const FillContainer: Story = {
//     args: {
//         fillContainer: true,
//         header: complexTableHeader(true),
//         children: complexTableRows(50),
//         hint: 'Massive table',
//         hintSeparator: true
//     }
// };

// export const PageExample: Story = {
//     decorators: [(_story: () => ReactNode) => (
//         <div className='absolute inset-0 p-10'>
//             <div className='flex h-full flex-col'>
//                 <h1 className='mb-3'>Page title</h1>
//                 <p className='max-w-2xl pb-6'>This example shows how you can create a page with arbitrary content on the top and a large table at the bottom that fills up the remaining space. The table has a sticky header row, a footer that is always visible and scrolling vertically and horizontally (resize the window to see the effect).</p>
//                 <p className='max-w-2xl pb-6'>The size and positioning of the table is completely controlled by its <strong>container</strong>. The container must have `relative` position. Use a column flexbox as the main container of the page then set the table container to flex-auto to fill the available horizontal space.</p>
//                 <div className='relative -mx-10 flex-auto'>{_story()}</div>
//             </div>
//         </div>
//     )],
//     args: {
//         fillContainer: true,
//         header: complexTableHeader(true),
//         children: complexTableRows(50),
//         hint: 'The footer of the table sticks to the bottom to stay visible',
//         hintSeparator: true,
//         paddingXClassName: 'px-10'
//     }
// };