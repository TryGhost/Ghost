import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { Stack, Text } from '@/components/primitives';
import { Checkbox } from './checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from './field';

const meta = {
  title: 'Components / Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A control that allows users to toggle between checked and unchecked states. Built on Radix UI Checkbox primitive.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Basic checkbox component without a label.',
      },
    },
  },
};

export const WithLabel: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="terms" />
      <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Checkbox with an associated label for better accessibility and UX.',
      },
    },
  },
};

export const Checked: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="checked" defaultChecked />
      <FieldLabel htmlFor="checked">Checked by default</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Checkbox in the checked state by default.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <Field data-disabled="true" orientation="horizontal">
      <Checkbox id="disabled" disabled />
      <FieldLabel htmlFor="disabled">Disabled checkbox</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled checkbox that cannot be interacted with.',
      },
    },
  },
};

export const DisabledChecked: Story = {
  render: () => (
    <Field data-disabled="true" orientation="horizontal">
      <Checkbox id="disabled-checked" defaultChecked disabled />
      <FieldLabel htmlFor="disabled-checked">Disabled (Checked)</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled checkbox in the checked state.',
      },
    },
  },
};

export const Hover: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox className="bg-interactive-hover" id="hovered" />
      <FieldLabel htmlFor="hovered">Hovered checkbox</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Hover retains the stronger unchecked border while adding the interactive surface treatment.',
      },
    },
  },
};

export const FocusVisible: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="focused" autoFocus />
      <FieldLabel htmlFor="focused">Keyboard focused checkbox</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Keyboard focus uses the shared form-control focus border and ring.',
      },
    },
  },
};

export const Invalid: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="invalid" aria-invalid />
      <FieldLabel htmlFor="invalid">Invalid checkbox</FieldLabel>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Invalid checkboxes replace the stronger default border with the destructive treatment.',
      },
    },
  },
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(false);

    return (
      <Stack gap="md">
        <Field orientation="horizontal">
          <Checkbox
            checked={checked}
            id="controlled"
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <FieldLabel htmlFor="controlled">{checked ? 'Checked' : 'Unchecked'}</FieldLabel>
        </Field>
        <Text size="sm" tone="secondary">
          Current state: {checked ? 'Checked' : 'Unchecked'}
        </Text>
      </Stack>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled checkbox with state managed in React.',
      },
    },
  },
};

export const WithDescription: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="terms-desc" />
      <FieldContent>
        <FieldLabel htmlFor="terms-desc">Accept terms and conditions</FieldLabel>
        <FieldDescription>You agree to our Terms of Service and Privacy Policy.</FieldDescription>
      </FieldContent>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Checkbox with a label and additional description text.',
      },
    },
  },
};
