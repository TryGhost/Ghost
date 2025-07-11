import type {Meta, StoryContext, StoryObj} from '@storybook/react';
import {ReactNode} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import Button from '../Button';
import LimitModal, {LimitModalProps} from './LimitModal';

const LimitModalContainer: React.FC<LimitModalProps> = ({...props}) => {
    return (
        <Button color='black' label='Open limit modal' onClick={() => {
            NiceModal.show(LimitModal, {...props});
        }} />
    );
};

const meta = {
    title: 'Global / Modal / Limit Modal',
    component: LimitModal,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode, context: StoryContext) => (
        <NiceModal.Provider>
            <LimitModalContainer {...context.args} />
        </NiceModal.Provider>
    )]
} satisfies Meta<typeof LimitModal>;

export default meta;
type Story = StoryObj<typeof LimitModal>;

export const Default: Story = {
    args: {
        title: 'You need to upgrade your plan',
        prompt: 'Your current plan only <a href="https://ghost.org/pricing/" target="_blank" rel="noopener">supports free integrations</a> including Slack, Unsplash, and FirstPromoter. To add a custom integration, upgrade to a different plan.'
    }
};
