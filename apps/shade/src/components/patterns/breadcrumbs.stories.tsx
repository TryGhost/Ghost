import type {Meta, StoryObj} from '@storybook/react-vite';
import {Breadcrumbs} from '@/components/patterns/breadcrumbs';

const meta = {
    title: 'Patterns / Breadcrumbs',
    component: Breadcrumbs,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'The standard admin breadcrumb trail: optional back arrow, ancestor links, chevron separators, and the current page.'
            }
        }
    }
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Ancestors as click handlers plus the current page — the shape used by in-app navigation.'
            }
        }
    },
    args: {
        items: [{label: 'Offers', onClick: () => {}}],
        current: 'Black Friday'
    }
};

export const WithBackButton: Story = {
    name: 'With back button',
    parameters: {
        docs: {
            description: {
                story: 'Passing `onBack` adds a leading back arrow; below the md breakpoint the trail hides, leaving just the arrow.'
            }
        }
    },
    args: {
        items: [{label: 'Offers', onClick: () => {}}],
        current: 'Black Friday',
        onBack: () => {}
    }
};

export const WithHrefs: Story = {
    name: 'With hrefs',
    parameters: {
        docs: {
            description: {
                story: 'Ancestors can be plain links when a URL exists instead of a click handler.'
            }
        }
    },
    args: {
        items: [
            {label: 'Audience', href: '#'},
            {label: 'Members', href: '#'}
        ],
        current: 'Jamie Larson'
    }
};
