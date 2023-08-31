import {ReactNode} from 'react';
import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import CurrencyField from './CurrencyField';

const meta = {
    title: 'Global / Form / Currency field',
    component: CurrencyField,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        },
        rightPlaceholder: {
            control: 'text'
        }
    }
} satisfies Meta<typeof CurrencyField>;

export default meta;
type Story = StoryObj<typeof CurrencyField>;

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <CurrencyField {...args} onChange={valueInCents => updateArgs({valueInCents})} />;
    },
    args: {
        title: 'Amount',
        hint: 'Notice how the value is the integer number of cents',
        valueInCents: 500
    }
};
