import type {Meta, StoryObj} from '@storybook/react-vite';
import {Flag} from './flag';

const meta = {
    title: 'Components / Flag',
    component: Flag,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Display country flags using ISO country codes. Built on react-world-flags with customizable sizing and fallback support for invalid or missing country codes.'
            }
        }
    },
    argTypes: {
        countryCode: {
            control: {type: 'text'},
            description: 'ISO country code (e.g., US, GB, FR)'
        },
        width: {
            control: {type: 'text'}
        },
        height: {
            control: {type: 'text'}
        },
        fallback: {
            control: false
        }
    }
} satisfies Meta<typeof Flag>;

export default meta;
type Story = StoryObj<typeof Flag>;

export const Default: Story = {
    args: {
        countryCode: 'US'
    }
};

export const UnitedKingdom: Story = {
    args: {
        countryCode: 'GB'
    }
};

export const France: Story = {
    args: {
        countryCode: 'FR'
    }
};

export const Germany: Story = {
    args: {
        countryCode: 'DE'
    }
};

export const Canada: Story = {
    args: {
        countryCode: 'CA'
    }
};

export const CustomSize: Story = {
    args: {
        countryCode: 'JP',
        width: '32px',
        height: '20px'
    }
};

export const LargeSize: Story = {
    args: {
        countryCode: 'BR',
        width: '48px',
        height: '32px'
    }
};

export const InvalidCode: Story = {
    args: {
        countryCode: 'XX'
    }
};

export const WithCustomFallback: Story = {
    args: {
        countryCode: 'INVALID',
        fallback: <span className="flex items-center justify-center text-xs">?</span>
    }
};

export const MultipleFlags: Story = {
    render: () => (
        <div className="flex gap-2">
            <Flag countryCode="US" />
            <Flag countryCode="GB" />
            <Flag countryCode="FR" />
            <Flag countryCode="DE" />
            <Flag countryCode="JP" />
            <Flag countryCode="AU" />
        </div>
    )
};