import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import URLTextField from './URLTextField';

const meta = {
    title: 'Global / Form / URL Textfield',
    component: URLTextField,
    tags: ['autodocs'],
    args: {
        baseUrl: 'https://my.site'
    }
} satisfies Meta<typeof URLTextField>;

export default meta;
type Story = StoryObj<typeof URLTextField>;

export const Default: Story = {
    args: {
        placeholder: 'Enter something'
    }
};

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <URLTextField {...args} onChange={value => updateArgs({value})} />;
    },
    args: {
        placeholder: 'Enter something',
        value: '/test/'
    }
};

export const EmailAddress: Story = {
    args: {
        placeholder: 'Enter something',
        value: 'mailto:test@my.site'
    }
};

export const AnchorLink: Story = {
    args: {
        placeholder: 'Enter something',
        value: '#test'
    }
};
