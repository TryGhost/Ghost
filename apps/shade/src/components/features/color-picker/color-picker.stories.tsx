import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from '@storybook/test';
import ColorPicker from './color-picker';

import {Popover, PopoverTrigger, PopoverContent} from '@/components/ui/popover';
import {useState} from 'react';
import {Input} from '@/components/ui/input';

const meta: Meta<typeof ColorPicker> = {
    title: 'Features/ColorPicker',
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
            <PopoverTrigger>
                <div className="flex items-center gap-2">
                    <div className="flex-0 aspect-square size-9 rounded-full p-1" style={{background: `conic-gradient(from 0deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))`}}>
                        <div className="size-full rounded-full border-2 border-white" style={{background: String(value || '#ffffff')}} />
                    </div>
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
