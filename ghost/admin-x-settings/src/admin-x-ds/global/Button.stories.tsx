import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
import {ButtonColors} from './Button';

const meta = {
    title: 'Global / Button',
    component: Button,
    tags: ['autodocs']
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: 'Button'
    }
};

export const Black: Story = {
    args: {
        label: 'Button',
        color: ButtonColors.Black
    }
};

export const Green: Story = {
    args: {
        label: 'Button',
        color: ButtonColors.Green
    }
};

export const Red: Story = {
    args: {
        label: 'Button',
        color: ButtonColors.Red
    }
};

export const Link: Story = {
    args: {
        label: 'Button',
        color: ButtonColors.Green,
        link: true
    }
};