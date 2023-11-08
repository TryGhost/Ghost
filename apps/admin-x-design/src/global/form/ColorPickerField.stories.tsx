import type {Meta, StoryObj} from '@storybook/react';

import ColorPickerField from './ColorPickerField';

const meta = {
    title: 'Global / Form / Color Picker Field',
    component: ColorPickerField,
    tags: ['autodocs'],
    argTypes: {},
    render: (args) => {
        return (
            <div className="w-48">
                <ColorPickerField {...args} />
            </div>
        );
    }
} satisfies Meta<typeof ColorPickerField>;

export default meta;
type Story = StoryObj<typeof ColorPickerField>;

export const Basic: Story = {
    args: {}
};

export const WithTitle: Story = {
    args: {
        title: 'Colour'
    }
};

export const WithHint: Story = {
    args: {
        title: 'Colour',
        hint: 'Pick a colour'
    }
};

export const WithError: Story = {
    args: {
        title: 'Colour',
        hint: 'Please select a colour',
        error: true
    }
};

export const WithValue: Story = {
    args: {
        title: 'Colour',
        value: '#ff0000'
    }
};

export const RightToLeft: Story = {
    args: {
        title: 'Colour',
        direction: 'rtl'
    }
};

export const RightToLeftHint: Story = {
    args: {
        title: 'Colour',
        hint: 'Pick a colour',
        direction: 'rtl'
    }
};

export const WithSwatches: Story = {
    args: {
        title: 'Colour',
        direction: 'rtl',
        swatches: [
            {hex: '#ff0000', title: 'Red'},
            {hex: '#00ff00', title: 'Green'},
            {hex: '#0000ff', title: 'Blue'}
        ]
    }
};
