import type {Meta, StoryObj} from '@storybook/react';

import Heading from './Heading';

const meta = {
    title: '1.0 / Heading',
    component: Heading,
    tags: ['autodocs']
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof Heading>;

export const Default: Story = {
    args: {
        children: 'This is a heading component'
    }
};
