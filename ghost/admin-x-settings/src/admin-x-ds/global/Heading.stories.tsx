import type {Meta, StoryObj} from '@storybook/react';

import Heading from './Heading';

const meta = {
    title: 'Global / Heading',
    component: Heading,
    tags: ['autodocs'],
    argTypes: {
        level: {
            control: 'select'
        }
    }
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof Heading>;

export const H1: Story = {
    args: {
        children: 'Heading 1'
    }
};

export const H2: Story = {
    args: {
        children: 'Heading 2',
        level: 2
    }
};

export const H3: Story = {
    args: {
        children: 'Heading 3',
        level: 3
    }
};

export const H4: Story = {
    args: {
        children: 'Heading 4',
        level: 4
    }
};

export const H5: Story = {
    args: {
        children: 'Heading 5',
        level: 5
    }
};

export const H6: Story = {
    args: {
        children: 'Heading 6',
        level: 6
    }
};

export const H6Grey: Story = {
    args: {
        children: 'Grey heading 6',
        level: 6,
        grey: true
    }
};

export const H6WithSeparator: Story = {
    args: {
        children: 'Heading 6 with separator',
        level: 6,
        separator: true
    }
};