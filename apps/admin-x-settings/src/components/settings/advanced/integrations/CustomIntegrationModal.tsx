import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useRouting from '../../../../hooks/useRouting';

interface CustomIntegrationModalProps {}

const CustomIntegrationModal: React.FC<CustomIntegrationModalProps> = () => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    const integrationTitle = 'A custom integration';

    return <Modal
        afterClose={() => {
            updateRoute('integrations');
        }}
        okColor='black'
        okLabel='Save & close'
        size='md'
        testId='custom-integration-modal'
        title={integrationTitle}
        onOk={async () => {}}
    >
        <div className='flex w-full gap-4'>
            <div className='h-14 w-14'>
                Fileupload
            </div>
            <div className='flex flex-col'>
                <h3>Title</h3>
                <div className='text-grey-600'>Detail</div>
                Content API key
                Admin API key
                API URL
            </div>
        </div>

        <div>
            Webhooks
        </div>

    </Modal>;
};

export default NiceModal.create(CustomIntegrationModal);
