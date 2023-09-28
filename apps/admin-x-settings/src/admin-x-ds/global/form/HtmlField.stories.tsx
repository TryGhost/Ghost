import type {Meta, StoryObj} from '@storybook/react';

import HtmlField from './HtmlField';

const meta = {
    title: 'Global / Form / Htmlfield',
    component: HtmlField,
    tags: ['autodocs']
} satisfies Meta<typeof HtmlField>;

export default meta;
type Story = StoryObj<typeof HtmlField>;

export const Default: Story = {
    args: {
        placeholder: 'Enter something'
    }
};

export const WithHeading: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something'
    }
};
