import type {Meta, StoryObj} from '@storybook/react-vite';
import {Popover, PopoverTrigger, PopoverContent} from './popover';
import {Button} from './button';

const meta = {
    title: 'Components / Popover',
    component: Popover,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Small, contextual surface for supplementary content triggered by a control. Use for pickers, hints, or compact forms.'
            }
        }
    }
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Basic popover anchored to a trigger. Keep content focused and lightweight.'
            }
        }
    },
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

export const Placement: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Control placement via `side` and `align`. Defaults to center alignment.'
            }
        }
    },
    args: {
        children: [
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', minHeight: 120}}>
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                    <Popover key={side}>
                        <PopoverTrigger asChild>
                            <Button variant="outline">{side}</Button>
                        </PopoverTrigger>
                        <PopoverContent side={side}>From {side}</PopoverContent>
                    </Popover>
                ))}
            </div>
        ]
    }
};
