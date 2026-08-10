import type {Meta, StoryObj} from '@storybook/react-vite';
import {Toaster} from './sonner';
import {toast} from 'sonner';
import {Button} from './button';

const meta = {
    title: 'Components / Sonner',
    component: Toaster,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Toast notifications powered by `sonner`. Shade mounts a `Toaster` via `ShadeProvider`, so you only call `toast(...)` where needed.'
            }
        }
    }
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast('Toast title')}>Toast!</Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use a default toast for brief neutral feedback.'
            }
        }
    }
};

export const Error: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.error('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use an error toast when an action fails and the user may need to respond.'
            }
        }
    }
};

export const Success: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.success('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use a success toast to confirm that an action completed.'
            }
        }
    }
};

export const Info: Story = {
    args: {},
    render: () => (
        <Button onClick={() => toast.info('Hello world!', {description: 'Error description', duration: Infinity})}>Toast!</Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use an informational toast for contextual feedback without success or error semantics.'
            }
        }
    }
};

export const WithCloseButton: Story = {
    args: {
        closeButton: true
    },
    render: () => (
        <Button onClick={() => toast.success('Newsletter reactivated', {duration: Infinity})}>Toast with close button</Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Close buttons retain visible default, hover, and focus states in both light and dark themes.'
            }
        }
    }
};

export const WithAction: Story = {
    render: () => (
        <Button
            onClick={() => toast('Item archived', {
                description: 'You can undo this action for a short time.',
                action: {
                    label: 'Undo',
                    onClick: () => toast.success('Restored')
                }
            })}
        >
            Toast with action
        </Button>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Actions provide quick affordances (e.g., Undo). Keep labels short.'
            }
        }
    }
};
