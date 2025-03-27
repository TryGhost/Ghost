import type {Meta, StoryObj} from '@storybook/react';

import Hint from './Hint';

const meta = {
    title: 'Global / Hint',
    component: Hint,
    tags: ['autodocs']
} satisfies Meta<typeof Hint>;

export default meta;
type Story = StoryObj<typeof Hint>;

export const Default: Story = {
    args: {
        children: 'This is a hint'
    }
};

export const Error: Story = {
    args: {
        children: 'This is a hint that should be red',
        color: 'red'
    }
};

export const Success: Story = {
    args: {
        children: 'This is a hint that should be green',
        color: 'green'
    }
};

export const UsingReactNode: Story = {
    args: {
        children: (
            <>
                This is a <strong>bold</strong> hint with <a className='text-green-400' href="https://ghost.org">a link</a>
            </>
        )
    }
};