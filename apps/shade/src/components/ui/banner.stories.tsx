import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Sparkles, Info, CheckCircle, AlertTriangle, XCircle} from 'lucide-react';
import {Banner} from './banner';

const meta = {
    title: 'Components / Banner',
    component: Banner,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: `Inline notification component for displaying status updates, announcements, and featured content within a page or sidebar.

**When to use:**
- Inline notifications within a page or sidebar
- Non-critical status updates that don't require immediate action
- Featured announcements or highlights
- Dismissible content that users can opt out of viewing

**When NOT to use:**
- Critical errors requiring immediate action (use Alert Dialog)
- Temporary feedback messages (use Toast/Sonner)
- Full-page announcements (use Alert)

**Accessibility:**
- Default \`role="status"\` for non-critical updates (has implicit \`aria-live="polite"\`)
- Use \`role="alert"\` for important messages (has implicit \`aria-live="assertive"\`)
- Use \`role="region"\` with \`aria-label\` for landmark sections
- Roles provide implicit aria-live behavior - no need to set explicitly unless overriding`
            }
        }
    },
    argTypes: {
        variant: {
            control: {type: 'select'},
            options: ['default', 'gradient', 'info', 'success', 'warning', 'destructive']
        },
        size: {
            control: {type: 'select'},
            options: ['sm', 'md', 'lg']
        },
        dismissible: {
            control: {type: 'boolean'}
        },
        role: {
            control: {type: 'select'},
            options: ['status', 'alert', 'region']
        }
    }
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof Banner>;

// Basic Examples
export const Default: Story = {
    args: {
        children: (
            <div className="text-sm">
                <strong className="mb-1 block">Default Banner</strong>
                <p className="text-muted-foreground">This is a standard banner notification.</p>
            </div>
        )
    }
};

export const Gradient: Story = {
    args: {
        variant: 'gradient',
        children: (
            <div className="flex flex-col">
                <div className="mb-1.5 flex items-center gap-2">
                    <span className='text-yellow'><Sparkles className="size-4" /></span>
                    <span className="text-[13px] font-medium text-gray-600">What&apos;s new?</span>
                </div>
                <div className="text-base font-semibold">New feature released</div>
                <div className="mt-1 text-[13px]">Check out our latest updates</div>
            </div>
        )
    }
};

export const Dismissible: Story = {
    render: () => {
        const [isVisible, setIsVisible] = useState(true);

        if (!isVisible) {
            return (
                <button
                    className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                    type="button"
                    onClick={() => setIsVisible(true)}
                >
                    Show Banner Again
                </button>
            );
        }

        return (
            <Banner
                variant="info"
                dismissible
                onDismiss={() => setIsVisible(false)}
            >
                <div className="flex items-start gap-3 pr-8">
                    <Info className="mt-0.5 size-5 text-blue-600" />
                    <div className="text-sm">
                        <strong className="mb-1 block">Pro tip</strong>
                        <p>You can dismiss this banner by clicking the × button. Parent component manages visibility state.</p>
                    </div>
                </div>
            </Banner>
        );
    }
};

// Semantic Variants
export const InfoBanner: Story = {
    args: {
        variant: 'info',
        children: (
            <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 text-blue-600" />
                <div className="text-sm">
                    <strong className="mb-1 block">Information</strong>
                    <p>This is an informational banner.</p>
                </div>
            </div>
        )
    }
};

export const Success: Story = {
    args: {
        variant: 'success',
        children: (
            <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 size-5 text-green-600" />
                <div className="text-sm">
                    <strong className="mb-1 block">Success</strong>
                    <p>Your changes have been saved successfully.</p>
                </div>
            </div>
        )
    }
};

export const Warning: Story = {
    args: {
        variant: 'warning',
        children: (
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-yellow-600" />
                <div className="text-sm">
                    <strong className="mb-1 block">Warning</strong>
                    <p>Please review your settings before continuing.</p>
                </div>
            </div>
        )
    }
};

export const Destructive: Story = {
    args: {
        variant: 'destructive',
        children: (
            <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 size-5 text-red-600" />
                <div className="text-sm">
                    <strong className="mb-1 block">Error</strong>
                    <p>An error occurred while processing your request.</p>
                </div>
            </div>
        )
    }
};

// Size Variants
export const Small: Story = {
    args: {
        size: 'sm',
        variant: 'info',
        children: 'Small banner with compact padding'
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        variant: 'gradient',
        children: (
            <div className="text-base">
                <strong className="mb-2 block">Large Banner</strong>
                <p>This banner has more spacious padding.</p>
            </div>
        )
    }
};

// Interactive Example
export const WithClickableContent: Story = {
    render: () => {
        const [isVisible, setIsVisible] = useState(true);

        if (!isVisible) {
            return (
                <button
                    className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                    type="button"
                    onClick={() => setIsVisible(true)}
                >
                    Show Banner Again
                </button>
            );
        }

        return (
            <Banner
                className="cursor-pointer"
                variant="gradient"
                dismissible
                onClick={() => alert('Banner clicked!')}
                onDismiss={() => setIsVisible(false)}
            >
                <a
                    className="flex flex-col text-black no-underline"
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                    }}
                >
                    <div className="mb-1.5 flex items-center gap-2">
                        <span className='text-yellow'><Sparkles className="size-4" /></span>
                        <span className="text-[13px] font-medium text-gray-600">Announcement</span>
                    </div>
                    <div className="text-base font-semibold">Click me for more details</div>
                </a>
            </Banner>
        );
    }
};

// Accessibility Example
export const AccessibilityAlert: Story = {
    args: {
        variant: 'destructive',
        role: 'alert',
        'aria-label': 'Critical error notification',
        children: (
            <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 size-5 text-red-600" />
                <div className="text-sm">
                    <strong className="mb-1 block">Critical Error</strong>
                    <p>This uses role=&quot;alert&quot; which has implicit aria-live=&quot;assertive&quot; for screen readers.</p>
                </div>
            </div>
        )
    }
};

// All Variants Overview
export const AllVariants: Story = {
    render: () => (
        <div className="space-y-4">
            <Banner variant="default">
                <div className="text-sm">
                    <strong>Default</strong> - Standard banner with subtle border and shadow
                </div>
            </Banner>
            <Banner variant="gradient">
                <div className="flex items-center gap-2 text-sm">
                    <span className='text-yellow'><Sparkles className="size-4" /></span>
                    <strong>Gradient</strong> - Cyan/purple gradient shadow with hover animation
                </div>
            </Banner>
            <Banner variant="info">
                <div className="flex items-center gap-2 text-sm">
                    <Info className="size-5 text-blue-600" />
                    <strong>Info</strong> - Blue-tinted for informational messages
                </div>
            </Banner>
            <Banner variant="success">
                <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="size-5 text-green-600" />
                    <strong>Success</strong> - Green-tinted for success messages
                </div>
            </Banner>
            <Banner variant="warning">
                <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-5 text-yellow-600" />
                    <strong>Warning</strong> - Yellow-tinted for warnings
                </div>
            </Banner>
            <Banner variant="destructive">
                <div className="flex items-center gap-2 text-sm">
                    <XCircle className="size-5 text-red-600" />
                    <strong>Destructive</strong> - Red-tinted for errors
                </div>
            </Banner>
        </div>
    )
};
