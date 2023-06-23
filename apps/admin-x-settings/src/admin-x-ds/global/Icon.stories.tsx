import type {Meta, StoryObj} from '@storybook/react';

import Icon from './Icon';

const meta = {
    title: 'Global / Icon',
    component: Icon,
    tags: ['autodocs']
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
    args: {
        name: 'lock-locked'
    }
};

export const ExtraSmall: Story = {
    args: {
        size: 'xs',
        name: 'lock-locked'
    }
};

export const Small: Story = {
    args: {
        size: 'sm',
        name: 'lock-locked'
    }
};

export const Medium: Story = {
    args: {
        size: 'md',
        name: 'lock-locked'
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        name: 'lock-locked'
    }
};

export const ExtraLarge: Story = {
    args: {
        size: 'xl',
        name: 'lock-locked'
    }
};

export const Color: Story = {
    args: {
        colorClass: 'text-green',
        name: 'lock-locked'
    }
};