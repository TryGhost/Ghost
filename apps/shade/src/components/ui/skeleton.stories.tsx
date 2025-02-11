import type {Meta, StoryObj} from '@storybook/react';
import {Skeleton} from './skeleton';

const meta = {
    title: 'Components / Skeleton',
    component: Skeleton,
    tags: ['autodocs']
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
    args: {
        style: {width: 160, height: 16}
    }
};
