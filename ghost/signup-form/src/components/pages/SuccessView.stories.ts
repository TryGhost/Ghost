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
        isMinimal: false
    }
};

export const Minimal: Story = {
    args: {
        email: 'test@example.com',
        isMinimal: true
    }
};
