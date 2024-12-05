import type {Meta, StoryObj} from '@storybook/react';

import {Button} from './button';

const meta = {
    title: 'Components / Button',
    component: Button,
    tags: ['autodocs']
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: 'This is a button component'
    }
};
