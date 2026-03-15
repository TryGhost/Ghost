import type {Meta, StoryObj} from '@storybook/react-vite';
import {Badge} from './badge';

const meta = {
    title: 'Components / Badge',
    component: Badge,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Small status indicators and labels with multiple variants. Use for displaying tags, statuses, categories, or any short descriptive text that needs visual emphasis.'
            }
        }
    },
    argTypes: {
        variant: {
            control: {type: 'select'},
            options: ['default', 'secondary', 'destructive', 'success', 'outline']
        }
    }
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: 'Badge'
    }
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary'
    }
};

export const Destructive: Story = {
    args: {
        variant: 'destructive',
        children: 'Error'
    }
};

export const Success: Story = {
    args: {
        variant: 'success',
        children: 'Success'
    }
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Outline'
    }
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
    )
};
