import type {Meta, StoryObj} from '@storybook/react';
import {Button} from './button';
import {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger} from './sheet';

const meta = {
    title: 'Components / Sheet',
    component: Sheet,
    tags: ['autodocs'],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
    args: {
        children: (
            <>
                <SheetTrigger asChild>
                    <Button className='cursor-pointer'>Open</Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Sheet title</SheetTitle>
                        <SheetDescription>
                            Sheet description
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                        Sheet contents
                    </div>
                    <SheetFooter>
                        <SheetClose asChild>
                            <Button className='cursor-pointer' type="submit">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </>
        )
    }
};
