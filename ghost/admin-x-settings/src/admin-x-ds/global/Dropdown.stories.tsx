import type {Meta, StoryObj} from '@storybook/react';

import Dropdown from './Dropdown';
import {DropdownOption} from './Dropdown';

const meta = {
    title: 'Global / Dropdown',
    component: Dropdown,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof Dropdown>;

const dropdownOptions: DropdownOption[] = [
    {value: 'option-1', label: 'Option 1'},
    {value: 'option-2', label: 'Option 2'},
    {value: 'option-3', label: 'Option 3'},
    {value: 'option-4', label: 'Option 4'},
    {value: 'option-5', label: 'Option 5'}
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

export const WithHint: Story = {
    args: {
        title: 'Title',
        options: dropdownOptions,
        hint: 'Here\'s some hint'
    }
};

export const WithDefaultSelectedOption: Story = {
    args: {
        title: 'Title',
        options: dropdownOptions,
        defaultSelectedOption: 'option-3',
        hint: 'Here\'s some hint'
    }
};

export const Error: Story = {
    args: {
        title: 'Title',
        options: dropdownOptions,
        hint: 'Invalid value',
        error: true
    }
};