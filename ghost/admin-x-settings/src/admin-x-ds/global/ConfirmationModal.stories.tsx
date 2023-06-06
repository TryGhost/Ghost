import type {Meta, StoryObj} from '@storybook/react';

import ConfirmationModal from './ConfirmationModal';
import ConfirmationModalContainer from './ConfirmationModalContainer';
import NiceModal from '@ebay/nice-modal-react';

const meta = {
    title: 'Global / Modal / Confirmation Modal',
    component: ConfirmationModal,
    tags: ['autodocs'],
    decorators: [(_story: any, context: any) => (
        <NiceModal.Provider>
            <ConfirmationModalContainer {...context.args} />
        </NiceModal.Provider>
    )]
} satisfies Meta<typeof ConfirmationModal>;

export default meta;
type Story = StoryObj<typeof ConfirmationModal>;

export const Default: Story = {
    args: {
        title: 'Are you sure?',
        prompt: 'Watch out, you\'re doing something super-super dangerous. Don\'t press the red button (you know you will).'
    }
};

export const CustomButtons: Story = {
    args: {
        ...Default.args,
        title: 'You want to delete?',
        cancelLabel: 'Meh',
        okLabel: 'Alrite',
        okColor: 'red'
    }
};
