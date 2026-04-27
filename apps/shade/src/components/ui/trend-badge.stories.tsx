import type {Meta, StoryObj} from '@storybook/react-vite';
import {TrendBadge} from './trend-badge';

const meta = {
    title: 'Components / TrendBadge',
    component: TrendBadge,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Compact value + trend arrow used for KPI deltas. Direction drives both the icon and the color tone (success / danger / neutral).'
            }
        }
    },
    argTypes: {
        direction: {
            control: {type: 'select'},
            options: ['up', 'down', 'same', 'hidden']
        },
        value: {
            control: {type: 'text'}
        }
    }
} satisfies Meta<typeof TrendBadge>;

export default meta;
type Story = StoryObj<typeof TrendBadge>;

export const Up: Story = {
    args: {
        direction: 'up',
        value: '+5.2%'
    }
};

export const Down: Story = {
    args: {
        direction: 'down',
        value: '-2.4%'
    }
};

export const Same: Story = {
    args: {
        direction: 'same',
        value: '0%'
    }
};

export const WithTooltip: Story = {
    args: {
        direction: 'up',
        value: '+12%',
        tooltip: 'Compared to the previous 30 days'
    }
};

export const AllDirections: Story = {
    render: () => (
        <div className='flex items-center gap-2'>
            <TrendBadge direction='up' value='+5.2%' />
            <TrendBadge direction='down' value='-2.4%' />
            <TrendBadge direction='same' value='0%' />
        </div>
    )
};
