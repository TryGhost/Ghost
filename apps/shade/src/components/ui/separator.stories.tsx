import type {Meta, StoryObj} from '@storybook/react-vite';
import {Separator} from './separator';

const meta = {
    title: 'Components / Separator',
    component: Separator,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'A thin rule used to group and divide content. Supports horizontal or vertical orientation and can be decorative or semantic for accessibility.'
            }
        }
    }
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
    args: {},
    parameters: {
        docs: {
            description: {
                story: 'Default horizontal separator spanning the container width.'
            }
        }
    }
};

export const WithLabel: Story = {
    render: args => (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Section title</div>
            <Separator {...args} />
            <div className="text-sm">Content below the labeled section.</div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Common usage: separate a labeled section from following content.'
            }
        }
    }
};

export const Vertical: Story = {
    render: args => (
        <div className="flex items-center gap-4">
            <span>Item A</span>
            <Separator className="h-6" orientation="vertical" {...args} />
            <span>Item B</span>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Vertical orientation for inline grouping (e.g., toolbar items). Adjust height with Tailwind classes.'
            }
        }
    }
};

export const NonDecorative: Story = {
    args: {
        decorative: false
    },
    render: args => (
        <div>
            <div className="text-sm">Semantic divider (exposed to assistive tech)</div>
            <Separator aria-label="Content divider" {...args} />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Set `decorative=false` when the separator conveys meaning. Include an accessible label.'
            }
        }
    }
};
