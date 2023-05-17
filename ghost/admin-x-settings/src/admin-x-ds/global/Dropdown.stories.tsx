import type {Meta, StoryObj} from '@storybook/react';

import Dropdown from './Dropdown';
import {DropdownOption} from './Dropdown';

const meta = {
    title: 'Global / Input / Dropdown',
    component: Dropdown,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)]
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof Dropdown>;

const dropdownOptions: DropdownOption[] = [
    {value: 'Option 1', label: 'option-1'},
    {value: 'Option 2', label: 'option-2'},
    {value: 'Option 3', label: 'option-3'},
    {value: 'Option 4', label: 'option-4'},
    {value: 'Option 5', label: 'option-5'}
];

export const Default: Story = {
    args: {
        options: dropdownOptions
    }
};

export const WithHeading: Story = {
    args: {
        title: 'Title',
        options: dropdownOptions
    }
};

export const WithHelp: Story = {
    args: {
        title: 'Title',
        options: dropdownOptions,
        help: 'Here\'s some help'
    }
};