import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import Table from './Table';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';

const meta = {
    title: 'Global / Table',
    component: Table,
    tags: ['autodocs']
} satisfies Meta<typeof Table>;

const tableRows = (
    <>
        <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
        </TableRow>
        <TableRow>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow>
            <TableCell>Jamie Larson</TableCell>
            <TableCell>jamie@example.com</TableCell>
        </TableRow>
        <TableRow>
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
