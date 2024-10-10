import type {Meta, StoryObj} from '@storybook/react';

import StripeButton from './StripeButton';

const meta = {
    title: 'Settings / Stripe Button',
    component: StripeButton,
    tags: ['autodocs']
} satisfies Meta<typeof StripeButton>;

export default meta;
type Story = StoryObj<typeof StripeButton>;

export const Default: Story = {
    args: { }
};

export const CustomLabel: Story = {
    args: {
        label: 'Let\'s go'
    }
};
