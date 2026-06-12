import type {Meta, StoryObj} from '@storybook/react-vite';
import {ColorPalette, ColorRow} from '../showcase/color-swatch';

const rawPalette = (cssVars: string[]) => cssVars.map(cssVar => ({
    name: cssVar.replace(/^--color-[a-z]+-/, ''),
    cssVar
}));

const rawPalettes = {
    gray: rawPalette(['--color-gray-50', '--color-gray-100', '--color-gray-200', '--color-gray-300', '--color-gray-400', '--color-gray-500', '--color-gray-600', '--color-gray-700', '--color-gray-800', '--color-gray-900', '--color-gray-950']),
    grey: rawPalette(['--color-grey-50', '--color-grey-100', '--color-grey-200', '--color-grey-300', '--color-grey-400', '--color-grey-500', '--color-grey-600', '--color-grey-700', '--color-grey-800', '--color-grey-900', '--color-grey-950']),
    green: rawPalette(['--color-green-50', '--color-green-100', '--color-green-200', '--color-green-300', '--color-green-400', '--color-green-500', '--color-green-600', '--color-green-700', '--color-green-800', '--color-green-900', '--color-green-950']),
    blue: rawPalette(['--color-blue-50', '--color-blue-100', '--color-blue-200', '--color-blue-300', '--color-blue-400', '--color-blue-500', '--color-blue-600', '--color-blue-700', '--color-blue-800', '--color-blue-900', '--color-blue-950']),
    purple: rawPalette(['--color-purple-50', '--color-purple-100', '--color-purple-200', '--color-purple-300', '--color-purple-400', '--color-purple-500', '--color-purple-600', '--color-purple-700', '--color-purple-800', '--color-purple-900', '--color-purple-950']),
    pink: rawPalette(['--color-pink-50', '--color-pink-100', '--color-pink-200', '--color-pink-300', '--color-pink-400', '--color-pink-500', '--color-pink-600', '--color-pink-700', '--color-pink-800', '--color-pink-900', '--color-pink-950']),
    red: rawPalette(['--color-red-50', '--color-red-100', '--color-red-200', '--color-red-300', '--color-red-400', '--color-red-500', '--color-red-600', '--color-red-700', '--color-red-800', '--color-red-900', '--color-red-950']),
    orange: rawPalette(['--color-orange-50', '--color-orange-100', '--color-orange-200', '--color-orange-300', '--color-orange-400', '--color-orange-500', '--color-orange-600', '--color-orange-700', '--color-orange-800', '--color-orange-900', '--color-orange-950']),
    yellow: rawPalette(['--color-yellow-50', '--color-yellow-100', '--color-yellow-200', '--color-yellow-300', '--color-yellow-400', '--color-yellow-500', '--color-yellow-600', '--color-yellow-700', '--color-yellow-800', '--color-yellow-900', '--color-yellow-950']),
    lime: rawPalette(['--color-lime-50', '--color-lime-100', '--color-lime-200', '--color-lime-300', '--color-lime-400', '--color-lime-500', '--color-lime-600', '--color-lime-700', '--color-lime-800', '--color-lime-900', '--color-lime-950'])
};

const meta = {
    title: 'Tokens / Colors',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Color tokens. Prefer semantic tokens for UI color decisions wherever possible because they carry intent and flip between light and dark mode automatically. Use raw palette tokens only when there is no semantic fit, then use the toolbar light/dark switch to verify.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const RawPalette: Story = {
    render: () => (
        <div className="flex flex-col gap-10">
            <section className="flex flex-col gap-8">
                <ColorRow
                    swatches={rawPalettes.gray}
                    title="Gray (raw)"
                />
                <ColorRow
                    swatches={rawPalettes.grey}
                    title="Grey (raw duplicate)"
                />
            </section>
            <section className="flex flex-col gap-8">
                <ColorRow
                    swatches={rawPalettes.green}
                    title="Green"
                />
                <ColorRow
                    swatches={rawPalettes.blue}
                    title="Blue"
                />
                <ColorRow
                    swatches={rawPalettes.purple}
                    title="Purple"
                />
                <ColorRow
                    swatches={rawPalettes.pink}
                    title="Pink"
                />
                <ColorRow
                    swatches={rawPalettes.red}
                    title="Red"
                />
                <ColorRow
                    swatches={rawPalettes.orange}
                    title="Orange"
                />
                <ColorRow
                    swatches={rawPalettes.yellow}
                    title="Yellow"
                />
                <ColorRow
                    swatches={rawPalettes.lime}
                    title="Lime"
                />
            </section>
            <ColorPalette
                description="Special raw color tokens that are not part of the stepped palettes."
                swatches={[
                    {name: 'white', cssVar: '--color-white'},
                    {name: 'black', cssVar: '--color-black'},
                    {name: 'transparent', cssVar: '--color-transparent'},
                    {name: 'current', cssVar: '--color-current'},
                    {name: 'ghostaccent', cssVar: '--color-ghostaccent'}
                ]}
                title="Special raw"
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Raw palette. Gray and grey are kept as duplicate 11-step scales for this sweep; naming consolidation is handled separately. Brand palettes use the Tailwind-style 11-step scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.'
            }
        }
    }
};

export const SemanticAuthoring: Story = {
    render: () => (
        <div className="max-w-3xl space-y-4 text-sm text-text-secondary">
            <p>
                Semantic color variables in <code>theme-variables.css</code> should resolve directly to raw color tokens such as <code>--color-gray-700</code>, not to another semantic token such as <code>--foreground</code> or <code>--muted-foreground</code>.
            </p>
            <p>
                This keeps each semantic decision inspectable in one place while the raw palette remains the single source of concrete color values. Tailwind-facing aliases still live in <code>tailwind.theme.css</code>.
            </p>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Authoring rule for semantic color variables.'
            }
        }
    }
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

export const Surface: Story = {
    render: () => (
        <ColorPalette
            description="Backgrounds with intent. Page is the main canvas. Panel is the standard contained surface and aliases card today so it can diverge later. Elevated is for raised or interactive surfaces: it matches page in light mode today and separates by color in dark mode, leaving borders and shadows to carry light-mode elevation."
            swatches={[
                {name: 'page', cssVar: '--surface-page'},
                {name: 'panel', cssVar: '--surface-panel'},
                {name: 'elevated', cssVar: '--surface-elevated'}
            ]}
            title="Surface"
        />
    )
};

export const Text: Story = {
    render: () => (
        <ColorPalette
            description="Hierarchy for body and label copy. Primary is the default body tone, secondary supports subdued labels and helper text, and tertiary is reserved for the quietest supporting copy or empty-state details."
            swatches={[
                {name: 'primary', cssVar: '--text-primary'},
                {name: 'secondary', cssVar: '--text-secondary'},
                {name: 'tertiary', cssVar: '--text-tertiary'}
            ]}
            title="Text"
        />
    )
};

export const Border: Story = {
    render: () => (
        <ColorPalette
            description="Default border for component outlines, strong border for emphasized states, and the focus ring color."
            swatches={[
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

export const ChartColors: Story = {
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
