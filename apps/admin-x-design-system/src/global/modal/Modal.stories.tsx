import type {Meta, StoryContext, StoryObj} from '@storybook/react';
import {ReactNode} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import Button from '../Button';
import Modal, {ModalProps} from './Modal';
import ModalPage from './ModalPage';

const ModalContainer: React.FC<ModalProps> = ({children, ...props}) => {
    const modal = NiceModal.create<ModalProps>(() => {
        return (
            <Modal {...props}>
                <div className='py-4'>
                    {children}
                </div>
            </Modal>
        );
    });
    return (
        <div>
            <Button color='black' label='Open modal' onClick={() => {
                NiceModal.show(modal);
            }} />
        </div>
    );
};

const meta = {
    title: 'Global / Modal',
    component: Modal,
    tags: ['autodocs'],
    argTypes: {
        topRightContent: {
            control: {
                type: 'text'
            }
        }
    },
    decorators: [(_story: () => ReactNode, context: StoryContext) => (
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
        onCancel: undefined,
        topRightContent: 'close',
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
        onCancel: undefined,
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
        onCancel: undefined,
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
        onCancel: undefined,
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
        onCancel: undefined,
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
        onCancel: undefined,
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
        onCancel: undefined,
        title: 'Full bleed modal',
        children: modalContent
    }
};

export const CustomWidth: Story = {
    args: {
        width: 600,
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
        title: 'Custom width modal',
        children: modalContent
    }
};

export const CustomHeight: Story = {
    args: {
        size: 'md',
        height: 'full',
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
        title: 'Custom height modal',
        children: modalContent
    }
};

export const Square: Story = {
    args: {
        width: 320,
        height: 320,
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
        title: 'Square modal',
        children: modalContent
    }
};

export const CompletePage: Story = {
    args: {
        size: 'full',
        footer: <></>,
        padding: false,
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
        onCancel: undefined,
        title: 'Custom buttons',
        children: modalContent
    }
};

export const RightDrawer: Story = {
    args: {
        size: 'bleed',
        align: 'right',
        animate: false,
        width: 600,
        footer: <></>,
        children: <>
            <p>This is a drawer style on the right</p>
        </>
    }
};

export const LeftDrawer: Story = {
    args: {
        size: 'bleed',
        align: 'left',
        animate: false,
        width: 600,
        footer: <></>,
        children: <>
            <p>This is a drawer style on the right</p>
        </>
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

export const StickyHeader: Story = {
    args: {
        size: 'md',
        stickyHeader: true,
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
        title: 'Sticky header',
        stickyFooter: true,
        children: longContent
    }
};

export const StickyFooter: Story = {
    args: {
        size: 'md',
        stickyFooter: true,
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
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
        onCancel: undefined,
        title: 'Dirty modal',
        children: <p>Simulates if there were unsaved changes of a form. Click on Cancel</p>
    }
};

export const FormSheet: Story = {
    args: {
        onOk: () => {
            alert('Clicked OK!');
        },
        onCancel: undefined,
        size: 'sm',
        title: 'Form sheet',
        formSheet: true,
        children: <p>Slightly differently styled modal that can be used to display small forms <em>inside other modals</em>. Use it sparingly!</p>
    }
};
