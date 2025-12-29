import {ReactNode} from 'react';
import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import SelectWithOther from './select-with-other';
import type {SelectOption} from './select';

const meta = {
    title: 'Global / Form / Select With Other',
    component: SelectWithOther,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof SelectWithOther>;

export default meta;
type Story = StoryObj<typeof SelectWithOther>;

const languageOptions: SelectOption[] = [
    {value: 'en', label: 'English (en)'},
    {value: 'es', label: 'Spanish (es)'},
    {value: 'fr', label: 'French (fr)'},
    {value: 'de', label: 'German (de)'},
    {value: 'it', label: 'Italian (it)'},
    {value: 'pt', label: 'Portuguese (pt)'},
    {value: 'ja', label: 'Japanese (ja)'},
    {value: 'zh', label: 'Chinese (zh)'}
];

export const Default: Story = {
    args: {
        options: languageOptions,
        title: 'Site language'
    }
};

export const WithSelectedValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <SelectWithOther {...args} onSelect={value => updateArgs({selectedValue: value})} />;
    },
    args: {
        title: 'Site language',
        options: languageOptions,
        selectedValue: 'fr'
    }
};

export const WithHint: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        hint: 'This affects how dates and other content are displayed'
    }
};

export const Searchable: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        isSearchable: true,
        hint: 'Type to search for a language'
    }
};

export const CustomValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <SelectWithOther {...args} onSelect={value => updateArgs({selectedValue: value})} />;
    },
    args: {
        title: 'Site language',
        options: languageOptions,
        selectedValue: 'pt-BR',
        hint: 'Using a custom locale code not in the predefined list'
    }
};

export const WithValidation: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        otherPlaceholder: 'Enter BCP 47 locale code (e.g., en-US)',
        validate: (value: string) => {
            // Simple validation for demo - returns null for valid, error message for invalid
            if (!/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(value)) {
                return 'Invalid locale format';
            }
            return null;
        },
        otherHint: 'Enter a valid BCP 47 locale code'
    }
};

export const Error: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        error: true,
        hint: 'Please select a valid language'
    }
};

export const Disabled: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        selectedValue: 'en',
        disabled: true
    }
};

export const CustomLabels: Story = {
    args: {
        title: 'Site language',
        options: languageOptions,
        otherOption: {value: 'other', label: 'Enter custom locale...'},
        backToListLabel: 'Back to language list',
        otherPlaceholder: 'Type a locale code'
    }
};
