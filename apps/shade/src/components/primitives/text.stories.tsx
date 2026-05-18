import type {Meta, StoryObj} from '@storybook/react-vite';
import {Text} from './text';

const meta = {
    title: 'Primitives / Text',
    component: Text,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Minimal typography primitive with semantic size, tone, weight, and line-height controls.'
            }
        }
    }
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
    args: {
        children: 'Primary body copy with semantic defaults.'
    }
};

export const HeadingTone: Story = {
    args: {
        as: 'h2',
        size: '2xl',
        weight: 'bold',
        tone: 'primary',
        leading: 'heading',
        children: 'Section title'
    }
};

export const SecondaryAndTruncated: Story = {
    args: {
        as: 'span',
        size: 'sm',
        tone: 'secondary',
        truncate: true,
        className: 'block max-w-64',
        children: 'This is a long metadata label that truncates once it reaches the max width.'
    }
};
