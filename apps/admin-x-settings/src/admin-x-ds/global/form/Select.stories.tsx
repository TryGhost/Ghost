import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import Select, {SelectOption} from './Select';

const meta = {
    title: 'Global / Form / Select',
    component: Select,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

const selectOptions: SelectOption[] = [
    {value: 'option-1', label: 'Option 1'},
    {value: 'option-2', label: 'Option 2'},
    {value: 'option-3', label: 'Option 3'},
    {value: 'option-4', label: 'Option 4'},
    {value: 'option-5', label: 'Option 5'}
];

export const Default: Story = {
    args: {
        options: selectOptions
    }
};

export const ClearBackground: Story = {
    args: {
        options: selectOptions,
        clearBg: true
    }
};

export const WithPrompt: Story = {
    args: {
        prompt: 'Select a value',
        options: selectOptions
    }
};

export const WithHeading: Story = {
    args: {
        title: 'Title',
        options: selectOptions
    }
};

export const WithHint: Story = {
    args: {
        title: 'Title',
        options: selectOptions,
        hint: 'Here\'s some hint'
    }
};

export const ExtraSmall: Story = {
    args: {
        options: selectOptions,
        size: 'xs'
    }
};

export const WithSelectedOption: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <Select {...args} onSelect={value => updateArgs({selectedOption: value})} />;
    },
    args: {
        title: 'Title',
        options: selectOptions,
        selectedOption: 'option-3',
        hint: 'Here\'s some hint'
    }
};

export const WithCallback: Story = {
    args: {
        options: selectOptions,
        onSelect: (value: string) => {
            alert(value);
        }
    }
};

export const Error: Story = {
    args: {
        title: 'Title',
        options: selectOptions,
        hint: 'Invalid value',
        error: true
    }
};

export const Unstyled: Story = {
    args: {
        options: selectOptions,
        unstyled: true
    }
};
