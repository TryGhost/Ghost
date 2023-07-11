import type {Meta, StoryObj} from '@storybook/react';

import IconLabel from './IconLabel';

const meta = {
    title: 'Global / Label with icon',
    component: IconLabel,
    tags: ['autodocs']
} satisfies Meta<typeof IconLabel>;

export default meta;
type Story = StoryObj<typeof IconLabel>;

export const Default: Story = {
    args: {
        icon: 'check-circle',
        iconColorClass: 'text-green',
        children: 'Here\'s a label with icon'
    }
};
