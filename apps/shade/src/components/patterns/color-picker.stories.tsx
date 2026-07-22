import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';
import ColorPicker, {ColorPickerTrigger, ColorSwatchRow} from './color-picker';

import {Popover, PopoverTrigger, PopoverContent} from '@/components/ui/popover';
import {useState} from 'react';
import {Input} from '@/components/ui/input';

const meta: Meta<typeof ColorPicker> = {
    title: 'Patterns / Color Picker',
    component: ColorPicker,
    parameters: {
        layout: 'centered'
    },
    tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

function ColorPickerDemo(args: Story['args']) {
    const [value, setValue] = useState(args?.defaultValue);
    return <div style={{height: 600}}>
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2">
                    <ColorPickerTrigger value={String(value || '#ffffff')} />
                    <Input className="font-mono" size={8} type="text" value={value} onChange={e => setValue(e.target.value)} />
                </div>
            </PopoverTrigger>
            <PopoverContent align="start">
                <ColorPicker {...args} defaultValue={value} onChange={setValue} />
            </PopoverContent>
        </Popover>
    </div>;
}

export const InPopover: Story = {

    args: {
        defaultValue: '#FF6B35',
        onChange: fn()
    },
    render: (args) => {
        return <ColorPickerDemo {...args} />;
    }
};

export const Standalone: Story = {
    args: {
        defaultValue: '#FF6B35',
        onChange: fn()
    }
};

function ColorSwatchesDemo() {
    const [value, setValue] = useState<string | null>('accent');
    return <ColorSwatchRow
        swatches={[
            {title: 'Dark', hex: '#08090c', value: 'dark'},
            {title: 'Light', hex: '#ffffff', value: 'light'},
            {title: 'Accent', hex: '#30cf43', value: 'accent'},
            {title: 'Transparent', hex: '#00000000', value: 'transparent'}
        ]}
        value={value}
        onSelect={setValue}
    />;
}

export const Swatches: Story = {
    render: () => <ColorSwatchesDemo />
};
