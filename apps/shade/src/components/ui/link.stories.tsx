import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from './link';
import { Field, FieldDescription, FieldLabel } from './field';
import { Input } from './input';
import { Stack, Text } from '@/components/primitives';

const meta = {
  title: 'Components / Link',
  component: Link,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline text link. Always underlined so it is identifiable inside muted copy, and inherits size and weight from the surrounding text. Use Link for anything that navigates; use Button for actions. For a rare inline text action, render a `<button>` through `asChild`.',
      },
    },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof Link>;

export const Default: Story = {
  args: {
    href: '#',
    children: 'Read the docs',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A standalone link. Hover darkens the underline; focus-visible shows the focus ring.',
      },
    },
  },
};

export const InlineInMutedText: Story = {
  render: () => (
    <Text size="sm" tone="secondary">
      Default: English (<strong>en</strong>); find out more about{' '}
      <Link href="#">using Ghost in other languages</Link>.
    </Text>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inside secondary copy the link keeps the foreground colour and underline so it stands out.',
      },
    },
  },
};

export const InFieldDescription: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel>Private API key</FieldLabel>
      <Input placeholder="key-…" />
      <FieldDescription>
        Find your API keys in the{' '}
        <Link href="#" external>
          Mailgun dashboard
        </Link>
        .
      </FieldDescription>
    </Field>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Field hints use the same link. Use descriptive link text rather than “here”.',
      },
    },
  },
};

export const External: Story = {
  args: {
    href: 'https://ghost.org',
    external: true,
    children: 'ghost.org',
  },
  parameters: {
    docs: {
      description: {
        story: '`external` opens in a new tab with `rel="noopener noreferrer"`.',
      },
    },
  },
};

export const ButtonAsChild: Story = {
  render: () => (
    <Stack gap="sm">
      <Text size="sm">
        Can’t find your language?{' '}
        <Link asChild>
          <button type="button">Enter a custom locale</button>
        </Link>
      </Text>
      <Text size="sm">
        <Link asChild>
          <button type="button" disabled>
            Disabled inline action
          </button>
        </Link>
      </Text>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'An inline text action keeps button semantics while matching the link style. Buttons can be disabled; anchors cannot.',
      },
    },
  },
};
