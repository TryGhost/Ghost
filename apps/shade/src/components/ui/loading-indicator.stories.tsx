import type {Meta, StoryObj} from '@storybook/react';
import {LoadingIndicator} from './loading-indicator';

const meta = {
    title: 'Components / Loading indicator',
    component: LoadingIndicator,
    tags: ['autodocs']
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof LoadingIndicator>;

export const Default: Story = {
    args: {size: 'md'}
};
