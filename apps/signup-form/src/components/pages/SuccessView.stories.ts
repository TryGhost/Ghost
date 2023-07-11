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
        backgroundColor: '#eeeeee',
        textColor: '#000000'
    }
};

export const FullDark: Story = {
    args: {
        email: 'test@example.com',
        backgroundColor: '#333333',
        textColor: '#ffffff'
    }
};
