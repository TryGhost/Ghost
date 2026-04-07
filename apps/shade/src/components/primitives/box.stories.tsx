import type {Meta, StoryObj} from '@storybook/react-vite';
import {Box} from './box';

const meta = {
    title: 'Primitives / Box',
    component: Box,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Framing primitive for padding and radius without implicit layout behavior.'
            }
        }
    }
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof Box>;

export const Default: Story = {
    args: {
        padding: 'lg',
        radius: 'lg',
        className: 'border border-border-default bg-surface-panel',
        children: 'Framed content'
    }
};

export const AxisPadding: Story = {
    args: {
        paddingX: 'xl',
        paddingY: 'sm',
        radius: 'md',
        className: 'border border-border-default bg-surface-panel',
        children: 'Independent horizontal and vertical spacing'
    }
};
