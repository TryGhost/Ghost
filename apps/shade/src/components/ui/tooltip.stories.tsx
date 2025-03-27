import type {Meta, StoryObj} from '@storybook/react';
import {Tooltip, TooltipTrigger, TooltipContent} from './tooltip';
import {TooltipProvider} from '@radix-ui/react-tooltip';

const meta = {
    title: 'Components / Tooltip',
    component: Tooltip,
    tags: ['autodocs'],
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
    args: {
        children: (
            <>
                <TooltipTrigger>Hover me</TooltipTrigger>
                <TooltipContent>Tooltip content</TooltipContent>
            </>
        )
    }
};
