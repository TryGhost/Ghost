import type {Meta, StoryObj} from '@storybook/react-vite';
import {Label} from './label';
import {Input} from './input';

const meta = {
    title: 'Components / Label',
    component: Label,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Accessible label component that associates text with form controls. Built on Radix UI for proper accessibility support.'
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
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
    args: {
        children: 'Email address'
    },
    parameters: {
        docs: {
            description: {
                story: 'Basic label text for form controls.'
            }
        }
    }
};

export const WithInput: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" placeholder="Enter your email..." type="email" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Label properly associated with an input using htmlFor and id attributes.'
            }
        }
    }
};

export const Required: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
            </Label>
            <Input id="password" placeholder="Enter your password..." type="password" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use for required fields with visual indicator.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="disabled-input">Disabled field</Label>
            <Input id="disabled-input" placeholder="This field is disabled..." disabled />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Label automatically adapts styling when associated input is disabled.'
            }
        }
    }
};
