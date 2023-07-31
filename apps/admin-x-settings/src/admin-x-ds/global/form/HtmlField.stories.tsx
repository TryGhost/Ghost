import type {Meta, StoryObj} from '@storybook/react';

import HtmlField from './HtmlField';

const meta = {
    title: 'Global / Form / Htmlfield',
    component: HtmlField,
    tags: ['autodocs'],
    args: {
        config: {
            editor: {
                url: 'https://cdn.jsdelivr.net/ghost/koenig-lexical@~{version}/dist/koenig-lexical.umd.js',
                version: '0.3'
            }
        }
    }
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
