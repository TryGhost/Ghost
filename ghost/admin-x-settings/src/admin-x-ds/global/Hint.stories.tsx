import type {Meta, StoryObj} from '@storybook/react';

import Hint from './Hint';

const meta = {
    title: 'Global / Hint',
    component: Hint,
    tags: ['autodocs']
} satisfies Meta<typeof Hint>;

export default meta;
type Story = StoryObj<typeof Hint>;

export const Default: Story = {
    args: {
        children: 'This is a hint'
    }
};