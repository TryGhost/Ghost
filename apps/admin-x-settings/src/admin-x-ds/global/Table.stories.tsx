import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import * as TableRowStories from './TableRow.stories';
import Table from './Table';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';

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