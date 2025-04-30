import type {Meta, StoryObj} from '@storybook/react';
import {Input} from './input';

const meta = {
    title: 'Components / Input',
    component: Input,
    tags: ['autodocs'],
    argTypes: {},
    decorators: [
        Story => (
            <div style={{padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Type something...'
    }
};
