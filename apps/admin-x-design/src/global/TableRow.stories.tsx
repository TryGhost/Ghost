import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';

const meta = {
    title: 'Global / Table / Table Row',
    component: TableRow,
    tags: ['autodocs']
} satisfies Meta<typeof TableRow>;

const tableHeaderCells = (
    <>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
    </>
);

const tableCells = (
    <>
        <TableCell>Jamie Larson</TableCell>
        <TableCell>jamie@example.com</TableCell>
    </>
);

export default meta;
type Story = StoryObj<typeof TableRow>;

export const Default: Story = {
    args: {
        children: tableCells,
        action: <Button color='green' label='Edit' link={true} />,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            const clickedDiv = e.currentTarget;
            alert(`Clicked on "${clickedDiv.id}"`);
        }
    },
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '600px'}}>{_story()}</div>)]
};

export const HiddenAction: Story = {
    args: {
        children: tableCells,
        hideActions: true,
        action: <Button color='green' label='Edit' link={true} />,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            const clickedDiv = e.currentTarget;
            alert(`Clicked on "${clickedDiv.id}"`);
        }
    }
};

export const HeaderRow: Story = {
    args: {
        children: tableHeaderCells,
        separator: false,
        bgOnHover: false
    }
};