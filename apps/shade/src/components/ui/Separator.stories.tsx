import type {Meta, StoryObj} from '@storybook/react';
import {Separator} from './Separator';

const meta = {
    title: 'Components / Separator',
    component: Separator,
    tags: ['autodocs'],
    argTypes: {
        orientation: {
            control: 'radio',
            options: ['horizontal', 'vertical']
        }
    }
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
    args: {
        orientation: 'horizontal',
        decorative: true
    }
};
