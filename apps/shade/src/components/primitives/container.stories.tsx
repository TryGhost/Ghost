import type {Meta, StoryObj} from '@storybook/react-vite';
import {Container} from './container';

const meta = {
    title: 'Primitives / Container',
    component: Container,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'Width-constrained primitive for page and region containers.'
            }
        }
    }
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof Container>;

export const PageWidth: Story = {
    args: {
        size: 'page',
        paddingX: 'lg',
        children: (
            <div className="rounded-md border border-border-default bg-surface-panel p-4">
                Page-width container content
            </div>
        )
    },
    render: args => (
        <div className="w-full bg-accent py-6">
            <Container {...args} />
        </div>
    )
};

export const ProseWidth: Story = {
    args: {
        size: 'prose',
        centered: true,
        children: (
            <div className="rounded-md border border-border-default bg-surface-panel p-4 text-sm">
                A narrower, readable content width intended for copy-heavy regions.
            </div>
        )
    },
    render: args => (
        <div className="w-full bg-accent py-6">
            <Container {...args} />
        </div>
    )
};
