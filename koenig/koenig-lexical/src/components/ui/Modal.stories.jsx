import React, {useState} from 'react';
import {Modal} from './Modal';

const story = {
    title: 'Generic/Modal',
    component: Modal,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = (args) => {
    const [isOpen, setOpen] = useState(false);

    const openModal = () => setOpen(true);
    const closeModal = () => setOpen(false);

    return (
        <div className="relative ml-[66px] mt-[2px]">
            <button onClick={openModal}>Open modal</button>

            <Modal isOpen={isOpen} onClose={closeModal}>
                <div className="p-8">
                    <h1>Headline</h1>

                    Some content
                </div>
            </Modal>
        </div>
    );
};

export const Default = Template.bind({});
