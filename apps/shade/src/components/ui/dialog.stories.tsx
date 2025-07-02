import type {Meta, StoryObj} from '@storybook/react';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from './dialog';
import {Button} from './button';

const meta = {
    title: 'Components / Dialog',
    component: Dialog,
    tags: ['autodocs'],
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
                        <Button type="submit" variant="outline">Cancel</Button>
                        <Button type="submit">Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </>
        )
    }
};
