import type {Meta, StoryObj} from '@storybook/react';

import {SuccessView} from './SuccessView';

const meta = {
    title: 'Success View',
    component: SuccessView,
    tags: ['autodocs']
} satisfies Meta<typeof SuccessView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
    args: {
        email: 'test@example.com',
        isMinimal: false,
        backgroundColor: '#eeeeee',
        textColor: '#000000'
    }
};

export const FullDark: Story = {
    args: {
        email: 'test@example.com',
        isMinimal: false,
        backgroundColor: '#333333',
        textColor: '#ffffff'
    }
};

export const Minimal: Story = {
    args: {
        email: 'test@example.com',
        isMinimal: true
    },
    tags: ['transparency-grid']
};
