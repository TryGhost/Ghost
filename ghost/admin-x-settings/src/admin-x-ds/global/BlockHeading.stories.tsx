import type {Meta, StoryObj} from '@storybook/react';

import BlockHeading from './BlockHeading';

const meta = {
    title: 'Global / Block heading',
    component: BlockHeading,
    tags: ['autodocs']
} satisfies Meta<typeof BlockHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Block'
    }
};

export const Grey: Story = {
    args: {
        title: 'Block',
        grey: true
    }
};

export const WithSeparator: Story = {
    args: {
        title: 'Block',
        separator: true
    }
};