import type {Meta, StoryObj} from '@storybook/react-vite';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis} from './breadcrumb';
import {Slash, Home} from 'lucide-react';

const meta = {
    title: 'Components / Breadcrumb',
    component: Breadcrumb,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Breadcrumb navigation component showing the user\'s current location within a hierarchy. Built with semantic navigation markup for accessibility.'
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
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
    args: {
        children: (
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Standard breadcrumb navigation with links and current page indicator.'
            }
        }
    }
};

export const WithIcon: Story = {
    args: {
        children: (
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">
                        <Home className="size-4" />
                        Home
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Project Alpha</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Breadcrumb with home icon and deeper navigation hierarchy.'
            }
        }
    }
};

export const CustomSeparator: Story = {
    args: {
        children: (
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <Slash />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/products">Products</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <Slash />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/products/electronics">Electronics</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <Slash />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                    <BreadcrumbPage>Laptop</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Breadcrumb using custom separator (slash) instead of default chevron.'
            }
        }
    }
};

export const WithEllipsis: Story = {
    args: {
        children: (
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/settings/account">Account</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Security</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Breadcrumb with ellipsis to indicate collapsed middle levels in deep navigation.'
            }
        }
    }
};

export const Simple: Story = {
    args: {
        children: (
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Minimal breadcrumb with just two levels.'
            }
        }
    }
};
