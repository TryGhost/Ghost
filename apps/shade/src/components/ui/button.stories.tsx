import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Inline } from '@/components/primitives/inline';
import ShadeApp from '@/shade-app';
import { ArrowUp, Smile } from 'lucide-react';

const meta = {
  title: 'Components / Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Reusable button for interactive actions across the UI. Supports multiple visual variants and sizes to match hierarchy and context. Outline, secondary and ghost buttons show an inset shadow while pressed. Menu and popover triggers retain their pressed appearance while aria-expanded is true, including when composed with a Tooltip. Disabled controls do not gain pressed styling.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

// Overview
export const Primary: Story = {
  name: 'Default',
  args: {
    children: 'Primary button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Main use case: call-to-action button with default styling.',
      },
    },
  },
};

export const Pill: Story = {
  args: {},
  render: (args) => (
    <Inline gap="sm">
      <Button {...args}>Primary pill</Button>
      <Button {...args} variant="secondary">
        Secondary pill
      </Button>
      <Button {...args} variant="outline">
        Outline pill
      </Button>
    </Inline>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Compare the primary spacing with non-primary spacing and the borderless outline treatment on a pill surface.',
      },
    },
  },
};

export const AppLevelPill: Story = {
  args: {
    children: 'Inherited pill button',
  },
  render: (args) => (
    <ShadeApp darkMode={false}>
      <Button {...args} />
    </ShadeApp>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use the Shade app setting to apply the pill shape across a surface by default.',
      },
    },
  },
};

export const LocalRoundedOverride: Story = {
  args: {
    shape: 'rounded',
    children: 'Rounded override',
  },
  render: (args) => (
    <ShadeApp darkMode={false}>
      <Button {...args} />
    </ShadeApp>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use a local shape override for a control that must stay rounded on a pill surface.',
      },
    },
  },
};

// Variants
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete item',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for dangerous or irreversible actions (e.g., delete, remove, reset).',
      },
    },
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Secondary action',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for secondary actions that still need moderate emphasis.',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for alternative actions when a primary button is present.',
      },
    },
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for low-emphasis actions, especially in dense layouts.',
      },
    },
  },
};

export const LinkVariant: Story = {
  name: 'Link style',
  args: {
    variant: 'link',
    children: 'Learn more',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use when an action should blend in with text and behave like a navigational link.',
      },
    },
  },
};

export const DropdownVariant: Story = {
  name: 'Dropdown style',
  args: {
    variant: 'dropdown',
    children: 'Menu',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use to trigger menus or option lists; pairs with a chevron to indicate more options.',
      },
    },
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use in compact UIs, tables, or where space is limited.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use when prominence and larger hit targets are needed.',
      },
    },
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Move up',
    children: <ArrowUp />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use when an icon sufficiently conveys meaning and space is constrained. Always provide an accessible `aria-label`.',
      },
    },
  },
};

export const SmallIconOnly: Story = {
  args: {
    size: 'icon-sm',
    'aria-label': 'Move up',
    children: <ArrowUp />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use for compact icon-only actions in dense controls. Always provide an accessible `aria-label`.',
      },
    },
  },
};

export const PillIconOnly: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Move up',
    children: <ArrowUp />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use for icon-only actions on a pill surface; the control is constrained to a square so it renders as a true circle.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Smile />
        Continue
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use to add visual affordance to actions. Keep icons before the text and ensure the label remains clear.',
      },
    },
  },
};

export const PillWithIcon: Story = {
  args: {
    variant: 'outline',
  },
  render: (args) => (
    <Button {...args}>
      <Smile />
      Add complimentary subscription
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Use normal button sizes for pill actions that combine an icon with a visible text label.',
      },
    },
  },
};

// States
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use to indicate an action is unavailable. Prefer explaining why rather than relying solely on the disabled state.',
      },
    },
  },
};

export const PillPressedStates: Story = {
  render: () => (
    <Inline gap="sm" wrap>
      {(['outline', 'secondary', 'ghost'] as const).map((variant) => (
        <Inline key={variant} gap="xs">
          <Button variant={variant}>{variant}</Button>
          <Button variant={variant} disabled>
            {variant} disabled
          </Button>
        </Inline>
      ))}
    </Inline>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Press and hold each pill to compare inset shadows, or Tab through them to check keyboard focus. Disabled controls remain inactive.',
      },
    },
  },
};

export const PillDropdowns: Story = {
  render: () => (
    <TooltipProvider delayDuration={1000}>
      <Inline gap="xs">
        {(['outline', 'secondary', 'ghost'] as const).map((variant) => (
          <Tooltip key={variant}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant={variant}>{variant} menu</Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>First option</DropdownMenuItem>
                <DropdownMenuItem>Second option</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent variant="white">Choose an option</TooltipContent>
          </Tooltip>
        ))}
      </Inline>
    </TooltipProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Open a menu and move the pointer away: its trigger stays pressed until selection, Escape or dismissal. Hovering the tooltip alone does not press the trigger.',
      },
    },
  },
};

export const Admin7Disabled: Story = {
  render: () => (
    <ShadeApp darkMode={false} isAdmin7={false}>
      <Inline gap="sm">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="subtle">Subtle</Button>
      </Inline>
    </ShadeApp>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Temporary host-level compatibility restores the previous controls. New screens use ordinary Button defaults; they do not select a pill shape.',
      },
    },
  },
};
