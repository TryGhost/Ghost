import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import StripeButton from '../../../../admin-x-ds/settings/StripeButton';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as StripeVerified} from '../../../../assets/images/stripe-verified.svg';

const Start: React.FC = () => {
    return (
        <div>
            <div className='flex items-center justify-between'>
                <Heading level={3}>Getting paid</Heading>
                <StripeVerified />
            </div>
            <div className='mb-7 mt-6'>
                Stripe is our exclusive direct payments partner. Ghost collects <strong>no fees</strong> on any payments! If you don’t have a Stripe account yet, you can <a className='underline' href="https://stripe.com" rel="noopener noreferrer" target="_blank">sign up here</a>.
            </div>
            <StripeButton label={<>I have a Stripe account, let's go &rarr;</>} />
        </div>
    );
};

const StripeConnectModal: React.FC = () => {
    const {updateRoute} = useRouting();
    const [step, setStep] = useState('start');

    let contents;
    switch (step) {
    default:
        contents = <Start />;
        break;
    }

    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        cancelLabel=''
        footer={<></>}
        size={520}
        title=''
    >
        {contents}

    </Modal>;
};

export default NiceModal.create(StripeConnectModal);