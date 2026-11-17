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
          'Reorderable items with independent drag handles. An active drag suppresses shared row hover and focus fills while preserving drag feedback.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SortableList>;

export default meta;
type Story = StoryObj<typeof meta>;

const initialItems = [
  { id: 'one', label: 'First item' },
  { id: 'two', label: 'Second item' },
  { id: 'three', label: 'Third item' },
];

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use a sortable list for editable ordered content; drag the handle to reorder without introducing a primary row action.',
      },
    },
  },
  args: {
    items: [],
    renderItem: () => null,
    onMove: () => {},
  },
  render: () => {
    const [items, setItems] = useState(initialItems);

    return (
      <SortableList
        className="w-80"
        getDragHandleLabel={(item) => `Reorder ${item.label}`}
        items={items}
        renderItem={(item) => (
          <div className="w-full rounded-md bg-muted px-3 py-2">{item.label}</div>
        )}
        onMove={(id, overId) => {
          const from = items.findIndex((item) => item.id === id);
          const to = items.findIndex((item) => item.id === overId);
          const reordered = [...items];
          const [moved] = reordered.splice(from, 1);
          reordered.splice(to, 0, moved);
          setItems(reordered);
        }}
      />
    );
  },
};
