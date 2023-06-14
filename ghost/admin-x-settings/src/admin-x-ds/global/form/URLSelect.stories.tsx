import type {Meta, StoryObj} from '@storybook/react';

import URLSelect from './URLSelect';
import {SelectOption} from './Select';

const meta = {
    title: 'Global / Form / URL Select',
    component: URLSelect,
    tags: ['autodocs']
} satisfies Meta<typeof URLSelect>;

export default meta;
type Story = StoryObj<typeof URLSelect>;

const selectOptions: SelectOption[] = [
    {value: 'homepage', label: 'Homepage'},
    {value: 'post', label: 'Post'},
    {value: 'page', label: 'Page'},
    {value: 'tag-archive', label: 'Tag archive'},
    {value: 'author-archive', label: 'Author archive'}
];

export const Default: Story = {
    args: {
        options: selectOptions,
        onSelect: () => {}
    }
};
