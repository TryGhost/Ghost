import type {Meta, StoryObj} from '@storybook/react';

import ColorPicker from './ColorPicker';

const meta = {
    title: 'Global / Form / Color Picker',
    component: ColorPicker,
    tags: ['autodocs'],
    argTypes: {}
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof ColorPicker>;

export const Basic: Story = {
    args: {}
};
