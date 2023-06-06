import type {Meta, StoryObj} from '@storybook/react';

import Toggle from './Toggle';

const meta = {
    title: 'Global / Toggle',
    component: Toggle,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)]
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
    args: {
        id: 'default-toggle'
    }
};

export const Checked: Story = {
    args: {
        id: 'default-toggle',
        checked: true
    }
};

export const Small: Story = {
    args: {
        id: 'default-toggle',
        size: 'sm'
    }
};

export const Large: Story = {
    args: {
        id: 'default-toggle',
        size: 'lg'
    }
};

export const WithLabel: Story = {
    args: {
        id: 'default-toggle',
        label: 'Check me'
    }
};

export const WithLabelAndHint: Story = {
    args: {
        id: 'default-toggle',
        label: 'Check me',
        hint: 'But only if you dare'
    }
};

export const LeftToRight: Story = {
    args: {
        id: 'default-toggle',
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl'
    }
};

export const WithSeparator: Story = {
    args: {
        id: 'default-toggle',
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl',
        separator: true
    }
};

export const Error: Story = {
    args: {
        id: 'default-toggle',
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl',
        error: true,
        separator: true
    }
};