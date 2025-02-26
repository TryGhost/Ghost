import type {Meta, StoryObj} from '@storybook/react';
import {Popover, PopoverTrigger, PopoverContent} from './popover';
import {Button} from './button';

const meta = {
    title: 'Components / Popover',
    component: Popover,
    tags: ['autodocs']
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
    args: {
        children: [
            <div style={{height: 400}}>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">Open popover</Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Dimensions</h4>
                                <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        ]
    }
};
