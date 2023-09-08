import type {Meta, StoryObj} from '@storybook/react';

import {CenteredLoadingIndicator} from './LoadingIndicator';

const meta = {
    title: 'Global / Loading indicator',
    component: CenteredLoadingIndicator,
    tags: ['autodocs']
} satisfies Meta<typeof CenteredLoadingIndicator>;

export default meta;
type Story = StoryObj<typeof CenteredLoadingIndicator>;

export const Default: Story = {
    args: {
        delay: 1000,
        style: {
            height: '400px'
        }
    }
};
