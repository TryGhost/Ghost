import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SortableList } from './sortable-list';

const meta = {
  title: 'Components / Sortable List',
  component: SortableList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A vertical list people reorder by dragging a row’s handle, or from the keyboard: Space or Enter picks a row up, each arrow key moves it one place, and Space or Enter drops it.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SortableList>;

export default meta;
type Story = StoryObj<typeof meta>;

interface ExampleItem {
  id: string;
  label: string;
  description?: string;
}

const moveItem = (items: ExampleItem[], id: string, overId: string) => {
  const from = items.findIndex((item) => item.id === id);
  const to = items.findIndex((item) => item.id === overId);
  const reordered = [...items];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
};

const ExampleList = ({ initialItems }: { initialItems: ExampleItem[] }) => {
  const [items, setItems] = useState(initialItems);

  return (
    <SortableList
      className="w-80"
      getItemLabel={(item) => item.label}
      items={items}
      renderItem={(item) => (
        <div className="w-full rounded-md bg-muted px-3 py-2">
          <div>{item.label}</div>
          {item.description && (
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
      )}
      onMove={(id, overId) => setItems((current) => moveItem(current, id, overId))}
    />
  );
};

const placeholderArgs = {
  items: [],
  renderItem: () => null,
  onMove: () => {},
};

export const Default: Story = {
  args: placeholderArgs,
  parameters: {
    docs: {
      description: {
        story:
          'Rows of the same height. `getItemLabel` names each row for the drag handle and for what screen readers announce while it moves.',
      },
    },
  },
  render: () => (
    <ExampleList
      initialItems={[
        { id: 'one', label: 'First item' },
        { id: 'two', label: 'Second item' },
        { id: 'three', label: 'Third item' },
      ]}
    />
  ),
};

export const UnevenRows: Story = {
  args: placeholderArgs,
  parameters: {
    docs: {
      description: {
        story:
          'Rows of different heights. Each arrow press still moves a row one place, whichever rows it passes.',
      },
    },
  },
  render: () => (
    <ExampleList
      initialItems={[
        { id: 'short-one', label: 'Short row' },
        {
          id: 'tall',
          label: 'Tall row',
          description:
            'This row has a description long enough to wrap onto several lines, so it is much taller than the rows around it.',
        },
        { id: 'short-two', label: 'Another short row' },
        { id: 'short-three', label: 'Last short row' },
      ]}
    />
  ),
};
