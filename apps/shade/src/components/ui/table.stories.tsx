import type {Meta, StoryObj} from '@storybook/react';
import {Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell} from './table';
import {CardDescription, CardHeader, CardTitle} from './card';

const meta = {
    title: 'Components / Table',
    component: Table,
    tags: ['autodocs'],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
    args: {
        children: (
            <>
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">ABC-123</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>Card</TableCell>
                        <TableCell className="text-right">$2,500.00</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">$2,500.00</TableCell>
                    </TableRow>
                </TableFooter>
            </>
        )
    }
};

export const CardHead: Story = {
    args: {
        children: (
            <>
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead variant='cardhead'>
                            <CardHeader>
                                <CardTitle>Invoice</CardTitle>
                                <CardDescription>All invoices from the last 30 days</CardDescription>
                            </CardHeader>
                        </TableHead>
                        <TableHead className='w-[10%]'>Status</TableHead>
                        <TableHead className='w-[5%]'>Method</TableHead>
                        <TableHead className="w-[10%] text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">ABC-123</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>Card</TableCell>
                        <TableCell className="text-right">$2,500.00</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">$2,500.00</TableCell>
                    </TableRow>
                </TableFooter>
            </>
        )
    }
};
