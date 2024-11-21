import type {Meta, StoryObj} from '@storybook/react';

import Banner from './Banner';

const meta = {
    title: 'Global / Banner',
    component: Banner,
    tags: ['autodocs']
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof Banner>;

export const Default: Story = {
    args: {
        children: 'Just a full-width banner'
    }
};

export const Blue: Story = {
    args: {
        color: 'blue',
        children: 'Just a full-width banner'
    }
};

export const Green: Story = {
    args: {
        color: 'green',
        children: 'Just a full-width banner'
    }
};

export const Yellow: Story = {
    args: {
        color: 'yellow',
        children: 'Just a full-width banner'
    }
};

export const Red: Story = {
    args: {
        color: 'red',
        children: 'Just a full-width banner'
    }
};

