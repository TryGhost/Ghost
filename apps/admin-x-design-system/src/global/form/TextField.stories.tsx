import {ReactNode} from 'react';
import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import Button from '../Button';
import Select from './Select';
import TextField from './TextField';

const meta = {
    title: 'Global / Form / Textfield',
    component: TextField,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => (
        <div style={{maxWidth: '400px', padding: '20px'}}>
            {_story()}
        </div>
    )],
    argTypes: {
        hint: {
            control: 'text'
        },
        rightPlaceholder: {
            control: 'text'
        }
    }
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
    args: {
        placeholder: 'Enter something'
    }
};

export const Disabled: Story = {
    args: {
        placeholder: `Here's a disabled field`,
        value: 'Hello disabled field',
        title: 'Disabled',
        disabled: true
    }
};

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <TextField {...args} onChange={e => updateArgs({value: e.target.value})} />;
    },
    args: {
        placeholder: 'Enter something',
        value: 'Value'
    }
};

export const WithHeading: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something'
    }
};

export const WithHint: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something',
        hint: 'Here\'s some hint'
    }
};

export const WithRightPlaceholder: Story = {
    args: {
        title: 'Monthly price',
        placeholder: '0',
        rightPlaceholder: 'USD/month'
    }
};

export const WithDropdown: Story = {
    args: {
        title: 'Monthly price',
        placeholder: '0',
        rightPlaceholder: (
            <Select
                border={false}
                clearBg={true}
                containerClassName='w-14'
                fullWidth={false}
                options={[
                    {label: 'USD', value: 'usd'},
                    {label: 'EUR', value: 'eur'}
                ]}
                onSelect={() => {}}
            />
        )
    }
};

export const WithButton: Story = {
    args: {
        title: 'Get this URL',
        value: 'https://ghost.org',
        containerClassName: 'group',
        rightPlaceholder: (
            <Button className='invisible mt-1 rounded-md group-hover:visible' color='white' label='Copy' size='sm' />
        )
    }
};

export const PasswordType: Story = {
    args: {
        title: 'Password',
        type: 'password',
        placeholder: 'Enter password',
        hint: 'Here\'s some hint'
    }
};

export const Error: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something',
        hint: 'Invalid value',
        value: 'Value',
        error: true
    }
};
