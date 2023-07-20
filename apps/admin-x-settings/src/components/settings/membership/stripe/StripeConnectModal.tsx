import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';

const Start: React.FC = () => {
    return (
        <div>
            Hello stripe connect yo!
        </div>
    );
};

const StripeConnectModal: React.FC = () => {
    const [step, setStep] = useState('start');

    let contents = <></>;
    switch (step) {
    case 'start':
        contents = <Start />;
        break;

    default:
        break;
    }

    return <Modal
        size='sm'
    >
        {contents}

    </Modal>;
};

export default NiceModal.create(StripeConnectModal);