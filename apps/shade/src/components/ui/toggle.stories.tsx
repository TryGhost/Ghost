import type {Meta, StoryObj} from '@storybook/react-vite';
import {Toggle} from './toggle';
import {Bold, Italic, Underline} from 'lucide-react';

const meta = {
    title: 'Components / Toggle',
    component: Toggle,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Toggle button component built on Radix UI. Supports pressed/unpressed states for binary controls like formatting options.'
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
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
    args: {
        children: 'Toggle'
    },
    parameters: {
        docs: {
            description: {
                story: 'Basic toggle button with text content.'
            }
        }
    }
};

export const WithIcon: Story = {
    args: {
        'aria-label': 'Toggle bold',
        children: <Bold />
    },
    parameters: {
        docs: {
            description: {
                story: 'Toggle with icon only - commonly used for text formatting controls.'
            }
        }
    }
};

export const WithIconAndText: Story = {
    args: {
        children: (
            <>
                <Bold />
                Bold
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Toggle with both icon and text for clearer meaning.'
            }
        }
    }
};

export const Pressed: Story = {
    args: {
        pressed: true,
        'aria-label': 'Toggle italic',
        children: <Italic />
    },
    parameters: {
        docs: {
            description: {
                story: 'Toggle in pressed/active state.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        disabled: true,
        'aria-label': 'Toggle underline',
        children: <Underline />
    },
    parameters: {
        docs: {
            description: {
                story: 'Disabled toggle that cannot be interacted with.'
            }
        }
    }
};

export const FormattingToolbar: Story = {
    render: () => (
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Toggle aria-label="Toggle bold">
                <Bold />
            </Toggle>
            <Toggle aria-label="Toggle italic">
                <Italic />
            </Toggle>
            <Toggle aria-label="Toggle underline">
                <Underline />
            </Toggle>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Multiple toggles grouped together to create a formatting toolbar.'
            }
        }
    }
};