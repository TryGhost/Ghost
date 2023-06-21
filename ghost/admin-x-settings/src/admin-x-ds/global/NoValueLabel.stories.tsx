import type {Meta, StoryObj} from '@storybook/react';

import List from './List';
import NoValueLabel from './NoValueLabel';

const meta = {
    title: 'Global / No value label',
    component: NoValueLabel,
    tags: ['autodocs']
} satisfies Meta<typeof NoValueLabel>;

export default meta;
type Story = StoryObj<typeof NoValueLabel>;

export const Default: Story = {
    args: {
        icon: 'single-user-neutral-block',
        children: 'No availble entry'
    }
};

export const InList: Story = {
    args: {
        icon: 'single-user-neutral-block',
        children: 'No availble entry'
    },
    decorators: [
        ThisStory => (
            <List hint="And a hint for the empty list" title="Here's an empty list">
                <ThisStory />
            </List>
        )
    ]
};