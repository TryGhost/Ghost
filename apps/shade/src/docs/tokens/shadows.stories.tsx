import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShadowGrid } from '@/docs/showcase/shadow-grid';

const meta = {
  title: 'Tokens / Shadows',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          "Elevation tokens. The control-pressed token is the shared inset shadow for pressed and expanded pill controls; outline controls compose it with their resting elevation. Its light and dark values match the existing outline pressed treatment. Most surfaces are flat or use `--shadow-sm`; heavier shadows are reserved for popovers, modals, and dropdowns.\n\n**Dark mode:** Tailwind v4 inlines the `@theme --shadow-*` values at compile time, so per-token overrides don't propagate to the utility classes. Dark mode applies stronger shadow values via direct `.dark .shadow-*` overrides in `theme-variables.css` (alpha 0.35–0.65, ~3× the default). Consumers don't need to do anything — use the standard `shadow-md` / `shadow-lg` utilities and they pick up the boosted values automatically in dark mode.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Scale: Story = {
  render: () => (
    <ShadowGrid
      shadows={[
        { name: 'xs', cssVar: '--shadow-xs' },
        { name: 'sm', cssVar: '--shadow-sm' },
        { name: 'default', cssVar: '--shadow' },
        { name: 'md', cssVar: '--shadow-md' },
        { name: 'md-heavy', cssVar: '--shadow-md-heavy' },
        { name: 'lg', cssVar: '--shadow-lg' },
        { name: 'xl', cssVar: '--shadow-xl' },
        { name: 'inner', cssVar: '--shadow-inner' },
        { name: 'control-pressed', cssVar: '--shadow-control-pressed' },
      ]}
    />
  ),
};
