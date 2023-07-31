import type {Meta, StoryObj} from '@storybook/react';

import Toggle from './Toggle';

const meta = {
    title: 'Global / Form / Toggle',
    component: Toggle,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)]
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
    args: {}
};

export const Checked: Story = {
    args: {
        checked: true
    }
};

export const Small: Story = {
    args: {
        size: 'sm'
    }
};

export const Large: Story = {
    args: {
        size: 'lg'
    }
};

export const WithLabel: Story = {
    args: {
        label: 'Check me'
    }
};

export const HeadingStyleLabel: Story = {
    args: {
        label: 'Heading style label',
        labelStyle: 'heading'
    }
};

export const WithLabelAndHint: Story = {
    args: {
        label: 'Check me',
        hint: 'But only if you dare'
    }
};

export const CustomLabelStyle: Story = {
    args: {
        label: 'Check me',
        labelClasses: 'text-sm translate-y-[1px]'
    }
};

export const LeftToRight: Story = {
    args: {
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl'
    }
};

export const WithSeparator: Story = {
    args: {
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl',
        separator: true
    }
};

export const CustomBgColor: Story = {
    args: {
        toggleBg: 'stripetest'
    }
};

export const Error: Story = {
    args: {
        label: 'Check me',
        hint: 'But only if you dare',
        direction: 'rtl',
        error: true,
        separator: true
    }
};
