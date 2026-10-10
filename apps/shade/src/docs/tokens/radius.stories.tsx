import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadiusGrid } from '../showcase/radius-grid';

const meta = {
  title: 'Tokens / Radius',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Border-radius scale. Prefer semantic aliases such as `radius-control`, `radius-menu`, `radius-menu-item`, `radius-surface`, and `radius-pill` over numeric steps when the use case fits.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Numeric: Story = {
  render: () => (
    <RadiusGrid
      description="The base scale Tailwind `rounded-*` utilities map to."
      radii={[
        { name: 'xs', cssVar: '--radius-xs' },
        { name: 'sm', cssVar: '--radius-sm' },
        { name: 'md', cssVar: '--radius-md' },
        { name: 'lg', cssVar: '--radius-lg' },
        { name: 'xl', cssVar: '--radius-xl' },
        { name: '2xl', cssVar: '--radius-2xl' },
        { name: '3xl', cssVar: '--radius-3xl' },
        { name: 'full', cssVar: '--radius-full' },
      ]}
      title="Numeric"
    />
  ),
};

export const Semantic: Story = {
  render: () => (
    <RadiusGrid
      description="Use these by intent: controls, menus and menu items, surfaces, pills and badges, and trend badges. They alias the numeric scale so the visual rhythm stays consistent if we ever shift it."
      radii={[
        { name: 'control', cssVar: '--radius-control' },
        { name: 'control sm', cssVar: '--radius-control-sm' },
        { name: 'menu', cssVar: '--radius-menu' },
        { name: 'menu item', cssVar: '--radius-menu-item' },
        { name: 'surface', cssVar: '--radius-surface' },
        { name: 'badge', cssVar: '--radius-badge' },
        { name: 'pill', cssVar: '--radius-pill' },
        { name: 'trend badge', cssVar: '--radius-trend-badge' },
      ]}
      title="Semantic"
    />
  ),
};
