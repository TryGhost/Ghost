import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';

const meta = {
    title: 'Global / Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        color: {
            control: 'select'
        }
    }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: 'Button'
    }
};

export const Small: Story = {
    args: {
        size: 'sm',
        label: 'Button',
        color: 'black'
    }
};

export const Black: Story = {
    args: {
        label: 'Button',
        color: 'black'
    }
};

export const Green: Story = {
    args: {
        label: 'Button',
        color: 'green'
    }
};

export const Red: Story = {
    args: {
        label: 'Button',
        color: 'red'
    }
};

export const LinkButton: Story = {
    args: {
        label: 'Button',
        color: 'green',
        link: true
    }
};

export const Icon: Story = {
    args: {
        icon: 'ellipsis',
        color: 'green',
        iconColorClass: 'text-white'
    }
};

export const IconSmall: Story = {
    args: {
        size: 'sm',
        icon: 'ellipsis',
        color: 'green',
        iconColorClass: 'text-white'
    }
};