import type {Meta, StoryObj} from '@storybook/react-vite';
import {Textarea} from './textarea';

const meta = {
    title: 'Components / Textarea',
    component: Textarea,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Multi-line text input for longer form content like comments, descriptions, or messages.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: {
        placeholder: 'Enter your message...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Standard textarea with placeholder text for multi-line input.'
            }
        }
    }
};

export const WithValue: Story = {
    args: {
        value: 'This is a pre-filled textarea with some content that spans multiple lines.\n\nIt demonstrates how the component handles longer text.',
        placeholder: 'Enter your message...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Textarea with pre-filled content showing multi-line text handling.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        disabled: true,
        placeholder: 'This textarea is disabled...',
        value: 'This content cannot be edited because the textarea is disabled.'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when textarea should be visible but not editable.'
            }
        }
    }
};

export const CustomHeight: Story = {
    args: {
        placeholder: 'This textarea has custom height...',
        style: {minHeight: '150px'}
    },
    parameters: {
        docs: {
            description: {
                story: 'Textarea with custom height using style props.'
            }
        }
    }
};

export const WithRows: Story = {
    args: {
        placeholder: 'This textarea uses rows attribute...',
        rows: 6
    },
    parameters: {
        docs: {
            description: {
                story: 'Use the rows attribute to control initial height.'
            }
        }
    }
};