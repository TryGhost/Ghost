import type {Meta, StoryObj} from '@storybook/react-vite';
import {EmptyIndicator} from './empty-indicator';
import {Button} from './button';
import {Inbox, Plus} from 'lucide-react';

const meta = {
    title: 'Components / Empty indicator',
    component: EmptyIndicator,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Communicates an empty state for lists or sections. Pair with a short title, one-line description, and optional follow-up actions.'
            }
        }
    }
} satisfies Meta<typeof EmptyIndicator>;

export default meta;
type Story = StoryObj<typeof EmptyIndicator>;

export const Default: Story = {
    args: {
        title: 'No items yet',
        description: 'When you add your first item it will show up here.'
    },
    render: args => (
        <EmptyIndicator {...args}>
            <Inbox />
        </EmptyIndicator>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use for initial empty states. Keep copy short and direct.'
            }
        }
    }
};

export const WithActions: Story = {
    args: {
        title: 'No posts yet',
        description: 'Create your first post to get started.',
        actions: (
            <>
                <Button>
                    <Plus /> New post
                </Button>
            </>
        )
    },
    render: args => (
        <EmptyIndicator {...args}>
            <Inbox />
        </EmptyIndicator>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Include primary and secondary actions to guide the next step.'
            }
        }
    }
};

export const CompactCopy: Story = {
    args: {
        title: 'Nothing to show',
        description: 'Try adjusting your filters.'
    },
    render: args => (
        <EmptyIndicator {...args}>
            <Inbox />
        </EmptyIndicator>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Short, focused copy works best in constrained layouts.'
            }
        }
    }
};

export const TitleOnly: Story = {
    args: {
        title: 'No results found'
    },
    render: args => (
        <EmptyIndicator {...args}>
            <Inbox />
        </EmptyIndicator>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use title-only when the context is self-explanatory and no additional description is needed.'
            }
        }
    }
};

export const TitleWithAction: Story = {
    args: {
        title: 'No members yet',
        actions: (
            <>
                <Button>
                    <Plus /> Add member
                </Button>
            </>
        )
    },
    render: args => (
        <EmptyIndicator {...args}>
            <Inbox />
        </EmptyIndicator>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Combine a title with actions when the next step is clear without needing additional explanation.'
            }
        }
    }
};

