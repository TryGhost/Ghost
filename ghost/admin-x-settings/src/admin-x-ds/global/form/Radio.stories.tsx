import type {Meta, StoryObj} from '@storybook/react';

import Radio, {RadioOption} from './Radio';

const meta = {
    title: 'Global / Form / Radio',
    component: Radio,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof Radio>;

const radioOptions: RadioOption[] = [
    {value: 'option-1', label: 'Option 1'},
    {value: 'option-2', label: 'Option 2'},
    {value: 'option-3', label: 'Option 3'},
    {value: 'option-4', label: 'Option 4'},
    {value: 'option-5', label: 'Option 5'}
];

const radioOptionsWithHints: RadioOption[] = [
    {value: 'option-1', label: 'Option 1', hint: 'Here\'s a hint for option 1'},
    {value: 'option-2', label: 'Option 2', hint: 'Here\'s a hint for option 2'},
    {value: 'option-3', label: 'Option 3', hint: 'Here\'s a hint for option 3'}
];

export const Default: Story = {
    args: {
        id: 'my-radio-button',
        options: radioOptions
    }
};

export const WithTitleAndHint: Story = {
    args: {
        title: 'Title',
        options: radioOptions,
        hint: 'Here\'s some hint',
        selectedOption: 'option-1'
    }
};

export const OptionHints: Story = {
    args: {
        title: 'Title',
        options: radioOptionsWithHints,
        selectedOption: 'option-1'
    }
};

export const WithSeparator: Story = {
    args: {
        title: 'Title',
        options: radioOptionsWithHints,
        selectedOption: 'option-1',
        separator: true
    }
};
