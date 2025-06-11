import type {Meta, StoryObj} from '@storybook/react';
import {Toaster} from './sonner';
import {toast} from 'sonner';
import {Button} from './button';

const meta = {
    title: 'Components / Sonner',
    component: Toaster,
    tags: ['autodocs']
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast('Toast title')}>Toast!</Button>
    )
};

export const Error: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.error('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    )
};

export const Success: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.success('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    )
};

export const Info: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.info('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    )
};
