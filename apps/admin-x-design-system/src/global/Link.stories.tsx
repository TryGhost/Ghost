import type {Meta, StoryObj} from '@storybook/react';

import Link from './Link';

const meta = {
    title: 'Global / Link',
    component: Link,
    tags: ['autodocs'],
    argTypes: {
        color: {
            control: 'text'
        }
    }
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof Link>;

export const Default: Story = {
    args: {
        href: 'https://ghost.org',
        children: 'Click me'
    }
};