import type {Meta, StoryObj} from '@storybook/react';

import CheckboxGroup from './CheckboxGroup';

const meta = {
    title: 'GLobal / Form / Checkbox group',
    component: CheckboxGroup,
    tags: ['autodocs']
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

export const Default: Story = {
    args: {
        checkboxes: [
            {
                onChange: () => {},
                label: 'Kevin',
                value: 'kevin'
            },
            {
                onChange: () => {},
                label: 'Minci',
                value: 'minci'
            },
            {
                onChange: () => {},
                label: 'Conker',
                value: 'conker'
            }
        ]
    }
};

export const WithTitle: Story = {
    args: {
        title: 'Gimme pets',
        checkboxes: [
            {
                onChange: () => {},
                label: 'Kevin',
                value: 'kevin'
            },
            {
                onChange: () => {},
                label: 'Minci',
                value: 'minci'
            },
            {
                onChange: () => {},
                label: 'Conker',
                value: 'conker'
            }
        ]
    }
};

export const WithTitleAndHint: Story = {
    args: {
        title: 'Gimme pets',
        checkboxes: [
            {
                onChange: () => {},
                label: 'Kevin',
                value: 'kevin'
            },
            {
                onChange: () => {},
                label: 'Minci',
                value: 'minci'
            },
            {
                onChange: () => {},
                label: 'Conker',
                value: 'conker'
            }
        ],
        hint: 'Who you gonna pet?'
    }
};

export const Error: Story = {
    args: {
        title: 'Gimme pets',
        error: true,
        checkboxes: [
            {
                onChange: () => {},
                label: 'Kevin',
                value: 'kevin'
            },
            {
                onChange: () => {},
                label: 'Minci',
                value: 'minci'
            },
            {
                onChange: () => {},
                label: 'Conker',
                value: 'conker'
            }
        ],
        hint: 'Please select one'
    }
};
