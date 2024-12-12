import type {Meta, StoryObj} from '@storybook/react';

import {Button} from './button';
import Icon from './icon';
import {Smile} from 'lucide-react';

const meta = {
    title: 'Components / Button',
    component: Button,
    tags: ['autodocs']
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: 'This is a button component'
    }
};

export const IconOnly: Story = {
    args: {
        children: (
            <Icon.ArrowUp />
        )
    }
};

export const IconAndText: Story = {
    args: {
        children: (
            <>
                <Icon.ArrowUp />
                Icon and text
            </>
        )
    }
};

export const LucideIcon: Story = {
    args: {
        children: (
            <>
                <Smile />
                Experimental
            </>
        )
    }
};