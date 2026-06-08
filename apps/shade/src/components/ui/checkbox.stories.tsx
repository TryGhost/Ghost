import type {Meta, StoryObj} from '@storybook/react-vite';
import * as React from 'react';
import {Checkbox} from './checkbox';
import {Label} from './label';

const meta = {
    title: 'Components / Checkbox',
    component: Checkbox,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'A control that allows users to toggle between checked and unchecked states. Built on Radix UI Checkbox primitive.'
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
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {},
    parameters: {
        docs: {
            description: {
                story: 'Basic checkbox component without a label.'
            }
        }
    }
};

export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Checkbox with an associated label for better accessibility and UX.'
            }
        }
    }
};

export const Checked: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="checked" defaultChecked />
            <Label htmlFor="checked">Checked by default</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Checkbox in the checked state by default.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="disabled" disabled />
            <Label htmlFor="disabled">Disabled checkbox</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled checkbox that cannot be interacted with.'
            }
        }
    }
};

export const DisabledChecked: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="disabled-checked" defaultChecked disabled />
            <Label htmlFor="disabled-checked">Disabled (Checked)</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled checkbox in the checked state.'
            }
        }
    }
};

export const Controlled: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);

        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        checked={checked}
                        id="controlled"
                        onCheckedChange={value => setChecked(value === true)}
                    />
                    <Label htmlFor="controlled">
                        {checked ? 'Checked' : 'Unchecked'}
                    </Label>
                </div>
                <div className="text-sm text-muted-foreground">
                    Current state: {checked ? 'Checked' : 'Unchecked'}
                </div>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Controlled checkbox with state managed in React.'
            }
        }
    }
};

export const WithDescription: Story = {
    render: () => (
        <div className="flex items-start space-x-2">
            <Checkbox id="terms-desc" />
            <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms-desc">Accept terms and conditions</Label>
                <p className="text-sm text-muted-foreground">
                    You agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Checkbox with a label and additional description text.'
            }
        }
    }
};
