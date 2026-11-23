import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListItem } from '@/components/ui/list';
import { RowPrimaryAction } from '@/components/ui/row-primary-action';
import { Button } from '@/components/ui/button';
import { Box, Stack } from '@/primitives';

const meta: Meta<typeof RowPrimaryAction> = {
  title: 'Components / Row Primary Action',
  component: RowPrimaryAction,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Use with ListItem or TableRow when clicking a row should open an item or run an action. Wrap the main link or button to make the whole highlighted row clickable, while other row buttons keep their own actions.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof RowPrimaryAction>;

function Rows() {
  return (
    <Box className="max-w-lg" padding="lg">
      <Stack gap="none">
        <ListItem asChild>
          <div className="flex items-center justify-between gap-3 border-b py-4">
            <RowPrimaryAction asChild>
              <a href="#native-destination">Open an item — hover or press Tab</a>
            </RowPrimaryAction>
            <Button size="sm" variant="ghost" data-row-secondary>
              Another action
            </Button>
          </div>
        </ListItem>
        <ListItem asChild>
          <div className="border-b py-4">
            <RowPrimaryAction asChild>
              <div onClick={() => window.alert('Existing action')}>
                Run an existing action — press Enter or Space
              </div>
            </RowPrimaryAction>
          </div>
        </ListItem>
        <ListItem asChild>
          <div className="border-b py-4">
            <RowPrimaryAction asChild>
              <button type="button" disabled>
                Unavailable action
              </button>
            </RowPrimaryAction>
          </div>
        </ListItem>
        <ListItem asChild>
          <div className="border-b py-4">Information only</div>
        </ListItem>
      </Stack>
    </Box>
  );
}

export const NativeAndLegacyActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use a link to open another page or a button to run an action. This example also shows how an older click handler works with Enter and Space, and how disabled rows stay inactive.',
      },
    },
  },
  render: () => <Rows />,
};

export const CurrentInterface: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The same clickable rows work in the current Admin interface, with admin7Design turned off.',
      },
    },
  },
  globals: { admin7Design: 'off' },
  render: () => <Rows />,
};
