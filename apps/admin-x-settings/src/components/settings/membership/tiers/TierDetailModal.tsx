import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TierDetailPreview from './TierDetailPreview';
import useRouting from '../../../../hooks/useRouting';

interface TierDetailModalProps {

}

const TierDetailModal: React.FC<TierDetailModalProps> = () => {
    const {updateRoute} = useRouting();
    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        okLabel='Save & close'
        size='lg'
        title='Tier'
        stickyFooter>
        <div className='mt-5 flex items-start'>
            <div className='grow'>
                <Form>
                    Tier form
                </Form>
            </div>
            <div className='sticky top-[77px] shrink-0 basis-[380px]'>
                <TierDetailPreview />
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(TierDetailModal);