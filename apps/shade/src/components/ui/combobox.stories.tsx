import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue} from './combobox';
import {MultiSelectCombobox} from './multi-select-combobox';

const OPTIONS = [
    {label: 'English', value: 'en'},
    {label: 'French', value: 'fr'},
    {label: 'German', value: 'de'}
];

const Example = ({disabled = false}: {disabled?: boolean}) => {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<string[]>(['en']);
    const selectedLabel = OPTIONS.find(option => option.value === values[0])?.label;

    return (
        <div className='min-h-72 w-72'>
            <Combobox open={open} onOpenChange={setOpen}>
                <ComboboxTrigger aria-label='Language' disabled={disabled}>
                    <ComboboxValue placeholder={!selectedLabel}>{selectedLabel ?? 'Select a language'}</ComboboxValue>
                </ComboboxTrigger>
                <ComboboxContent>
                    <MultiSelectCombobox
                        isMultiSelect={false}
                        options={OPTIONS}
                        values={values}
                        autoCloseOnSelect
                        onChange={setValues}
                        onClose={() => setOpen(false)}
                    />
                </ComboboxContent>
            </Combobox>
        </div>
    );
};

const meta = {
    title: 'Components / Combobox',
    component: Combobox,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Popover-based control chrome for searchable single- and multi-select lists.'
            }
        }
    }
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof Combobox>;

export const Default: Story = {
    args: {
        children: <Example />
    },
    parameters: {
        docs: {
            description: {
                story: 'Use the compound trigger and content around a searchable option list.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        children: <Example disabled />
    },
    parameters: {
        docs: {
            description: {
                story: 'Disable the trigger when the selection cannot be changed.'
            }
        }
    }
};
