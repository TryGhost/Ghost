import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { User } from 'lucide-react';
import { Filters } from '@/components/patterns/filters';
import ShadeApp from '@/shade-app';
import { type Filter } from '@/components/patterns/filters';
import { Stack } from '@/components/primitives';

const meta = {
  title: 'Patterns / Filters / Mobile',
  component: Filters,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'A filter sheet with a scrollable summary of active filters.' },
    },
  },
} satisfies Meta<typeof Filters>;
export default meta;
type Story = StoryObj<typeof Filters>;

function Example({ initialFilters = [] }: { initialFilters?: Filter[] }) {
  const [filters, setFilters] = useState(initialFilters);
  return (
    <ShadeApp darkMode={false} admin7Mobile>
      <Stack className="w-full max-w-md" gap="lg">
        <Filters
          fields={[{ key: 'name', label: 'Name', type: 'text', icon: <User /> }]}
          filters={filters}
          showSearchInput
          onChange={setFilters}
        />
      </Stack>
    </ShadeApp>
  );
}

export const Empty: Story = {
  render: () => <Example />,
  parameters: {
    docs: { description: { story: 'Open directly into field selection when no filters are set.' } },
  },
};

export const ActiveFilters: Story = {
  render: () => (
    <Example
      initialFilters={[{ id: 'name', field: 'name', operator: 'contains', values: ['Alex'] }]}
    />
  ),
  parameters: {
    docs: { description: { story: 'Edit active filters from the header trigger or summary bar.' } },
  },
};
