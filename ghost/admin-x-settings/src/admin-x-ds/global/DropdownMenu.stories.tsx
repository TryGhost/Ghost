import type {Meta, StoryObj} from '@storybook/react';

import DropdownMenu from './DropdownMenu';

const meta = {
    title: 'Global / DropdownMenu',
    component: DropdownMenu,
    tags: ['autodocs']
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
    args: {

    }
};
