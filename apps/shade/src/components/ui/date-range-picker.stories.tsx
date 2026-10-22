import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from './button';
import {
  DateRangePicker,
  DateRangePickerContent,
  type DateRangePickerPreset,
  type DateRangePickerRange,
  DateRangePickerTrigger,
} from './date-range-picker';

const meta = {
  title: 'Components / Date range picker',
  component: DateRangePickerContent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Picks a range of days: presets apply in one click, and two clicks on the calendar pick any range. Presets can show a shortcut key, which the consumer binds.',
      },
    },
  },
} satisfies Meta<typeof DateRangePickerContent>;

export default meta;
type Story = StoryObj<typeof DateRangePickerContent>;

const today = new Date();
const daysAgo = (days: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);

const presets: DateRangePickerPreset[] = [
  { id: 'today', label: 'Today', shortcut: 'd', range: { from: daysAgo(0), to: daysAgo(0) } },
  { id: '7', label: 'Last 7 days', shortcut: 'w', range: { from: daysAgo(6), to: daysAgo(0) } },
  { id: '30', label: 'Last 30 days', shortcut: 't', range: { from: daysAgo(29), to: daysAgo(0) } },
  { id: '90', label: 'Last 90 days', shortcut: 'n', range: { from: daysAgo(89), to: daysAgo(0) } },
  {
    id: 'ytd',
    label: 'Year to date',
    shortcut: 'y',
    range: { from: new Date(today.getFullYear(), 0, 1), to: daysAgo(0) },
  },
  {
    id: '365',
    label: 'Last 12 months',
    shortcut: 'l',
    range: { from: daysAgo(364), to: daysAgo(0) },
  },
  {
    id: 'all',
    label: 'All time',
    shortcut: 'a',
    range: { from: new Date(2020, 0, 1), to: daysAgo(0) },
  },
];

const format = (date: Date) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const Example = ({
  minDays = 1,
  bindShortcuts = false,
}: {
  minDays?: number;
  bindShortcuts?: boolean;
}) => {
  const [presetId, setPresetId] = useState<string | undefined>('30');
  const [range, setRange] = useState<DateRangePickerRange>(presets[2].range);

  useEffect(() => {
    if (!bindShortcuts) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const preset = presets.find((p) => p.shortcut === event.key.toLowerCase());
      if (preset) {
        setPresetId(preset.id);
        setRange(preset.range);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindShortcuts]);

  const label =
    presets.find((p) => p.id === presetId)?.label ?? `${format(range.from)} – ${format(range.to)}`;

  return (
    <div style={{ minHeight: 440 }}>
      <DateRangePicker>
        <DateRangePickerTrigger asChild>
          <Button variant="outline">
            <CalendarIcon />
            {label}
          </Button>
        </DateRangePickerTrigger>
        <DateRangePickerContent
          activePresetId={presetId}
          align="start"
          maxDate={today}
          minDate={new Date(2020, 0, 1)}
          minDays={minDays}
          presets={presets}
          value={range}
          onPresetSelect={(preset) => {
            setPresetId(preset.id);
            setRange(preset.range);
          }}
          onRangeSelect={(picked) => {
            setPresetId(undefined);
            setRange(picked);
          }}
        />
      </DateRangePicker>
    </div>
  );
};

export const Default: Story = {
  render: () => <Example />,
  parameters: {
    docs: {
      description: {
        story:
          'Presets on the right, two months on the left; a single day can be picked by clicking it twice.',
      },
    },
  },
};

export const WithShortcuts: Story = {
  render: () => <Example bindShortcuts />,
  parameters: {
    docs: {
      description: {
        story:
          'The consumer binds the preset keys: here, pressing T anywhere on the page picks the last 30 days.',
      },
    },
  },
};

export const AtLeastTwoDays: Story = {
  render: () => <Example minDays={2} />,
  parameters: {
    docs: {
      description: {
        story:
          'With minDays, a range must cover at least that many days, so a single day can’t be picked.',
      },
    },
  },
};
