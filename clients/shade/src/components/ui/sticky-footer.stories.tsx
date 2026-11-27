import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { StickyFooter } from './sticky-footer';
import { Box, Inline, Stack, Text } from '@/components/primitives';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatNumber } from '@/utils';

const meta = {
  title: 'Components / Sticky Footer',
  component: StickyFooter,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Keep actions visible at the bottom of a scrolling surface.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StickyFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="h-64 w-96 overflow-y-auto bg-background px-6">
      <div className="h-96 py-6 text-sm text-muted-foreground">Scrollable content</div>
      <StickyFooter {...args}>
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </div>
      </StickyFooter>
    </div>
  ),
};

function ScrollableContent() {
  return (
    <Stack gap="xl">
      {Array.from({ length: 12 }, (_, index) => (
        <Box key={index} className="border-b border-border-default" paddingY="xl">
          <Text weight="medium">Section {formatNumber(index + 1)}</Text>
          <Text tone="secondary">
            Scroll this content behind the footer. No text should show through its bottom edge.
          </Text>
        </Box>
      ))}
    </Stack>
  );
}

export const PaddedScrollContainer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use in a padded scroll container, including through a non-scrolling wrapper. Scroll to the end and resize: content should not leak below the footer.',
      },
    },
  },
  render: (args) => (
    <Box className="h-96 w-full max-w-lg overflow-y-auto bg-background pb-4 sm:pb-6" paddingX="xl">
      <Box>
        <ScrollableContent />
        <StickyFooter {...args}>
          <Inline className="w-full" gap="sm" justify="end">
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </Inline>
        </StickyFooter>
      </Box>
    </Box>
  ),
};

export const InDialog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use inside a scrolling Dialog: the footer supplies its own bottom spacing and should match the dialog surface in both themes.',
      },
    },
  },
  render: (args) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog with sticky footer</Button>
      </DialogTrigger>
      <DialogContent className="block max-h-[70vh] overflow-y-auto pb-0">
        <DialogHeader>
          <DialogTitle>Review publication settings</DialogTitle>
          <DialogDescription>
            Scroll to the bottom and switch themes to inspect the footer surface.
          </DialogDescription>
        </DialogHeader>
        <ScrollableContent />
        <StickyFooter {...args}>
          <Inline className="w-full" gap="sm" justify="end">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Save settings</Button>
            </DialogClose>
          </Inline>
        </StickyFooter>
      </DialogContent>
    </Dialog>
  ),
};
