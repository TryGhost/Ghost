import type {Meta, StoryObj} from '@storybook/react';

import DynamicTable, {DynamicTableColumn, DynamicTableRow} from './DynamicTable';
import Avatar from '../Avatar';

const meta = {
    title: 'Global / Table / Dynamic Table',
    component: DynamicTable,
    tags: ['autodocs']
} satisfies Meta<typeof DynamicTable>;

export default meta;
type Story = StoryObj<typeof DynamicTable>;

const columns: DynamicTableColumn[] = [
    {
        title: 'Member'
    },
    {
        title: 'Status'
    },
    {
        title: 'Open rate'
    },
    {
        title: 'Location',
        noWrap: true
    },
    {
        title: 'Created',
        noWrap: true
    },
    {
        title: 'Signed up on post',
        noWrap: true,
        maxWidth: '150px'
    },
    {
        title: 'Newsletter'
    },
    {
        title: 'Billing period'
    },
    {
        title: 'Email sent'
    }
];

const rows = (noOfRows: number) => {
    const data: DynamicTableRow[] = [];
    for (let i = 0; i < noOfRows; i++) {
        data.push(
            {
                cells: [
                    (<div className='flex items-center gap-2'>
                        {i % 3 === 0 && <Avatar bgColor='green' label='JL' labelColor='white' />}
                        {i % 3 === 1 && <Avatar bgColor='orange' label='GS' labelColor='white' />}
                        {i % 3 === 2 && <Avatar bgColor='black' label='ZB' labelColor='white' />}
                        <div>
                            {i % 3 === 0 && <div className='whitespace-nowrap'>Jamie Larson</div>}
                            {i % 3 === 1 && <div className='whitespace-nowrap'>Giana Septimus</div>}
                            {i % 3 === 2 && <div className='whitespace-nowrap'>Zaire Bator</div>}
                            <div className='text-sm text-grey-700'>jamie@larson.com</div>
                        </div>
                    </div>),
                    'Free',
                    '40%',
                    'London, UK',
                    '22 June 2023',
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                    'Subscribed',
                    'Monthly',
                    '1,303'
                ]
            }
        );
    }
    return data;
};

export const Default: Story = {
    args: {
        stickyHeader: true,
        stickyFooter: true,
        columns: columns,
        rows: rows(40)
    }
};
