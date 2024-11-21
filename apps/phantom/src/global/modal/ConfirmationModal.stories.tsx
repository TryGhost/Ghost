import type {Meta, StoryContext, StoryObj} from '@storybook/react';
import {ReactNode} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import Button from '../Button';
import ConfirmationModal, {ConfirmationModalProps} from './ConfirmationModal';

const ConfirmationModalContainer: React.FC<ConfirmationModalProps> = ({...props}) => {
    return (
        <Button color='black' label='Open confirmation modal' onClick={() => {
            NiceModal.show(ConfirmationModal, {...props});
        }} />
    );
};

const meta = {
    title: 'Global / Modal / Confirmation Modal',
    component: ConfirmationModal,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode, context: StoryContext) => (
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
