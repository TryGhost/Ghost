import type {Meta, StoryObj} from '@storybook/react';

import Checkbox from './Checkbox';

const meta = {
    title: 'Global / Form / Checkbox',
    component: Checkbox,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {
        label: 'Checkbox 1'
    }
};

export const WithTitleAndHint: Story = {
    args: {
        title: 'Title',
        label: 'Checkbox 1',
        hint: 'Here\'s some hint',
        checked: true
    }
};

export const WithSeparator: Story = {
    args: {
        title: 'Title',
        label: 'Checkbox 1',
        hint: 'Here\'s some hint',
        checked: true,
        separator: true
    }
};
