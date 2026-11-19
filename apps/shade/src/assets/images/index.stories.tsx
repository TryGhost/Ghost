import type { Meta, StoryObj } from '@storybook/react-vite';
import { FacebookLogo, XLogo } from '@/assets/images';
import { Inline, Stack, Text } from '@/components/primitives';
import { formatNumber } from '@/utils';

const meta = {
  title: 'Components / Logos',
  component: FacebookLogo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Brand logos exported by Shade, sized with standard SVG dimensions. Logos are hidden from screen readers by default, so a logo beside a label adds nothing to its name. When a logo stands on its own, name it with `title`, `aria-label` or `aria-labelledby`.',
      },
    },
  },
} satisfies Meta<typeof FacebookLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Compare Facebook and X at small and large sizes: each complete mark should scale without clipping. Use XLogo for X sharing.',
      },
    },
  },
  render: () => (
    <Stack gap="2xl">
      {[
        { name: 'Facebook', Logo: FacebookLogo },
        { name: 'X', Logo: XLogo },
      ].map(({ name, Logo }) => (
        <Stack key={name} gap="lg">
          <Text weight="semibold">{name}</Text>
          <Inline align="end" gap="2xl" wrap>
            {[16, 24, 48, 96].map((size) => (
              <Stack key={size} align="center" gap="sm">
                <Logo height={size} title={name} width={size} />
                <Text size="sm" tone="secondary">
                  {formatNumber(size)}px
                </Text>
              </Stack>
            ))}
          </Inline>
        </Stack>
      ))}
    </Stack>
  ),
};
