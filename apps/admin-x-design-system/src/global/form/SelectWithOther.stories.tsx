import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';
import SelectWithOther, {SelectWithOtherProps} from './SelectWithOther';

const meta = {
    title: 'Global / Form / SelectWithOther',
    component: SelectWithOther,
    tags: ['autodocs'],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof SelectWithOther>;

export default meta;
type Story = StoryObj<typeof SelectWithOther>;

interface SelectWithOtherContainerProps extends Partial<SelectWithOtherProps> {
    selectedValue?: string;
}

const SelectWithOtherContainer: React.FC<SelectWithOtherContainerProps> = (props) => {
    const [selectedValue, setSelectedValue] = useState(props.selectedValue || '');
    
    return (
        <SelectWithOther
            {...props}
            options={props.options || []}
            selectedValue={selectedValue}
            onSelect={setSelectedValue}
        />
    );
};

export const Default: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Language',
        options: [
            {value: 'en', label: 'English'},
            {value: 'es', label: 'Spanish'},
            {value: 'fr', label: 'French'},
            {value: 'de', label: 'German'}
        ],
        hint: 'Select a language or choose "Other" to enter a custom value'
    }
};

export const WithSearchable: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Country',
        isSearchable: true,
        options: [
            {value: 'us', label: 'United States'},
            {value: 'uk', label: 'United Kingdom'},
            {value: 'ca', label: 'Canada'},
            {value: 'au', label: 'Australia'},
            {value: 'de', label: 'Germany'},
            {value: 'fr', label: 'France'},
            {value: 'es', label: 'Spain'},
            {value: 'it', label: 'Italy'},
            {value: 'jp', label: 'Japan'},
            {value: 'cn', label: 'China'}
        ],
        hint: 'Search for a country or select "Other" for custom entry'
    }
};

export const WithCustomValue: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Locale',
        selectedValue: 'en-GB',
        options: [
            {value: 'en', label: 'English'},
            {value: 'es', label: 'Spanish'},
            {value: 'fr', label: 'French'},
            {value: 'de', label: 'German'}
        ],
        otherPlaceholder: 'e.g. en-GB, fr-CA',
        hint: 'Select a locale or enter a custom locale code'
    }
};

export const WithError: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Required Field',
        error: true,
        options: [
            {value: 'opt1', label: 'Option 1'},
            {value: 'opt2', label: 'Option 2'}
        ],
        hint: 'This field is required'
    }
};

export const WithValidation: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Email Domain',
        options: [
            {value: 'gmail.com', label: 'Gmail'},
            {value: 'outlook.com', label: 'Outlook'},
            {value: 'yahoo.com', label: 'Yahoo'}
        ],
        otherPlaceholder: 'e.g. company.com',
        otherHint: 'Enter a custom domain',
        validate: (value: string) => {
            if (!value) {
                return 'Domain is required';
            }
            if (!value.includes('.')) {
                return 'Invalid domain format';
            }
            if (value.startsWith('.') || value.endsWith('.')) {
                return 'Invalid domain format';
            }
            return null;
        }
    }
};

export const Disabled: Story = {
    render: args => <SelectWithOtherContainer {...args} />,
    args: {
        title: 'Disabled Select',
        disabled: true,
        selectedValue: 'en',
        options: [
            {value: 'en', label: 'English'},
            {value: 'es', label: 'Spanish'}
        ]
    }
};