import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useRouting from '../../../../hooks/useRouting';

interface AddIntegrationModalProps {}

const AddIntegrationModal: React.FC<AddIntegrationModalProps> = () => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    return <Modal
        afterClose={() => {
            updateRoute('integrations');
        }}
        okColor='black'
        okLabel='Add'
        size='sm'
        testId='add-integration-modal'
        title='Add integration'
        onOk={async () => {}}
    >
        <div className='mt-5'>
            <Form
                marginBottom={false}
                marginTop={false}
            >
                <TextField
                    placeholder='Custom integration'
                    title='Name'
                />
            </Form>
        </div>
    </Modal>;
};

export default NiceModal.create(AddIntegrationModal);
