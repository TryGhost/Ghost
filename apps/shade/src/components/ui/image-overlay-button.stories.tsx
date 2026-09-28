import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ellipsis } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { imageOverlayButton } from '@/components/ui/image-overlay-button';
import { Inline } from '@/components/primitives';
import { useShade } from '@/providers/shade-provider';

function ImageOverlayButtons() {
  const { isAdmin7 } = useShade();
  const className = imageOverlayButton(isAdmin7);

  return (
    <Inline gap="sm">
      <Button className={className}>Edit image</Button>
      <Button className={className} variant="ghost">
        Remove image
      </Button>
      <Button aria-label="Open image actions" className={className} size="icon" variant="outline">
        <Ellipsis />
      </Button>
      <Button
        aria-expanded="true"
        aria-label="Expanded image actions"
        className={className}
        size="icon"
        variant="outline"
      >
        <Ellipsis />
      </Button>
      <Button className={className} disabled>
        Uploading
      </Button>
    </Inline>
  );
}

const meta = {
  title: 'Recipes / Image Overlay Button',
  component: ImageOverlayButtons,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inverse button colors for actions over images. Button keeps ownership of size, shape, focus, and disabled behavior.',
      },
    },
  },
} satisfies Meta<typeof ImageOverlayButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Hover, press, or keyboard-focus the controls. Expanded menus retain the inverse surface, while disabled controls keep normal Button behavior.',
      },
    },
  },
};
