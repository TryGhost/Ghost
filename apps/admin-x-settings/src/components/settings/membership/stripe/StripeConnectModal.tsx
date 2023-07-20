import BookmarkThumb from '../../../../assets/images/stripe-thumb.jpg';
import Button from '../../../../admin-x-ds/global/Button';
import GhostLogo from '../../../../assets/images/orb-squircle.png';
import GhostLogoPink from '../../../../assets/images/orb-pink.png';
import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import StripeButton from '../../../../admin-x-ds/settings/StripeButton';
import StripeLogo from '../../../../assets/images/stripe-emblem.svg';
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
                    toggleBg='stripetest'
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

const Connected: React.FC<{onClose?: () => void}> = ({onClose}) => {
    return (
        <section>
            <div className='flex items-center justify-between'>
                <Button icon='link-broken' label='Disconnect' link />
                <Button icon='close' size='sm' link onClick={onClose} />
            </div>
            <div className='my-20 flex flex-col items-center'>
                <div className='relative h-20 w-[200px]'>
                    <img alt='Ghost Logo' className='absolute left-10 h-16 w-16' src={GhostLogo} />
                    <img alt='Stripe Logo' className='absolute right-10 h-16 w-16 rounded-2xl shadow-[-1.5px_0_0_1.5px_#fff]' src={StripeLogo} />
                </div>
                <Heading level={3}>You are connected with Stripe!</Heading>
                <div className='mt-1'>Connected to <strong>Dummy</strong></div>
            </div>
            <div className='flex flex-col items-center'>
                <Heading level={6}>Read next</Heading>
                <a className='w-100 mt-5 flex items-stretch justify-between border border-grey-200 transition-all hover:border-grey-400' href="https://ghost.org/resources/managing-your-stripe-account/?ref=admin" rel="noopener noreferrer" target="_blank">
                    <div className='p-4'>
                        <div className='font-bold'>How to setup and manage your Stripe account</div>
                        <div className='mt-1 text-sm text-grey-800'>Learn how to configure your Stripe account to work with Ghost, from custom branding to payment receipt emails.</div>
                        <div className='mt-3 flex items-center gap-1 text-sm text-grey-800'>
                            <img alt='Ghost Logo' className='h-4 w-4' src={GhostLogoPink} />
                            <strong>Ghost Resources</strong>
                            <span>&middot;</span>
                            <span>by Kym Ellis</span>
                        </div>
                    </div>
                    <div className='flex w-[200px] shrink-0 items-center justify-center overflow-hidden'>
                        <img alt="Bookmark Thumb" className='min-h-full min-w-full shrink-0' src={BookmarkThumb} />
                    </div>
                </a>
            </div>
        </section>
    );
};

const StripeConnectModal: React.FC = () => {
    const {updateRoute} = useRouting();
    const [step, setStep] = useState('start');
    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const mainModal = useModal();

    const next = () => {
        switch (step) {
        case 'connect':
            setStep('connected');
            break;
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

    const close = () => {
        mainModal.remove();
    };

    let contents;
    switch (step) {
    case 'connect':
        contents = <Connect submitEnabled={submitEnabled} testMode={testMode} onEnterKey={enterKey} onSubmit={next} onTestMode={onTestMode} />;
        break;
    case 'connected':
        contents = <Connected onClose={close} />;
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
        size={step === 'connected' ? 740 : 520}
        title=''
    >
        {contents}
    </Modal>;
};

export default NiceModal.create(StripeConnectModal);