import type {Meta, StoryObj} from '@storybook/react-vite';
import {Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableHeadButton} from './table';
import {CardDescription, CardHeader, CardTitle} from './card';
import {Badge} from './badge';
import {ArrowUpDown} from 'lucide-react';

const meta = {
    title: 'Components / Table',
    component: Table,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Flexible table components for displaying structured data with sorting, headers, and footers. Built with semantic HTML and accessible markup.'
            }
        }
    },
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
                    <TableRow>
                        <TableCell className="font-medium">DEF-456</TableCell>
                        <TableCell>Pending</TableCell>
                        <TableCell>Bank Transfer</TableCell>
                        <TableCell className="text-right">$1,200.00</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">GHI-789</TableCell>
                        <TableCell>Failed</TableCell>
                        <TableCell>Card</TableCell>
                        <TableCell className="text-right">$750.00</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">$4,450.00</TableCell>
                    </TableRow>
                </TableFooter>
            </>
        )
    }
};

export const WithStatusBadges: Story = {
    args: {
        children: (
            <>
                <TableCaption>Transaction history with status indicators.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">TXN-001</TableCell>
                        <TableCell><Badge variant="success">Completed</Badge></TableCell>
                        <TableCell>$1,250.00</TableCell>
                        <TableCell>2024-01-15</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">TXN-002</TableCell>
                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                        <TableCell>$850.00</TableCell>
                        <TableCell>2024-01-14</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">TXN-003</TableCell>
                        <TableCell><Badge variant="destructive">Failed</Badge></TableCell>
                        <TableCell>$420.00</TableCell>
                        <TableCell>2024-01-13</TableCell>
                    </TableRow>
                </TableBody>
            </>
        )
    }
};

export const WithSortableHeaders: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <TableHeadButton>
                                Name
                                <ArrowUpDown />
                            </TableHeadButton>
                        </TableHead>
                        <TableHead>
                            <TableHeadButton>
                                Email
                                <ArrowUpDown />
                            </TableHeadButton>
                        </TableHead>
                        <TableHead>
                            <TableHeadButton>
                                Role
                                <ArrowUpDown />
                            </TableHeadButton>
                        </TableHead>
                        <TableHead>
                            <TableHeadButton>
                                Date Joined
                                <ArrowUpDown />
                            </TableHeadButton>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">John Doe</TableCell>
                        <TableCell>john@example.com</TableCell>
                        <TableCell><Badge>Admin</Badge></TableCell>
                        <TableCell>2024-01-01</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Jane Smith</TableCell>
                        <TableCell>jane@example.com</TableCell>
                        <TableCell><Badge variant="secondary">Editor</Badge></TableCell>
                        <TableCell>2024-01-05</TableCell>
                    </TableRow>
                </TableBody>
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

export const SimpleTable: Story = {
    args: {
        children: (
            <>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Widget A</TableCell>
                        <TableCell>$19.99</TableCell>
                        <TableCell>In Stock</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Widget B</TableCell>
                        <TableCell>$29.99</TableCell>
                        <TableCell>Low Stock</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Widget C</TableCell>
                        <TableCell>$39.99</TableCell>
                        <TableCell>Out of Stock</TableCell>
                    </TableRow>
                </TableBody>
            </>
        )
    }
};
