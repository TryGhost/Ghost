import Button from '../../../../admin-x-ds/global/Button';
import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import StripeButton from '../../../../admin-x-ds/settings/StripeButton';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as StripeVerified} from '../../../../assets/images/stripe-verified.svg';

const Start: React.FC<{onNext?: () => void}> = ({onNext}) => {
    return (
        <div>
            <div className='flex items-center justify-between'>
                <Heading level={3}>Getting paid</Heading>
                <StripeVerified />
            </div>
            <div className='mb-7 mt-6'>
                Stripe is our exclusive direct payments partner. Ghost collects <strong>no fees</strong> on any payments! If you don’t have a Stripe account yet, you can <a className='underline' href="https://stripe.com" rel="noopener noreferrer" target="_blank">sign up here</a>.
            </div>
            <StripeButton label={<>I have a Stripe account, let's go &rarr;</>} onClick={onNext} />
        </div>
    );
};

const Connect: React.FC<{
    submitEnabled: boolean,
    onSubmit?: () => void,
    onEnterKey?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
    onTestMode?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    testMode?: boolean;
}> = ({
    submitEnabled = false,
    onSubmit,
    onEnterKey,
    onTestMode,
    testMode
}) => {
    return (
        <div>
            <div className='mb-6 flex items-center justify-between'>
                <Heading level={3}>Connect with Stripe</Heading>
                <Toggle
                    direction='rtl'
                    label='Test mode'
                    labelClasses={`text-sm translate-y-[1px] ${testMode ? 'text-[#EC6803]' : 'text-grey-800'}`}
                    toggleBgClass='bg-[#EC6803]'
                    onChange={onTestMode}
                />
            </div>
            <Heading level={6} grey>Step 1 — <span className='text-black'>Generate secure key</span></Heading>
            <div className='mb-4 mt-2'>
                Click on the <strong>“Connect with Stripe”</strong> button to generate a secure key that connects your Ghost site with Stripe.
            </div>
            <StripeButton onClick={() => {}} />
            <Heading className='mb-2 mt-8' level={6} grey>Step 2 — <span className='text-black'>Paste secure key</span></Heading>
            <TextArea clearBg={false} placeholder='Paste your secure key here' onChange={onEnterKey}></TextArea>
            {submitEnabled && <Button className='mt-5' color='green' label='Save Stripe settings' onClick={onSubmit} />}
        </div>
    );
};

const StripeConnectModal: React.FC = () => {
    const {updateRoute} = useRouting();
    const [step, setStep] = useState('start');
    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [testMode, setTestMode] = useState(false);

    const next = () => {
        switch (step) {
        default:
            setStep('connect');
            break;
        }
    };

    const enterKey = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSubmitEnabled(Boolean(event.target.value));
    };

    const onTestMode = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTestMode(event.target.checked);
    };

    let contents;
    switch (step) {
    case 'connect':
        contents = <Connect submitEnabled={submitEnabled} testMode={testMode} onEnterKey={enterKey} onTestMode={onTestMode} />;
        break;
    default:
        contents = <Start onNext={next} />;
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