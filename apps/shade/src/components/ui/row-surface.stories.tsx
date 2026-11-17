import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Inline, Stack } from '@/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { rowSurface, rowSurfaceClasses } from '@/components/ui/row-surface';

const meta: Meta = {
  title: 'Recipes / Row Surface',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared chrome for content-list and table rows. The row retains its native semantics and actions; the recipe supplies hover, keyboard, press and selected surfaces without moving content.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function ExampleRows({ inset = false, dragging = false }: { inset?: boolean; dragging?: boolean }) {
  return (
    <Box className="max-w-lg" data-row-dragging={dragging ? 'true' : undefined} padding="lg">
      <Stack className="border-t border-border" gap="none">
        <Inline
          className={cn(rowSurface(), 'border-b py-4', inset && rowSurfaceClasses.inset)}
          justify="between"
        >
          <a
            className={cn(
              rowSurfaceClasses.primaryAction,
              'focus-visible:ring-2 focus-visible:ring-focus-ring',
            )}
            href="#primary"
          >
            Primary link — hover or tab here
          </a>
          <Button
            className="relative z-10 text-foreground"
            size="sm"
            variant="ghost"
            onClick={() => window.alert('Secondary action')}
          >
            More
          </Button>
        </Inline>
        <Box className={cn(rowSurface('static'), 'border-b py-4')}>
          Static information — no hover treatment
        </Box>
        <Box
          className={cn(rowSurface(), 'border-b py-4', inset && rowSurfaceClasses.inset)}
          data-state="selected"
        >
          <a
            className={cn(
              rowSurfaceClasses.primaryAction,
              'focus-visible:ring-2 focus-visible:ring-focus-ring',
            )}
            href="#selected"
          >
            Selected row
          </a>
        </Box>
        <Box
          className={cn(rowSurface(), 'border-b py-4', inset && rowSurfaceClasses.inset)}
          data-state="selected"
        >
          <a
            className={cn(
              rowSurfaceClasses.primaryAction,
              'focus-visible:ring-2 focus-visible:ring-focus-ring',
            )}
            href="#adjacent"
          >
            Adjacent selected row
          </a>
        </Box>
        <Box className={cn(rowSurface('static'), 'border-b py-4')}>
          <Button size="sm" disabled>
            Disabled control
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

export const InteractiveAndStaticRows: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use for resource rows with a primary destination, independent secondary controls, static information and adjacent selections. Test hover, Tab, and touch press.',
      },
    },
  },
  render: () => <ExampleRows />,
};

export const ConstrainedGutter: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use the inset atom where a scroll viewport or narrow container cannot provide the outward gutter.',
      },
    },
  },
  render: () => <ExampleRows inset />,
};

export const DuringDrag: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'An active sortable ancestor suppresses ordinary row surfaces while the sortable overlay supplies drag feedback.',
      },
    },
  },
  render: () => <ExampleRows dragging />,
};
