import type {Meta, StoryObj} from '@storybook/react-vite';
import {Stack} from './stack';

const meta = {
    title: 'Primitives / Stack',
    component: Stack,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Vertical layout primitive for grouping content with explicit spacing and alignment.'
            }
        }
    }
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof Stack>;

export const Default: Story = {
    args: {
        gap: 'md',
        children: (
            <>
                <div className="rounded-md border border-border-default bg-surface-panel p-3">Section A</div>
                <div className="rounded-md border border-border-default bg-surface-panel p-3">Section B</div>
                <div className="rounded-md border border-border-default bg-surface-panel p-3">Section C</div>
            </>
        )
    }
};

export const Centered: Story = {
    args: {
        align: 'center',
        gap: 'lg',
        children: (
            <>
                <div className="w-48 rounded-md border border-border-default bg-surface-panel p-3 text-center">Primary action</div>
                <div className="w-48 rounded-md border border-border-default bg-surface-panel p-3 text-center">Secondary action</div>
            </>
        )
    }
};
