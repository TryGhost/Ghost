import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Text } from '@/components/primitives';
import { PageMenu, PageMenuItem } from './pagemenu';

const meta: Meta<typeof PageMenu> = {
  title: 'Components / PageMenu',
  component: PageMenu,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive page navigation menu that automatically collapses overflowing items into a dropdown. Pass `value` and `onValueChange` to control the active item, for example from the current route, or `defaultValue` to let the menu track it.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    responsive: {
      control: 'boolean',
      description: 'When true, items that do not fit horizontally are hidden in a dropdown',
    },
    value: {
      control: 'text',
      description: 'Active item value. Makes the menu controlled.',
    },
    defaultValue: {
      control: 'text',
      description: 'Initially active item value when the menu is uncontrolled.',
    },
    onValueChange: {
      action: 'valueChanged',
      description: 'Called with the item value when the user picks a different item.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <PageMenu {...args}>
      <PageMenuItem value="overview">Overview</PageMenuItem>
      <PageMenuItem value="customers">Customers</PageMenuItem>
      <PageMenuItem value="issues">Issues</PageMenuItem>
      <PageMenuItem value="analytics">Analytics</PageMenuItem>
    </PageMenu>
  ),
  args: {
    responsive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic page menu with static items that always remain visible.',
      },
    },
  },
};

export const Controlled: Story = {
  render: function ControlledPageMenu(args) {
    const [value, setValue] = useState('customers');

    return (
      <Stack gap="md">
        <PageMenu
          {...args}
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            args.onValueChange?.(nextValue);
          }}
        >
          <PageMenuItem value="overview">Overview</PageMenuItem>
          <PageMenuItem value="customers">Customers</PageMenuItem>
          <PageMenuItem value="issues">Issues</PageMenuItem>
          <PageMenuItem value="analytics">Analytics</PageMenuItem>
        </PageMenu>
        <Text size="sm" tone="secondary">
          Active: {value}
        </Text>
      </Stack>
    );
  },
  args: {
    responsive: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The parent owns the active item through `value` and updates it in `onValueChange`. Use this when the active item comes from the route.',
      },
    },
  },
};

export const Disabled: Story = {
  render: (args) => (
    <PageMenu {...args}>
      <PageMenuItem value="overview">Overview</PageMenuItem>
      <PageMenuItem value="customers">Customers</PageMenuItem>
      <PageMenuItem value="issues" disabled>
        Issues
      </PageMenuItem>
      <PageMenuItem value="analytics">Analytics</PageMenuItem>
    </PageMenu>
  ),
  args: {
    defaultValue: 'overview',
    responsive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'A disabled item is dimmed and can’t be selected.',
      },
    },
  },
};

export const Responsive: Story = {
  render: (args) => (
    <div className="w-full rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-medium">Resize this container</h3>
      <PageMenu {...args} defaultValue="overview">
        <PageMenuItem value="overview">Overview</PageMenuItem>
        <PageMenuItem value="web">Web traffic</PageMenuItem>
        <PageMenuItem value="newsletters">Newsletters</PageMenuItem>
        <PageMenuItem value="growth">Growth</PageMenuItem>
        <PageMenuItem value="locations">Locations</PageMenuItem>
      </PageMenu>
    </div>
  ),
  args: {
    responsive: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Responsive menu that automatically moves overflow items to a dropdown when space is limited.',
      },
    },
  },
};

export const SmallContainer: Story = {
  render: (args) => (
    <div className="w-64 rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-medium">Small container</h3>
      <PageMenu {...args} value="analytics">
        <PageMenuItem value="overview">Overview</PageMenuItem>
        <PageMenuItem value="customers">Customers</PageMenuItem>
        <PageMenuItem value="issues">Issues</PageMenuItem>
        <PageMenuItem value="analytics">Analytics Service</PageMenuItem>
        <PageMenuItem value="reports">Reports</PageMenuItem>
      </PageMenu>
    </div>
  ),
  args: {
    responsive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu in a constrained container showing how it adapts to limited horizontal space.',
      },
    },
  },
};

export const ManyItems: Story = {
  render: (args) => (
    <div className="w-full max-w-2xl rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-medium">Many items</h3>
      <PageMenu {...args} value="item-5">
        <PageMenuItem value="item-1">Menu Item 1</PageMenuItem>
        <PageMenuItem value="item-2">Menu Item 2</PageMenuItem>
        <PageMenuItem value="item-3">Menu Item 3</PageMenuItem>
        <PageMenuItem value="item-4">Menu Item 4</PageMenuItem>
        <PageMenuItem value="item-5">Menu Item 5</PageMenuItem>
        <PageMenuItem value="item-6">Menu Item 6</PageMenuItem>
        <PageMenuItem value="item-7">Menu Item 7</PageMenuItem>
        <PageMenuItem value="item-8">Menu Item 8</PageMenuItem>
        <PageMenuItem value="item-9">Menu Item 9</PageMenuItem>
        <PageMenuItem value="item-10">Menu Item 10</PageMenuItem>
      </PageMenu>
    </div>
  ),
  args: {
    responsive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu with many items demonstrating overflow behavior and dropdown functionality.',
      },
    },
  },
};
