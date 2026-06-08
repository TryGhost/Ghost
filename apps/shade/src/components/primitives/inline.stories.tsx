import type {Meta, StoryObj} from '@storybook/react-vite';
import {Inline} from './inline';

const meta = {
    title: 'Primitives / Inline',
    component: Inline,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Horizontal layout primitive for actions, controls, and inline composition with explicit spacing.'
            }
        }
    }
} satisfies Meta<typeof Inline>;

export default meta;
type Story = StoryObj<typeof Inline>;

export const Default: Story = {
    args: {
        gap: 'sm',
        children: (
            <>
                <button className="rounded-md border border-border-default bg-surface-panel px-3 py-2 text-sm" type="button">Cancel</button>
                <button className="rounded-md border border-border-default bg-primary px-3 py-2 text-sm text-primary-foreground" type="button">Save</button>
            </>
        )
    }
};

export const Wrapped: Story = {
    args: {
        gap: 'sm',
        wrap: true,
        children: (
            <>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs">Tag A</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs">Tag B</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs">Tag C</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs">Tag D</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs">Tag E</span>
            </>
        )
    }
};
