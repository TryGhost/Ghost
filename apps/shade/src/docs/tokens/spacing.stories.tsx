import type {Meta, StoryObj} from '@storybook/react-vite';
import {SpacingBase, SpacingScale} from '../showcase/spacing-scale';

const meta = {
    title: 'Tokens / Spacing',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'A single base unit (`--spacing`, 0.4rem) drives every Tailwind spacing utility and the semantic gap scale used by primitives.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Base: Story = {
    render: () => <SpacingBase />
};

export const Scale: Story = {
    render: () => (
        <SpacingScale
            steps={[
                {name: 'p-1', multiplier: 1},
                {name: 'p-2', multiplier: 2},
                {name: 'p-3', multiplier: 3},
                {name: 'p-4', multiplier: 4},
                {name: 'p-6', multiplier: 6},
                {name: 'p-8', multiplier: 8},
                {name: 'p-10', multiplier: 10},
                {name: 'p-12', multiplier: 12},
                {name: 'p-16', multiplier: 16},
                {name: 'p-20', multiplier: 20},
                {name: 'p-24', multiplier: 24}
            ]}
        />
    )
};

export const SemanticGaps: Story = {
    render: () => (
        <div className="flex flex-col gap-4 text-sm text-text-secondary">
            <p>Primitives (`Stack`, `Inline`, `Box`, `Grid`) accept a semantic gap scale instead of raw numbers. The named values map to the same base unit but make intent readable.</p>
            <table className="w-full max-w-md text-left">
                <thead>
                    <tr className="border-b border-border-default">
                        <th className="py-2 pr-6 text-xs font-semibold">Name</th>
                        <th className="py-2 text-xs font-semibold">Maps to</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>none</code></td><td><code>0</code></td></tr>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>xs</code></td><td><code>p-1</code></td></tr>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>sm</code></td><td><code>p-2</code></td></tr>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>md</code></td><td><code>p-4</code></td></tr>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>lg</code></td><td><code>p-6</code></td></tr>
                    <tr className="border-b border-border-subtle"><td className="py-2 pr-6"><code>xl</code></td><td><code>p-8</code></td></tr>
                    <tr><td className="py-2 pr-6"><code>2xl</code></td><td><code>p-12</code></td></tr>
                </tbody>
            </table>
        </div>
    )
};
