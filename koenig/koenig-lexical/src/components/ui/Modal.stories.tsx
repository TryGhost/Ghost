import {Modal} from './Modal';
import {useState} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Modal> = {
    title: 'Generic/Modal',
    component: Modal,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof Modal> = (_args) => {
    const [isOpen, setOpen] = useState(false);

    const openModal = () => setOpen(true);
    const closeModal = () => setOpen(false);

    return (
        <div className="relative ml-[66px] mt-[2px]">
            <button type="button" onClick={openModal}>Open modal</button>

            <Modal isOpen={isOpen} onClose={closeModal}>
                <div className="p-8">
                    <h1>Headline</h1>

                    Some content
                </div>
            </Modal>
        </div>
    );
};

export const Default: StoryFn<typeof Modal> = Template.bind({});
