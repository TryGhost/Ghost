import type {Meta, StoryObj} from '@storybook/react';

import {Smile} from 'lucide-react';

const meta = {
    title: 'Experimental / Lucide icons',
    component: Smile,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Note: right now we are experimenting whether we should switch to Lucide Icons instead of Streamline. Read the [Lucide Icons docs](https://lucide.dev/guide/packages/lucide-react) to learn more about it.'
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
