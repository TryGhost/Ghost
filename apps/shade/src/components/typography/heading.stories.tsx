import type {Meta, StoryObj} from '@storybook/react';

import {Heading} from './heading';

const meta = {
    title: 'Typography / Heading',
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
