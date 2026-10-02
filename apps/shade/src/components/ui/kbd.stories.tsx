import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, KbdGroup } from './kbd';
import { Button } from './button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
import { InputGroup, InputGroupInput, InputGroupAddon } from './input-group';
import { Inline, Stack, Text } from '@/components/primitives';

const meta = {
  title: 'Components / Kbd',
  component: Kbd,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Displays keyboard keys and shortcuts in a styled format. Use to indicate keyboard input or shortcuts in tooltips, buttons, and documentation. The contrast variant uses a slightly darker background on light surfaces such as sidebars. KbdGroup is an unstyled layout container; each Kbd owns its keycap appearance, avoiding inherited keycap styles around the whole group.',
      },
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
  args: {
    children: 'Ctrl',
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic usage displaying a single keyboard key.',
      },
    },
  },
};

export const Contrast: Story = {
  args: { variant: 'contrast', children: '⌘' },
  render: (args) => (
    <Stack className="rounded-lg bg-sidebar p-5" gap="md">
      <Inline gap="sm">
        <Text size="sm">Default</Text>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Inline>
      <Inline gap="sm">
        <Text size="sm">Contrast</Text>
        <KbdGroup>
          <Kbd {...args} />
          <Kbd variant="contrast">K</Kbd>
        </KbdGroup>
      </Inline>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Use variant="contrast" when keycaps need more separation from a light surface, such as a sidebar. Semantic colors adapt to dark mode; tooltip styling is preserved.',
      },
    },
  },
};

export const KeyboardKeyGroup: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use `KbdGroup` to display multiple related keyboard keys together, such as modifier keys.',
      },
    },
  },
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>⌃</Kbd>
    </KbdGroup>
  ),
};

export const ShortcutCombination: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Display keyboard shortcut combinations with a separator between keys.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>B</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <span>+</span>
        <Kbd>K</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>Shift</Kbd>
        <span>+</span>
        <Kbd>P</Kbd>
      </KbdGroup>
    </div>
  ),
};

export const InsideButton: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Use inside buttons to show keyboard shortcuts for button actions.',
      },
    },
  },
  render: () => (
    <div className="flex gap-2">
      <Button className="pr-2" size="sm" variant="outline">
        Accept <Kbd>⏎</Kbd>
      </Button>
      <Button className="pr-2" size="sm" variant="outline">
        Cancel <Kbd>Esc</Kbd>
      </Button>
    </div>
  ),
};

export const WithTooltip: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Display keyboard shortcuts in tooltips to inform users of available shortcuts.',
      },
    },
  },
  decorators: [
    (StoryComponent) => (
      <TooltipProvider>
        <StoryComponent />
      </TooltipProvider>
    ),
  ],
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant="outline">
          Save
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          Save Changes <Kbd>S</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};

export const InInputGroup: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use in input groups to show keyboard shortcuts that trigger the input or related actions.',
      },
    },
  },
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const CommonKeys: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Examples of commonly used keyboard keys and symbols.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Kbd>⌘</Kbd>
      <Kbd>Ctrl</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>Alt</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>⌃</Kbd>
      <Kbd>⏎</Kbd>
      <Kbd>Enter</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd>Space</Kbd>
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
    </div>
  ),
};
