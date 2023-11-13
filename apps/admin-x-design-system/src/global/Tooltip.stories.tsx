import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
import Tooltip from './Tooltip';

const meta = {
    title: 'Global / Tooltip',
    component: Tooltip,
    tags: ['autodocs']
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    args: {
        content: 'Hello tooltip',
        children: <Button color='outline' label="Hover me" />
    }
};

export const MediumSize: Story = {
    args: {
        content: 'Hello tooltip',
        children: <Button color='outline' label="Hover me" />,
        size: 'md'
    }
};

export const Left: Story = {
    args: {
        content: 'Hello tooltip on the left',
        children: <Button color='outline' label="Hover me" />,
        origin: 'left'
    }
};

export const Center: Story = {
    args: {
        content: 'Hello center tooltip',
        children: <Button color='outline' label="Hover me" />,
        origin: 'center'
    }
};

export const Right: Story = {
    args: {
        content: 'Hello right tooltip',
        children: <Button color='outline' label="Hover me" />,
        origin: 'right'
    }
};

export const Long: Story = {
    args: {
        content: `You're the best evil son an evil dad could ever ask for.`,
        children: <Button color='outline' label="Hover me" />,
        size: 'md',
        origin: 'left'
    }
};

export const OnText: Story = {
    args: {
        content: 'Hello center tooltip',
        children: 'Just hover me',
        origin: 'center'
    }
};