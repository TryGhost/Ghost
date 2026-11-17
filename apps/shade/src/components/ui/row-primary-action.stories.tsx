import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionListItem } from '@/components/ui/action-list';
import { RowPrimaryAction } from '@/components/ui/row-primary-action';
import { Button } from '@/components/ui/button';
import { Box, Stack } from '@/primitives';
import ShadeApp from '@/shade-app';

const meta: Meta<typeof RowPrimaryAction> = {
  title: 'Components / Row Primary Action',
  component: RowPrimaryAction,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The existing primary control owns its destination. Shade supplies expanded row targets, native gesture delegation and enabled-design feedback.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof RowPrimaryAction>;

function Rows({ admin7Design = true }: { admin7Design?: boolean }) {
  return (
    <ShadeApp admin7Design={admin7Design} darkMode={false}>
      <Box className="max-w-lg" padding="lg">
        <Stack gap="none">
          <ActionListItem asChild>
            <div className="flex items-center justify-between gap-3 border-b py-4">
              <RowPrimaryAction asChild>
                <a href="#native-destination">Native link — hover or Tab</a>
              </RowPrimaryAction>
              <Button size="sm" variant="ghost" data-row-secondary>
                Secondary action
              </Button>
            </div>
          </ActionListItem>
          <ActionListItem asChild>
            <div className="border-b py-4">
              <RowPrimaryAction asChild>
                <div onClick={() => window.alert('Existing action')}>
                  Legacy action — Enter or Space
                </div>
              </RowPrimaryAction>
            </div>
          </ActionListItem>
          <ActionListItem asChild>
            <div className="border-b py-4">
              <RowPrimaryAction asChild>
                <button type="button" disabled>
                  Unavailable action
                </button>
              </RowPrimaryAction>
            </div>
          </ActionListItem>
          <ActionListItem asChild>
            <div className="border-b py-4">Static information</div>
          </ActionListItem>
        </Stack>
      </Box>
    </ShadeApp>
  );
}

export const NativeAndLegacyActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use existing native controls or legacy clickable markup as the primary slot; secondary controls remain independent and disabled/static rows add no action.',
      },
    },
  },
  render: () => <Rows />,
};

export const FlagOff: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With admin7Design off, custom row and primary slots are transparent and retain the consumer’s existing markup and events.',
      },
    },
  },
  render: () => <Rows admin7Design={false} />,
};
