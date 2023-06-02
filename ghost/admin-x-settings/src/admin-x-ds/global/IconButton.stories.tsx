import type {Meta, StoryObj} from '@storybook/react';

import IconButton from './IconButton';

const meta = {
    title: 'Global / Icon Button',
    component: IconButton,
    tags: ['autodocs']
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
    args: {
        iconName: 'menu-horizontal'
    }
};
