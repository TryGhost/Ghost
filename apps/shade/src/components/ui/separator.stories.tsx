import type {Meta, StoryObj} from '@storybook/react';
import {Separator} from './separator';

const meta = {
    title: 'Components / Separator',
    component: Separator,
    tags: ['autodocs']
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
    args: {}
};
