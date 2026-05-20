import type {Meta, StoryObj} from '@storybook/react-vite';
import {ColorPalette, ColorRow} from '../showcase/color-swatch';

const meta = {
    title: 'Tokens / Colors',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Color tokens. Semantic tokens (surface, text, border, state) flip between light and dark mode automatically. Use the toolbar light/dark switch to verify.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Surface: Story = {
    render: () => (
        <ColorPalette
            description="Backgrounds with intent. Use these instead of raw color values for any container chrome."
            swatches={[
                {name: 'page', cssVar: '--surface-page'},
                {name: 'panel', cssVar: '--surface-panel'},
                {name: 'elevated', cssVar: '--surface-elevated'},
                {name: 'overlay', cssVar: '--surface-overlay'},
                {name: 'inverse', cssVar: '--surface-inverse'}
            ]}
            title="Surface"
        />
    )
};

export const Text: Story = {
    render: () => (
        <ColorPalette
            description="Hierarchy for body and label copy. Reach for these instead of foreground variants when you want explicit hierarchy."
            swatches={[
                {name: 'primary', cssVar: '--text-primary'},
                {name: 'secondary', cssVar: '--text-secondary'},
                {name: 'tertiary', cssVar: '--text-tertiary'},
                {name: 'inverse', cssVar: '--text-inverse'}
            ]}
            title="Text"
        />
    )
};

export const Border: Story = {
    render: () => (
        <ColorPalette
            description="Three weights of border plus the focus ring color."
            swatches={[
                {name: 'subtle', cssVar: '--border-subtle'},
                {name: 'default', cssVar: '--border-default'},
                {name: 'strong', cssVar: '--border-strong'},
                {name: 'focus-ring', cssVar: '--focus-ring'}
            ]}
            title="Border &amp; focus"
        />
    )
};

export const State: Story = {
    render: () => (
        <ColorPalette
            description="Semantic state colors for badges, banners, and inline feedback. Each has a matching foreground for text on top."
            swatches={[
                {name: 'info', cssVar: '--state-info'},
                {name: 'success', cssVar: '--state-success'},
                {name: 'warning', cssVar: '--state-warning'},
                {name: 'danger', cssVar: '--state-danger'}
            ]}
            title="State"
        />
    )
};

export const CoreChrome: Story = {
    render: () => (
        <ColorPalette
            description="Default chrome tokens used by most components. Most consumers should reach for surface / text / border tokens above instead of these."
            swatches={[
                {name: 'background', cssVar: '--background'},
                {name: 'foreground', cssVar: '--foreground'},
                {name: 'primary', cssVar: '--primary'},
                {name: 'primary-foreground', cssVar: '--primary-foreground'},
                {name: 'secondary', cssVar: '--secondary'},
                {name: 'muted', cssVar: '--muted'},
                {name: 'muted-foreground', cssVar: '--muted-foreground'},
                {name: 'accent', cssVar: '--accent'},
                {name: 'destructive', cssVar: '--destructive'},
                {name: 'card', cssVar: '--card'},
                {name: 'popover', cssVar: '--popover'},
                {name: 'ring', cssVar: '--ring'}
            ]}
            title="Core chrome"
        />
    )
};

export const Chart: Story = {
    render: () => (
        <ColorPalette
            description="Reserved for data visualisation. Don't use these for UI chrome."
            swatches={[
                {name: 'chart-1', cssVar: '--chart-1'},
                {name: 'chart-2', cssVar: '--chart-2'},
                {name: 'chart-3', cssVar: '--chart-3'},
                {name: 'chart-4', cssVar: '--chart-4'},
                {name: 'chart-5', cssVar: '--chart-5'},
                {name: 'rose', cssVar: '--chart-rose'},
                {name: 'orange', cssVar: '--chart-orange'},
                {name: 'amber', cssVar: '--chart-amber'},
                {name: 'yellow', cssVar: '--chart-yellow'},
                {name: 'green', cssVar: '--chart-green'},
                {name: 'teal', cssVar: '--chart-teal'},
                {name: 'blue', cssVar: '--chart-blue'},
                {name: 'darkblue', cssVar: '--chart-darkblue'},
                {name: 'purple', cssVar: '--chart-purple'},
                {name: 'gray', cssVar: '--chart-gray'}
            ]}
            title="Chart"
        />
    )
};

export const RawGray: Story = {
    render: () => (
        <ColorRow
            swatches={[
                {name: '50', cssVar: '--color-gray-50'},
                {name: '75', cssVar: '--color-gray-75'},
                {name: '100', cssVar: '--color-gray-100'},
                {name: '150', cssVar: '--color-gray-150'},
                {name: '200', cssVar: '--color-gray-200'},
                {name: '250', cssVar: '--color-gray-250'},
                {name: '300', cssVar: '--color-gray-300'},
                {name: '400', cssVar: '--color-gray-400'},
                {name: '500', cssVar: '--color-gray-500'},
                {name: '600', cssVar: '--color-gray-600'},
                {name: '700', cssVar: '--color-gray-700'},
                {name: '800', cssVar: '--color-gray-800'},
                {name: '900', cssVar: '--color-gray-900'},
                {name: '925', cssVar: '--color-gray-925'},
                {name: '950', cssVar: '--color-gray-950'},
                {name: '975', cssVar: '--color-gray-975'}
            ]}
            title="Gray (raw)"
        />
    ),
    parameters: {docs: {description: {story: 'Raw palette. Reach for these only when a semantic token doesn\'t fit — they don\'t flip in dark mode.'}}}
};

export const RawBrand: Story = {
    render: () => (
        <div className="flex flex-col gap-8">
            <ColorRow
                swatches={[
                    {name: 'green-100', cssVar: '--color-green-100'},
                    {name: 'green-400', cssVar: '--color-green-400'},
                    {name: 'green-500', cssVar: '--color-green-500'},
                    {name: 'green-600', cssVar: '--color-green-600'}
                ]}
                title="Green"
            />
            <ColorRow
                swatches={[
                    {name: 'blue-100', cssVar: '--color-blue-100'},
                    {name: 'blue-400', cssVar: '--color-blue-400'},
                    {name: 'blue-500', cssVar: '--color-blue-500'},
                    {name: 'blue-600', cssVar: '--color-blue-600'},
                    {name: 'blue-700', cssVar: '--color-blue-700'}
                ]}
                title="Blue"
            />
            <ColorRow
                swatches={[
                    {name: 'purple-100', cssVar: '--color-purple-100'},
                    {name: 'purple-400', cssVar: '--color-purple-400'},
                    {name: 'purple-500', cssVar: '--color-purple-500'},
                    {name: 'purple-600', cssVar: '--color-purple-600'}
                ]}
                title="Purple"
            />
            <ColorRow
                swatches={[
                    {name: 'pink-100', cssVar: '--color-pink-100'},
                    {name: 'pink-400', cssVar: '--color-pink-400'},
                    {name: 'pink-500', cssVar: '--color-pink-500'},
                    {name: 'pink-600', cssVar: '--color-pink-600'}
                ]}
                title="Pink"
            />
            <ColorRow
                swatches={[
                    {name: 'red-100', cssVar: '--color-red-100'},
                    {name: 'red-400', cssVar: '--color-red-400'},
                    {name: 'red-500', cssVar: '--color-red-500'},
                    {name: 'red-600', cssVar: '--color-red-600'}
                ]}
                title="Red"
            />
            <ColorRow
                swatches={[
                    {name: 'orange-100', cssVar: '--color-orange-100'},
                    {name: 'orange-400', cssVar: '--color-orange-400'},
                    {name: 'orange-500', cssVar: '--color-orange-500'},
                    {name: 'orange-600', cssVar: '--color-orange-600'}
                ]}
                title="Orange"
            />
            <ColorRow
                swatches={[
                    {name: 'yellow-100', cssVar: '--color-yellow-100'},
                    {name: 'yellow-400', cssVar: '--color-yellow-400'},
                    {name: 'yellow-500', cssVar: '--color-yellow-500'},
                    {name: 'yellow-600', cssVar: '--color-yellow-600'}
                ]}
                title="Yellow"
            />
        </div>
    )
};
