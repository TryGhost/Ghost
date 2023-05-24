import type {Meta, StoryObj} from '@storybook/react';

import Modal from './Modal';
import ModalContainer from './ModalContainer';
import NiceModal from '@ebay/nice-modal-react';

const meta = {
    title: 'Global / Modal',
    component: Modal,
    tags: ['autodocs'],
    decorators: [(_story: any, context: any) => (
        <NiceModal.Provider>
            <ModalContainer {...context.args} />
        </NiceModal.Provider>
    )]
    
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof Modal>;

const modalContent = (<div>Modal content</div>);

export const Default: Story = {
    args: {
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Modal dialog',
        children: modalContent
    }
};

export const Small: Story = {
    args: {
        size: 'sm',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Small modal',
        children: modalContent
    }
};

export const Medium: Story = {
    args: {
        size: 'md',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Medium modal (default size)',
        children: modalContent
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Large modal',
        children: modalContent
    }
};

export const ExtraLarge: Story = {
    args: {
        size: 'xl',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Extra large modal',
        children: modalContent
    }
};

export const full: Story = {
    args: {
        size: 'full',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Full modal',
        children: modalContent
    }
};

export const Bleed: Story = {
    args: {
        size: 'bleed',
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Full bleed modal',
        children: modalContent
    }
};

export const CustomButtons: Story = {
    args: {
        leftButtonLabel: 'Extra action',
        cancelLabel: 'Nope',
        okLabel: 'Yep',
        onOk: () => {
            alert('Clicked Yep!');
        },
        title: 'Custom buttons',
        children: modalContent
    }
};