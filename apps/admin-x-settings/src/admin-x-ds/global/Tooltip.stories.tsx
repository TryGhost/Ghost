import type {Meta, StoryObj} from '@storybook/react';

import Tooltip from './Tooltip';

const meta = {
    title: 'Global / Tooltip',
    component: Tooltip,
    tags: ['autodocs']
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    args: {
        content: 'Hello tooltip',
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};
