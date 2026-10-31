import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPalette, ColorRow } from '../showcase/color-swatch';
import { ContrastComparison, PaletteComparison } from '../showcase/palette-comparison';

const rawPalette = (cssVars: string[]) =>
  cssVars.map((cssVar) => ({
    name: cssVar.replace(/^--color-[a-z]+-/, ''),
    cssVar,
  }));

const rawPalettes = {
  gray: rawPalette([
    '--color-gray-50',
    '--color-gray-100',
    '--color-gray-200',
    '--color-gray-300',
    '--color-gray-400',
    '--color-gray-500',
    '--color-gray-600',
    '--color-gray-700',
    '--color-gray-800',
    '--color-gray-900',
    '--color-gray-950',
  ]),
  green: rawPalette([
    '--color-green-50',
    '--color-green-100',
    '--color-green-200',
    '--color-green-300',
    '--color-green-400',
    '--color-green-500',
    '--color-green-600',
    '--color-green-700',
    '--color-green-800',
    '--color-green-900',
  ]),
  blue: rawPalette([
    '--color-blue-50',
    '--color-blue-100',
    '--color-blue-200',
    '--color-blue-300',
    '--color-blue-400',
    '--color-blue-500',
    '--color-blue-600',
    '--color-blue-700',
    '--color-blue-800',
    '--color-blue-900',
  ]),
  purple: rawPalette([
    '--color-purple-50',
    '--color-purple-100',
    '--color-purple-200',
    '--color-purple-300',
    '--color-purple-400',
    '--color-purple-500',
    '--color-purple-600',
    '--color-purple-700',
    '--color-purple-800',
    '--color-purple-900',
  ]),
  pink: rawPalette([
    '--color-pink-50',
    '--color-pink-100',
    '--color-pink-200',
    '--color-pink-300',
    '--color-pink-400',
    '--color-pink-500',
    '--color-pink-600',
    '--color-pink-700',
    '--color-pink-800',
    '--color-pink-900',
  ]),
  red: rawPalette([
    '--color-red-50',
    '--color-red-100',
    '--color-red-200',
    '--color-red-300',
    '--color-red-400',
    '--color-red-500',
    '--color-red-600',
    '--color-red-700',
    '--color-red-800',
    '--color-red-900',
  ]),
  orange: rawPalette([
    '--color-orange-50',
    '--color-orange-100',
    '--color-orange-200',
    '--color-orange-300',
    '--color-orange-400',
    '--color-orange-500',
    '--color-orange-600',
    '--color-orange-700',
    '--color-orange-800',
    '--color-orange-900',
  ]),
  yellow: rawPalette([
    '--color-yellow-50',
    '--color-yellow-100',
    '--color-yellow-200',
    '--color-yellow-300',
    '--color-yellow-400',
    '--color-yellow-500',
    '--color-yellow-600',
    '--color-yellow-700',
    '--color-yellow-800',
    '--color-yellow-900',
  ]),
  lime: rawPalette([
    '--color-lime-50',
    '--color-lime-100',
    '--color-lime-200',
    '--color-lime-300',
    '--color-lime-400',
    '--color-lime-500',
    '--color-lime-600',
    '--color-lime-700',
    '--color-lime-800',
    '--color-lime-900',
  ]),
};

const meta = {
  title: 'Tokens / Colors',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Color tokens. Prefer semantic tokens for UI color decisions wherever possible because they carry intent and flip between light and dark mode automatically. Use raw palette tokens only when there is no semantic fit, then use the toolbar light/dark switch to verify.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const RawPalette: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-8">
        <ColorRow swatches={rawPalettes.gray} title="Gray (raw)" />
      </section>
      <section className="flex flex-col gap-8">
        <ColorRow swatches={rawPalettes.green} title="Green" />
        <ColorRow swatches={rawPalettes.blue} title="Blue" />
        <ColorRow swatches={rawPalettes.purple} title="Purple" />
        <ColorRow swatches={rawPalettes.pink} title="Pink" />
        <ColorRow swatches={rawPalettes.red} title="Red" />
        <ColorRow swatches={rawPalettes.orange} title="Orange" />
        <ColorRow swatches={rawPalettes.yellow} title="Yellow" />
        <ColorRow swatches={rawPalettes.lime} title="Lime" />
      </section>
      <ColorPalette
        description="Special raw color tokens that are not part of the stepped palettes."
        swatches={[
          { name: 'white', cssVar: '--color-white' },
          { name: 'black', cssVar: '--color-black' },
          { name: 'transparent', cssVar: '--color-transparent' },
          { name: 'current', cssVar: '--color-current' },
          { name: 'ghostaccent', cssVar: '--color-ghostaccent' },
        ]}
        title="Special raw"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Raw palette. Colour families use a 10-step scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900. Gray adds 950.',
      },
    },
  },
};

export const Admin7Comparison: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <PaletteComparison
        families={[
          {
            name: 'Gray',
            cssVars: [...rawPalettes.gray.map((swatch) => swatch.cssVar), '--color-black'],
          },
          { name: 'Red', cssVars: rawPalettes.red.map((swatch) => swatch.cssVar) },
          { name: 'Orange', cssVars: rawPalettes.orange.map((swatch) => swatch.cssVar) },
          { name: 'Yellow', cssVars: rawPalettes.yellow.map((swatch) => swatch.cssVar) },
          { name: 'Green', cssVars: rawPalettes.green.map((swatch) => swatch.cssVar) },
          { name: 'Blue', cssVars: rawPalettes.blue.map((swatch) => swatch.cssVar) },
          { name: 'Purple', cssVars: rawPalettes.purple.map((swatch) => swatch.cssVar) },
          { name: 'Pink', cssVars: rawPalettes.pink.map((swatch) => swatch.cssVar) },
          {
            name: 'Chart',
            cssVars: [
              '--chart-1',
              '--chart-2',
              '--chart-3',
              '--chart-4',
              '--chart-5',
              '--chart-blue',
              '--chart-darkblue',
              '--chart-teal',
              '--chart-purple',
              '--chart-green',
              '--chart-rose',
            ],
          },
          {
            name: 'Chart (cont.)',
            cssVars: [
              '--chart-orange',
              '--chart-amber',
              '--chart-yellow',
              '--chart-gray',
              '--chart-darkgray',
            ],
          },
        ]}
      />
      <ContrastComparison
        pairs={[
          { label: 'Primary text', text: '--text-primary', background: '--background' },
          { label: 'Secondary text', text: '--text-secondary', background: '--background' },
          { label: 'Tertiary text', text: '--text-tertiary', background: '--background' },
          { label: 'Destructive text', text: '--destructive', background: '--background' },
          {
            label: 'Destructive button',
            text: '--destructive-foreground',
            background: '--destructive',
          },
          { label: 'Primary button', text: '--primary-foreground', background: '--primary' },
          { label: 'Danger text', text: '--state-danger', background: '--background' },
          { label: 'Success text', text: '--state-success', background: '--background' },
          { label: 'Warning text', text: '--state-warning', background: '--background' },
          { label: 'Info text', text: '--state-info', background: '--background' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The admin7Design palette next to the previous one, with WCAG contrast for the main text pairs (AA needs 4.5). Light mode only: dark mode keeps the previous palette until it gets its Admin 7 colours. Gray keeps Shade's lightness at each step with Shapeshifter's warm hue; the colour families are Shapeshifter's ramps.",
      },
    },
  },
};

export const SemanticAuthoring: Story = {
  render: () => (
    <div className="max-w-3xl space-y-4 text-sm text-text-secondary">
      <p>
        Semantic color variables in <code>theme-variables.css</code> should resolve directly to raw
        color tokens such as <code>--color-gray-700</code>, not to another semantic token such as{' '}
        <code>--foreground</code> or <code>--muted-foreground</code>, unless the two must always
        match and the alias is deliberate, like <code>--interactive-hover</code> pointing at{' '}
        <code>--button-hover</code>.
      </p>
      <p>
        This keeps each semantic decision inspectable in one place while the raw palette remains the
        single source of concrete color values. Tailwind-facing aliases still live in{' '}
        <code>tailwind.theme.css</code>.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Authoring rule for semantic color variables.',
      },
    },
  },
};

export const CoreChrome: Story = {
  render: () => (
    <ColorPalette
      description="Default chrome tokens used by most components. Most consumers should reach for surface / text / border tokens above instead of these."
      swatches={[
        { name: 'background', cssVar: '--background' },
        { name: 'foreground', cssVar: '--foreground' },
        { name: 'primary', cssVar: '--primary' },
        { name: 'primary-foreground', cssVar: '--primary-foreground' },
        { name: 'secondary', cssVar: '--secondary' },
        { name: 'muted', cssVar: '--muted' },
        { name: 'muted-foreground', cssVar: '--muted-foreground' },
        { name: 'accent', cssVar: '--accent' },
        { name: 'destructive', cssVar: '--destructive' },
        { name: 'card', cssVar: '--card' },
        { name: 'popover', cssVar: '--popover' },
        { name: 'ring', cssVar: '--ring' },
      ]}
      title="Core chrome"
    />
  ),
};

export const Surface: Story = {
  render: () => (
    <ColorPalette
      description="Backgrounds with intent, ordered by elevation. Page is the main canvas. Panel is the standard contained surface and aliases card today so it can diverge later. Elevated is for raised or interactive surfaces (sidebars, cards, headers). Elevated-2 is reserved for surfaces that sit ABOVE an elevated surface — floating menus, popovers, dropdowns. In light mode all four are near-white; in dark they form a step ladder so layered surfaces stay legible."
      swatches={[
        { name: 'page', cssVar: '--surface-page' },
        { name: 'panel', cssVar: '--surface-panel' },
        { name: 'elevated', cssVar: '--surface-elevated' },
        { name: 'elevated-2', cssVar: '--surface-elevated-2' },
        { name: 'glass', cssVar: '--surface-glass' },
        { name: 'filter-bar', cssVar: '--filter-bar-background' },
        { name: 'control-readonly', cssVar: '--control-readonly-surface' },
      ]}
      title="Surface"
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Pick the surface based on what sits behind it. Page for the canvas. Elevated lifts ONE step above page (sidebar, card, sticky header). Elevated-2 lifts above an elevated surface (a dropdown that opens FROM the sidebar uses elevated-2 so it reads as floating above, not blending into, the sidebar).',
      },
    },
  },
};

export const InteractiveSurfaces: Story = {
  render: () => (
    <ColorPalette
      description="Tinted surfaces used for hover, active, and selected states. The overlay tokens (interactive-hover, button-hover, tab-hover, tab-active) are translucent in dark mode so they composite over whatever surface sits behind them — don't use them where an opaque fill is required (e.g. sticky table cells). table-row-hover is the opaque exception: it resolves to --color-sidebar-bg in dark mode and is the right choice for sticky / scrolling-content cells where translucency would let content bleed through."
      swatches={[
        { name: 'interactive-hover', cssVar: '--interactive-hover' },
        { name: 'button-hover', cssVar: '--button-hover' },
        { name: 'filter-bar-item-hover', cssVar: '--filter-bar-item-hover' },
        { name: 'tab-hover', cssVar: '--tab-hover' },
        { name: 'tab-active', cssVar: '--tab-active' },
        { name: 'table-row-hover', cssVar: '--table-row-hover' },
      ]}
      title="Interactive surfaces"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: [
          'Each token corresponds to one type of consumer:',
          '',
          '- **interactive-hover** — generic hover surface for dropdown items, menu items, list rows, filter options, etc. The catch-all.',
          '- **button-hover** — outline / dropdown button hover. Currently the same value as interactive-hover; kept as a separate token so the button surface can diverge later.',
          '- **filter-bar-item-hover** — filter chips and the add-filter button. In dark mode it matches the sidebar navigation hover.',
          '- **tab-hover / tab-active** — `Tabs` (button, button-sm, pill, kpis variants), `PageMenu` items, and sidebar menu items.',
          '- **table-row-hover** — Shade `Table` row hover (also reused for list-row patterns that visually behave like table rows: top posts list, comments list, members sticky cell). This one is opaque — it tracks --color-sidebar-bg in dark — so it works where the row sits over scrolling content.',
          '',
          'When in doubt, reach for `interactive-hover`. Use the specific tokens only when the consumer maps to one of the categories above.',
        ].join('\n'),
      },
    },
  },
};

export const Text: Story = {
  render: () => (
    <ColorPalette
      description="Hierarchy for body and label copy. Primary is the default body tone, secondary supports subdued labels and helper text, and tertiary is reserved for the quietest supporting copy or empty-state details."
      swatches={[
        { name: 'primary', cssVar: '--text-primary' },
        { name: 'secondary', cssVar: '--text-secondary' },
        { name: 'tertiary', cssVar: '--text-tertiary' },
      ]}
      title="Text"
    />
  ),
};

export const Border: Story = {
  render: () => (
    <ColorPalette
      description="Default border for component outlines, control-border for form controls (inputs, outline buttons, dropdown triggers), strong border for emphasized states, and the focus ring color."
      swatches={[
        { name: 'default', cssVar: '--border-default' },
        { name: 'control-border', cssVar: '--control-border' },
        { name: 'strong', cssVar: '--border-strong' },
        { name: 'glass', cssVar: '--border-glass' },
        { name: 'focus-ring', cssVar: '--focus-ring' },
      ]}
      title="Border &amp; focus"
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Use `--control-border` (not `--border-default`) for inputs, textareas, outline buttons, and dropdown triggers — it lifts a step above the page border in dark mode so form controls keep enough contrast against the page surface.',
      },
    },
  },
};

export const State: Story = {
  render: () => (
    <ColorPalette
      description="Semantic state colors for badges, banners, and inline feedback. Each has a matching foreground for text on top."
      swatches={[
        { name: 'info', cssVar: '--state-info' },
        { name: 'success', cssVar: '--state-success' },
        { name: 'warning', cssVar: '--state-warning' },
        { name: 'danger', cssVar: '--state-danger' },
      ]}
      title="State"
    />
  ),
};

export const ChartColors: Story = {
  render: () => (
    <ColorPalette
      description="Reserved for data visualisation. Don't use these for UI chrome."
      swatches={[
        { name: 'chart-1', cssVar: '--chart-1' },
        { name: 'chart-2', cssVar: '--chart-2' },
        { name: 'chart-3', cssVar: '--chart-3' },
        { name: 'chart-4', cssVar: '--chart-4' },
        { name: 'chart-5', cssVar: '--chart-5' },
        { name: 'rose', cssVar: '--chart-rose' },
        { name: 'orange', cssVar: '--chart-orange' },
        { name: 'amber', cssVar: '--chart-amber' },
        { name: 'yellow', cssVar: '--chart-yellow' },
        { name: 'green', cssVar: '--chart-green' },
        { name: 'teal', cssVar: '--chart-teal' },
        { name: 'blue', cssVar: '--chart-blue' },
        { name: 'darkblue', cssVar: '--chart-darkblue' },
        { name: 'purple', cssVar: '--chart-purple' },
        { name: 'gray', cssVar: '--chart-gray' },
      ]}
      title="Chart"
    />
  ),
};
