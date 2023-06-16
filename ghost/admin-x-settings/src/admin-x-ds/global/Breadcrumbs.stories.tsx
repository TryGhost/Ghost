import type {Meta, StoryObj} from '@storybook/react';

import Breadcrumbs from './Breadcrumbs';

const meta = {
    title: 'Global / Breadcrumbs',
    component: Breadcrumbs,
    tags: ['autodocs']
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
    args: {
        items: [
            {label: 'Hello', onClick: () => {
                alert('Hello');
            }},
            {label: 'Nice', onClick: () => {
                alert('Nice');
            }},
            {label: 'Turtleneck'}
        ]
    }
};
