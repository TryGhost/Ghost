import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from './slider';
import { Label } from './label';

const meta = {
  title: 'Components / Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Lets people pick a value from a range by dragging a handle or using the arrow keys. Built on the Radix UI Slider primitive; `showSteps` draws a subtle line at each stop the handle snaps to.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', width: '320px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    'aria-label': 'Volume',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A continuous slider from 0 to 100. Hover the handle, or tab to it and use the arrow keys.',
      },
    },
  },
};

const STEP_LABELS = ['Tight', 'Compact', 'Normal', 'Relaxed', 'Loose'];
const DEFAULT_STEP = 2;

const SteppedSlider = () => {
  const [value, setValue] = useState([DEFAULT_STEP]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label id="line-spacing-label">Line spacing</Label>
        <span className="text-sm text-muted-foreground">{STEP_LABELS[value[0]]}</span>
      </div>
      <Slider
        aria-labelledby="line-spacing-label"
        aria-valuetext={STEP_LABELS[value[0]]}
        max={4}
        min={0}
        step={1}
        value={value}
        showSteps
        onValueChange={setValue}
      />
    </div>
  );
};

export const Stepped: Story = {
  render: () => <SteppedSlider />,
  parameters: {
    docs: {
      description: {
        story:
          'Five stops (0–4, step 1): the handle snaps to each stop, and `showSteps` draws a snapline at each one.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [2],
    max: 4,
    step: 1,
    showSteps: true,
    disabled: true,
    'aria-label': 'Margins',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use when the setting cannot be changed right now. The handle ignores pointer and keyboard input.',
      },
    },
  },
};
