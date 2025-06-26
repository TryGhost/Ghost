import type {Meta, StoryObj} from '@storybook/react';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from './sheet';
import {Button} from './button';

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
                    <Button>Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Sheet Title</SheetTitle>
                        <SheetDescription>
                            This is a Sheet component. You can put any content here.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">Main content goes here.</div>
                    <SheetFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Confirm</Button>
                    </SheetFooter>
                </SheetContent>
            </>
        )
    }
};

export const SideVariants: Story = {
    args: {
        children: (
            <div className="flex flex-wrap gap-4">
                {(['right', 'left', 'top', 'bottom'] as const).map(side => (
                    <Sheet key={side}>
                        <SheetTrigger asChild>
                            <Button>{`Open ${side.charAt(0).toUpperCase() + side.slice(1)}`}</Button>
                        </SheetTrigger>
                        <SheetContent side={side}>
                            <SheetHeader>
                                <SheetTitle>{`Sheet from ${side}`}</SheetTitle>
                                <SheetDescription>
                                    {`This Sheet slides in from the ${side}.`}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="py-4">Content for {side} side.</div>
                            <SheetFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button>Confirm</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                ))}
            </div>
        )
    }
};
