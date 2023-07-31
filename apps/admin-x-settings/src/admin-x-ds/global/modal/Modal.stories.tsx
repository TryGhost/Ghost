import type {Meta, StoryObj} from '@storybook/react';

import Modal from './Modal';
import ModalContainer from './ModalContainer';
import ModalPage from './ModalPage';
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

export const Full: Story = {
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

export const CompletePage: Story = {
    args: {
        size: 'full',
        footer: <></>,
        noPadding: true,
        children: <>
            <ModalPage heading='Hey there full page'>
                <p>This is a full page in a modal</p>
            </ModalPage>
        </>
    }
};

export const CustomButtons: Story = {
    args: {
        leftButtonProps: {
            label: 'Left button',
            onClick: () => {
                alert('Left button click');
            }
        },
        cancelLabel: 'Nope',
        okLabel: 'Yep',
        onOk: () => {
            alert('Clicked Yep!');
        },
        title: 'Custom buttons',
        children: modalContent
    }
};

const longContent = (
    <>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure. Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure. Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p className='mb-6'>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
        <p>Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure. Esse ex officia ipsum et magna reprehenderit ullamco dolore cillum cupidatat ullamco culpa. In et irure irure est id cillum officia pariatur et proident. Nulla nulla dolore qui excepteur magna eu adipisicing mollit. Eiusmod eu irure cupidatat consequat consectetur irure.</p>
    </>
);

export const StickyFooter: Story = {
    args: {
        size: 'md',
        stickyFooter: true,
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Sticky footer',
        children: longContent
    }
};

export const Dirty: Story = {
    args: {
        size: 'md',
        dirty: true,
        onOk: () => {
            alert('Clicked OK!');
        },
        title: 'Dirty modal',
        children: <p>Simulates if there were unsaved changes of a form. Click on Cancel</p>
    }
};