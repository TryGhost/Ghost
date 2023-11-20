import type {Meta, StoryObj} from '@storybook/react';

import ColorIndicator from './ColorIndicator';

const meta = {
    title: 'Global / Form / Color Indicator',
    component: ColorIndicator,
    tags: ['autodocs'],
    argTypes: {},
    args: {
        swatches: [],
        onSwatchChange: () => {},
        onTogglePicker: () => {},
        isExpanded: false
    }
} satisfies Meta<typeof ColorIndicator>;

export default meta;
type Story = StoryObj<typeof ColorIndicator>;

export const Basic: Story = {
    args: {
    }
};

export const WithValue: Story = {
    args: {
        value: '#ff0000'
    }
};

export const WithSwatches: Story = {
    args: {
        swatches: [
            {hex: '#ff0000', title: 'Red'},
            {hex: '#00ff00', title: 'Green'},
            {hex: '#0000ff', title: 'Blue'},
            {hex: '#642642', value: 'accent', title: 'Accent'},
            {hex: '#00000000', value: 'transparent', title: 'Transparent'}
        ]
    }
};

export const SwatchSelected: Story = {
    args: {
        swatches: [
            {hex: '#ff0000', title: 'Red'},
            {hex: '#00ff00', title: 'Green'},
            {hex: '#0000ff', title: 'Blue'},
            {hex: '#642642', value: 'accent', title: 'Accent'},
            {hex: '#00000000', value: 'transparent', title: 'Transparent'}
        ],
        value: 'accent'
    }
};
