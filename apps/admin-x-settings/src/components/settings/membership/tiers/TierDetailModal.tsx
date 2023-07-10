import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
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
        title='Tier'>
        <div>
            Form
        </div>
        <div>
            Preview
        </div>
    </Modal>;
};

export default NiceModal.create(TierDetailModal);