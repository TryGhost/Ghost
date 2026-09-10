import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { Inline } from '@/components/primitives';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const meta = {
  title: 'Components / Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Brief, non-interactive labels for hover or keyboard focus. TooltipContent supports default and white variants; white uses the elevated surface token and a shadow, adapting to dark mode. Set TooltipProvider delayDuration (milliseconds, default 700) for the first hover and skipDelayDuration (default 300) for moving between triggers without waiting again. Tooltip delayDuration overrides its provider; keyboard focus opens immediately.',
      },
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  argTypes: {
    children: { table: { disable: true } },
    delayDuration: {
      control: { type: 'number', min: 0, step: 100 },
      description: 'Hover delay in milliseconds. Overrides the nearest TooltipProvider.',
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'The existing tooltip treatment, shown on hover or focus.' } },
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover or focus me</Button>
      </TooltipTrigger>
      <TooltipContent>Tooltip content</TooltipContent>
    </Tooltip>
  ),
};

export const White: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A white surface with a shadow in light mode; uses the elevated surface in dark mode. Hover or Tab to the trigger.',
      },
    },
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover or focus me</Button>
      </TooltipTrigger>
      <TooltipContent variant="white">Tooltip content</TooltipContent>
    </Tooltip>
  ),
};

export const FirstHoverDelay: Story = {
  args: { delayDuration: 500 },
  parameters: {
    docs: {
      description: {
        story:
          'Wait for the first tooltip, then move to another button within the 300ms skip window to see its tooltip immediately. Adjust delayDuration in Controls; keyboard focus still opens immediately.',
      },
    },
  },
  render: ({ delayDuration }) => (
    <TooltipProvider delayDuration={delayDuration} skipDelayDuration={300}>
      <Inline gap="sm">
        {['Search', 'Filter', 'More actions'].map((label) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button variant="outline">{label}</Button>
            </TooltipTrigger>
            <TooltipContent variant="white">{label}</TooltipContent>
          </Tooltip>
        ))}
      </Inline>
    </TooltipProvider>
  ),
};

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Disabled buttons do not open tooltips or receive keyboard focus. Keep essential explanations visible outside the tooltip.',
      },
    },
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline" disabled>
          Unavailable action
        </Button>
      </TooltipTrigger>
      <TooltipContent variant="white">Tooltip content</TooltipContent>
    </Tooltip>
  ),
};

export const Placement: Story = {
  parameters: {
    docs: {
      description: { story: 'Use side and align to position a tooltip around its trigger.' },
    },
  },
  render: (args) => (
    <Inline gap="md" wrap>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} {...args}>
          <TooltipTrigger asChild>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
        </Tooltip>
      ))}
    </Inline>
  ),
};
