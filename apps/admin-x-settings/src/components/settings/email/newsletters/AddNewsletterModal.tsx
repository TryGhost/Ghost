import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';

interface AddNewsletterModalProps {}

const AddNewsletterModal: React.FC<AddNewsletterModalProps> = () => {
    const [optIn, setOptIn] = useState(true);

    return <Modal
        okColor='black'
        okLabel='Create'
        size='sm'
        testId='add-newsletter-modal'
        title='Create newsletter'
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <TextField
                placeholder='Weekly roundup'
                title='Name'
            />
            <TextArea
                title='Description'
            />
            <Toggle
                checked={optIn}
                direction='rtl'
                hint='This newsletter will be available to all members. Your 1 existing subscriber will also be opted-in to receive it.'
                label='Opt-in existing subscribers'
                labelStyle='heading'
                onChange={(e) => {
                    setOptIn(e.target.checked);
                }}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddNewsletterModal);