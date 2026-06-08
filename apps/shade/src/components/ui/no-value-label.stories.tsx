import type {Meta, StoryObj} from '@storybook/react-vite';
import {NoValueLabel, NoValueLabelIcon} from './no-value-label';
import {Ban, EyeOff} from 'lucide-react';

const meta = {
    title: 'Components / No value label',
    component: NoValueLabel,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Inline helper to explain why a value is missing or unavailable. Compose with `NoValueLabelIcon` and short copy.'
            }
        }
    }
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

export const WithLongerCopy: Story = {
    render: () => (
        <NoValueLabel>
            <NoValueLabelIcon>
                <EyeOff />
            </NoValueLabelIcon>
            This value is hidden based on your current plan. Upgrade to unlock it.
        </NoValueLabel>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use concise, actionable copy. A single sentence usually works best.'
            }
        }
    }
};
