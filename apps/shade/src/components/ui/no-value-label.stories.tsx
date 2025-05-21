import type {Meta, StoryObj} from '@storybook/react';
import {NoValueLabel, NoValueLabelIcon} from './no-value-label';
import {Ban} from 'lucide-react';

const meta = {
    title: 'Components / No value label',
    component: NoValueLabel,
    tags: ['autodocs']
} satisfies Meta<typeof NoValueLabel>;

export default meta;
type Story = StoryObj<typeof NoValueLabel>;

export const Default: Story = {
    args: {},
    render: () => (
        <NoValueLabel>
            <NoValueLabelIcon>
                <Ban />
            </NoValueLabelIcon>
            You blocked this domain.
        </NoValueLabel>
    )
};
