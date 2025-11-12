import type {Meta, StoryObj} from '@storybook/react-vite';
import {Indicator} from './indicator';

const meta = {
    title: 'Components / Indicator',
    component: Indicator,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'A simple status dot primitive for showing status with small colored dots. Lighter weight than Badge component, designed for notification dots, connection status, and other minimal indicators.'
            }
        }
    },
    argTypes: {
        variant: {
            control: {type: 'select'},
            options: ['neutral', 'info', 'success', 'error', 'warning']
        },
        state: {
            control: {type: 'select'},
            options: ['idle', 'active', 'inactive']
        },
        size: {
            control: {type: 'select'},
            options: ['sm', 'md', 'lg']
        },
        label: {
            control: {type: 'text'},
            description: 'Screen reader label for accessibility'
        }
    }
} satisfies Meta<typeof Indicator>;

export default meta;
type Story = StoryObj<typeof Indicator>;

export const Neutral: Story = {
    args: {
        variant: 'neutral',
        state: 'idle',
        label: 'Neutral status'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const Info: Story = {
    args: {
        variant: 'info',
        state: 'idle',
        label: 'Info status'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const Success: Story = {
    args: {
        variant: 'success',
        state: 'idle',
        label: 'Success status'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const Error: Story = {
    args: {
        variant: 'error',
        state: 'idle',
        label: 'Error status'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const Warning: Story = {
    args: {
        variant: 'warning',
        state: 'idle',
        label: 'Warning status'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const SuccessActive: Story = {
    args: {
        variant: 'success',
        state: 'active',
        label: 'Active'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const SuccessInactive: Story = {
    args: {
        variant: 'success',
        state: 'inactive',
        label: 'Inactive'
    },
    decorators: [
        StoryComponent => (
            <div className="flex items-center justify-center p-8">
                <StoryComponent />
            </div>
        )
    ]
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Indicator label="Neutral" state="idle" variant="neutral" />
                <span className="text-sm">Neutral</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Info" state="idle" variant="info" />
                <span className="text-sm">Info</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Success" state="idle" variant="success" />
                <span className="text-sm">Success</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Error" state="idle" variant="error" />
                <span className="text-sm">Error</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Warning" state="idle" variant="warning" />
                <span className="text-sm">Warning</span>
            </div>
        </div>
    )
};

export const AllStates: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Indicator label="Idle" state="idle" variant="neutral" />
                    <span className="text-sm">Idle (solid)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Active" state="active" variant="neutral" />
                    <span className="text-sm">Active (pulsing)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Inactive" state="inactive" variant="neutral" />
                    <span className="text-sm">Inactive (outline)</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Indicator label="Idle" state="idle" variant="success" />
                    <span className="text-sm">Idle (solid)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Active" state="active" variant="success" />
                    <span className="text-sm">Active (pulsing)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Inactive" state="inactive" variant="success" />
                    <span className="text-sm">Inactive (outline)</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Indicator label="Idle" state="idle" variant="error" />
                    <span className="text-sm">Idle (solid)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Active" state="active" variant="error" />
                    <span className="text-sm">Active (pulsing)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Inactive" state="inactive" variant="error" />
                    <span className="text-sm">Inactive (outline)</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Indicator label="Idle" state="idle" variant="warning" />
                    <span className="text-sm">Idle (solid)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Active" state="active" variant="warning" />
                    <span className="text-sm">Active (pulsing)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Indicator label="Inactive" state="inactive" variant="warning" />
                    <span className="text-sm">Inactive (outline)</span>
                </div>
            </div>
        </div>
    )
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Indicator label="Small" size="sm" state="idle" variant="neutral" />
                <span className="text-sm">Small (8px)</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Medium" size="md" state="idle" variant="neutral" />
                <span className="text-sm">Medium (12px)</span>
            </div>
            <div className="flex items-center gap-2">
                <Indicator label="Large" size="lg" state="idle" variant="neutral" />
                <span className="text-sm">Large (16px)</span>
            </div>
        </div>
    )
};

export const InContext: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
                <span>Connected to Stripe</span>
                <Indicator label="Connected" size="sm" state="idle" variant="success" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <span>Database error</span>
                <Indicator label="Error" size="sm" state="idle" variant="error" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <span>Warning: API rate limit</span>
                <Indicator label="Warning" size="sm" state="idle" variant="warning" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <span>256 reading now</span>
                <Indicator label="Active readers" size="sm" state="active" variant="success" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <span>Syncing...</span>
                <Indicator label="Syncing" size="sm" state="active" variant="success" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <span>Disconnected</span>
                <Indicator label="Disconnected" size="sm" state="inactive" variant="error" />
            </div>
        </div>
    )
};
