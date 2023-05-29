import type {Meta, StoryObj} from '@storybook/react';

import Avatar from './Avatar';

const meta = {
    title: 'Global / Avatar',
    component: Avatar,
    tags: ['autodocs']
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
    args: {
        label: 'DV',
        bgColor: 'green',
        labelColor: 'white'
    }
};

export const Small: Story = {
    args: {
        label: 'DV',
        bgColor: 'green',
        labelColor: 'white',
        size: 'sm'
    }
};

export const Medium: Story = {
    args: {
        label: 'DV',
        bgColor: 'green',
        labelColor: 'white',
        size: 'md'
    }
};

export const Large: Story = {
    args: {
        label: 'DV',
        bgColor: 'green',
        labelColor: 'white',
        size: 'lg'
    }
};

export const ExtraLarge: Story = {
    args: {
        label: 'DV',
        bgColor: 'green',
        labelColor: 'white',
        size: 'xl'
    }
};