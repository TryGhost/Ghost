import type {Meta, StoryObj} from '@storybook/react';

import {LoadingIndicator} from './LoadingIndicator';

const meta = {
    title: 'Global / Loading indicator',
    component: LoadingIndicator,
    tags: ['autodocs']
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof LoadingIndicator>;

export const Default: Story = {
    args: {
        delay: 1000,        
        style: {
            height: '400px'
        }
    }
};

export const Small: Story = {
    args: {
        delay: 1000,
        size: 'sm',
        color: 'dark',
        style: {
            height: '400px'
        }
    }
};

export const Medium: Story = {
    args: {
        delay: 1000,
        size: 'md',
        color: 'dark',
        style: {
            height: '400px'
        }
    }
};

export const Large: Story = {
    args: {
        delay: 1000,
        size: 'lg',
        color: 'dark',
        style: {
            height: '400px'
        }
    }
};

export const LightColor: Story = {
    args: {
        delay: 1000,
        size: 'lg',
        color: 'light',
        style: {
            height: '400px',
            backgroundColor: 'tomato'
        }
    }
};