import type {Meta, StoryObj} from '@storybook/react-vite';
import {Inline, Stack, Text} from '@/components/primitives';
import {Input} from './input';
import {InputGroup, InputGroupInput} from './input-group';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './select';

const meta = {
    title: 'Components / Input',
    component: Input,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Text input field for forms and user data entry. Supports all standard HTML input attributes and types.'
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
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter your name...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Standard text input with placeholder text.'
            }
        }
    }
};

export const Email: Story = {
    args: {
        type: 'email',
        placeholder: 'Enter your email...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for email addresses with built-in validation.'
            }
        }
    }
};

export const Password: Story = {
    args: {
        type: 'password',
        placeholder: 'Enter your password...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for sensitive data that should be obscured.'
            }
        }
    }
};

export const WithValue: Story = {
    args: {
        value: 'Pre-filled value',
        placeholder: 'Enter text...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Input with a pre-filled value.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        disabled: true,
        placeholder: 'Disabled input...',
        value: 'Cannot edit this'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when input should be visible but not editable.'
            }
        }
    }
};

export const Invalid: Story = {
    args: {
        'aria-invalid': true,
        defaultValue: 'Invalid value'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use `aria-invalid` when validation fails so the input displays the standard destructive border and focus ring.'
            }
        }
    }
};

export const MatchingControlHeight: Story = {
    render: () => (
        <Stack className="max-w-2xl" gap="sm">
            <Text tone="secondary">Input, InputGroup, and Select share the standard control height.</Text>
            <Inline gap="sm">
                <Input className="w-40" placeholder="Publication title" />
                <InputGroup className="w-40">
                    <InputGroupInput placeholder="Search settings" />
                </InputGroup>
                <Select defaultValue="public">
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="members">Members only</SelectItem>
                    </SelectContent>
                </Select>
            </Inline>
        </Stack>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use this comparison to verify Input aligns with other controls powered by the shared control-height token.'
            }
        }
    }
};

export const Number: Story = {
    args: {
        type: 'number',
        placeholder: 'Enter a number...'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for numeric input with browser validation.'
            }
        }
    }
};
