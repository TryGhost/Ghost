import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimePicker } from '@/components/ui/time-picker';

const meta = {
  title: 'Components / Time Picker',
  component: TimePicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A native time input with a clock icon and optional timezone suffix. Supports keyboard segment editing and standard input events.',
      },
    },
  },
  args: { 'aria-label': 'Time', defaultValue: '14:30' },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Choose hours and minutes with the keyboard or native time control. Hover and tab to inspect the interactive states.',
      },
    },
  },
};
export const WithTimezone: Story = {
  args: { suffix: 'UTC' },
  parameters: { docs: { description: { story: 'Keep timezone context inside the field.' } } },
};
export const Disabled: Story = {
  args: { disabled: true, suffix: 'UTC' },
  parameters: {
    docs: { description: { story: 'Display a time that cannot currently be edited.' } },
  },
};
export const Invalid: Story = {
  args: { 'aria-invalid': true },
  parameters: {
    docs: { description: { story: 'Indicate a value rejected by consumer validation.' } },
  },
};
