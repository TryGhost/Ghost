import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Inline, Stack } from '@/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { rowSurface, rowSurfaceClasses } from '@/components/ui/row-surface';
import { useRowPress } from '@/hooks/use-row-press';

const meta: Meta = {
  title: 'Recipes / Row Surface',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Use rowSurface to give a custom row the same hover, focus and selection backgrounds as Shade lists and tables. Prefer List or Table when they fit: this helper adds styling, while your code handles clicks and touch presses.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function ExampleRows({ inset = false, dragging = false }: { inset?: boolean; dragging?: boolean }) {
  const press = useRowPress<HTMLDivElement>();
  return (
    <Box className="max-w-lg" data-row-dragging={dragging ? 'true' : undefined} padding="lg">
      <Stack className="border-t border-border" gap="none">
        <Inline
          className={cn(rowSurface(), 'border-b py-4', inset && rowSurfaceClasses.inset)}
          justify="between"
          {...press}
        >
          <a
            className={cn(
              rowSurfaceClasses.primaryAction,
              'focus-visible:ring-2 focus-visible:ring-focus-ring',
            )}
            href="#primary"
          >
            Open an item — hover or press Tab
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
          Information only — no hover background
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
            Another selected row
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
          'Compare a clickable row with an extra button, information-only rows, and neighboring selected rows. Move the pointer over a row or use Tab to focus its link.',
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
          'Keep the highlight inside the row when a narrow or scrolling container has no room beside it.',
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
          'This simulates dragging: hover and focus highlights are hidden, while selection stays visible. Use SortableList to try an actual drag.',
      },
    },
  },
  render: () => <ExampleRows dragging />,
};
