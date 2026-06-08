import type {Meta, StoryObj} from '@storybook/react-vite';
import {BarChartLoadingIndicator, LoadingIndicator} from './loading-indicator';

const meta = {
    title: 'Components / Loading indicator',
    component: LoadingIndicator,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Lightweight spinner for inline and page-level loading. Supports `sm`/`md`/`lg` sizes and `dark`/`light` color for contrast on different backgrounds.'
            }
        }
    }
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof LoadingIndicator>;

export const Default: Story = {
    args: {size: 'md'},
    parameters: {
        docs: {
            description: {
                story: 'Default medium size spinner for general loading states.'
            }
        }
    }
};

export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><LoadingIndicator size="sm" /><span className="text-sm">sm</span></div>
            <div className="flex items-center gap-2"><LoadingIndicator size="md" /><span className="text-sm">md</span></div>
            <div className="flex items-center gap-2"><LoadingIndicator size="lg" /><span className="text-sm">lg</span></div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Compare available sizes for different contexts.'
            }
        }
    }
};

export const LightOnDark: Story = {
    render: () => (
        <div className="rounded-md bg-black/80 p-6">
            <div className="flex items-center gap-4 text-white">
                <LoadingIndicator color="light" size="md" />
                <span className="text-sm">Use `color=light` on dark surfaces</span>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use the `light` variant on dark backgrounds to ensure sufficient contrast.'
            }
        }
    }
};

export const BarChartVariant: Story = {
    render: () => (
        <div className="flex h-[120px] items-center justify-center">
            <BarChartLoadingIndicator />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Alternative loading indicator styled like a bar chart, useful for data-heavy views.'
            }
        }
    }
};
