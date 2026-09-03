import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta = {
  title: 'Components / Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Small status indicators and labels with multiple variants. Use for displaying tags, statuses, categories, or any short descriptive text that needs visual emphasis.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'md'],
    },
    shape: {
      control: { type: 'select' },
      options: ['rounded', 'pill'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'destructive', 'success', 'warning', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const SmallSecondaryPill: Story = {
  args: {
    shape: 'pill',
    size: 'sm',
    variant: 'secondary',
    children: 'Small pill',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the small pill for compact labels in dense interfaces.',
      },
    },
  },
};

export const MediumSecondaryPill: Story = {
  args: {
    shape: 'pill',
    size: 'md',
    variant: 'secondary',
    children: 'Medium pill',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the medium pill when a label needs more visual presence.',
      },
    },
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Error',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Error</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};
