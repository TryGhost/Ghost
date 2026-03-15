import type {Meta, StoryObj} from '@storybook/react-vite';

import {Smile} from 'lucide-react';

const meta = {
    title: 'Components / Icons',
    component: Smile,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Shade uses Lucide Icons by default, following the standard in ShadCN/UI. To learn how to use them, read the [Lucide Icons docs](https://lucide.dev/guide/packages/lucide-react). \n\nIn Ghost apps you can\'t directly reference icons as you would normally in ShadCN/UI, instead you need to use the `LucideIcon` component, e.g. `<LucideIcon.Smile size="20" />`.'
            }
        }
    }
} satisfies Meta<typeof Smile>;

export default meta;
type Story = StoryObj<typeof Smile>;

export const Default: Story = {
    args: {
        size: 20,
        color: 'currentColor',
        strokeWidth: 2,
        absoluteStrokeWidth: false,
        className: ''
    }
};
