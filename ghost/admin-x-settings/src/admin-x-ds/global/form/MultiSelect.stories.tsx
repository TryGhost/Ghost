import type {Meta, StoryObj} from '@storybook/react';

import MultiSelect, {MultiSelectOption} from './MultiSelect';
import {MultiValue} from 'react-select';

const meta = {
    title: 'Global / Form / Multiselect',
    component: MultiSelect,
    tags: ['autodocs']
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof MultiSelect>;

const options = [
    {value: 'steph', label: 'Steph Curry'},
    {value: 'klay', label: 'Klay Thompson'},
    {value: 'dray', label: 'Draymond Green'}
];

export const Default: Story = {
    args: {
        options: options,
        placeholder: 'Select your players'
    }
};

export const Clear: Story = {
    args: {
        options: options,
        clearBg: true
    }
};

export const Black: Story = {
    args: {
        options: options,
        color: 'black'
    }
};

export const WithTitle: Story = {
    args: {
        title: 'Choose your players',
        options: options,
        color: 'black'
    }
};

export const WithTitleAndHint: Story = {
    args: {
        title: 'Choose your players',
        options: options,
        color: 'black',
        hint: 'I knew you\'d choose all'
    }
};

export const WithDefaultValue: Story = {
    args: {
        title: 'Choose your players',
        options: options,
        color: 'black',
        hint: 'I knew you\'d choose all',
        defaultValues: [options[0]],
        onChange: (selected: MultiValue<MultiSelectOption>) => {
            selected?.map(o => (
                alert(`${o.label} (${o.value})`)
            ));
        }
    }
};