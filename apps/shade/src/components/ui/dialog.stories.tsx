import type {Meta, StoryObj} from '@storybook/react-vite';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose} from './dialog';
import {Button} from './button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from './dropdown-menu';
import {Popover, PopoverContent, PopoverTrigger} from './popover';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './select';

const meta = {
    title: 'Components / Dialog',
    component: Dialog,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'General purpose modal dialog for non-destructive tasks like forms, settings, and focused flows.'
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
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Basic dialog with header, body content, and footer actions.'
            }
        }
    },
    args: {
        children: (
            <>
                <DialogTrigger className='cursor-pointer'><Button className='cursor-pointer'>Open</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                        This action cannot be undone. Are you sure you want to permanently
                        delete this file from our servers?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </>
        )
    }
};

export const PlacementExample: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    'Dialogs are centered by default. Keep content concise to avoid scroll in small viewports.'
            }
        }
    },
    args: {
        children: (
            <>
                <DialogTrigger asChild><Button variant="outline">Open centered dialog</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Centered by default</DialogTitle>
                        <DialogDescription>Dialog positions are handled internally; no size prop is required.</DialogDescription>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">Add your form or content here.</div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                        <Button>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </>
        )
    }
};

export const NestedOverlayEscape: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nested overlay Escape behavior</DialogTitle>
                    <DialogDescription>
                        Open an overlay. The first Escape closes it; the second closes this dialog.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Dropdown menu</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>First action</DropdownMenuItem>
                            <DropdownMenuItem>Second action</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Select>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="first">First option</SelectItem>
                            <SelectItem value="second">Second option</SelectItem>
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">Popover</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                            Supplementary content
                        </PopoverContent>
                    </Popover>
                </div>
            </DialogContent>
        </Dialog>
    ),
    parameters: {
        docs: {
            description: {
                story: 'DropdownMenu, Select, and Popover consume their first Escape before the parent dialog.'
            }
        }
    }
};
