import type {Meta, StoryObj} from '@storybook/react-vite';
import {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider} from './tooltip';

const meta = {
    title: 'Components / Tooltip',
    component: Tooltip,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Brief, non-interactive label shown on hover or focus to clarify controls. Keep text short and avoid critical information.'
            }
        }
    },
    decorators: [
        Story => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        )
    ],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default tooltip anchored to inline trigger. Appears on hover or focus.'
            }
        }
    },
    args: {
        children: (
            <>
                <TooltipTrigger>Hover me</TooltipTrigger>
                <TooltipContent>Tooltip content</TooltipContent>
            </>
        )
    }
};

export const Placement: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use `side` and `align` to control placement when needed.'
            }
        }
    },
    args: {
        children: (
            <div className="flex flex-wrap gap-4">
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                    <Tooltip key={side}>
                        <TooltipTrigger className="rounded border px-2 py-1">{side}</TooltipTrigger>
                        <TooltipContent side={side}>
                            Tooltip on {side}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        )
    }
};
