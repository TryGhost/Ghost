import BookmarkThumb from '../../../../assets/images/stripe-thumb.jpg';
import GhostLogo from '../../../../assets/images/orb-squircle.png';
import GhostLogoPink from '../../../../assets/images/orb-pink.png';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import StripeLogo from '../../../../assets/images/stripe-emblem.svg';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Button, ConfirmationModal, Form, Heading, Modal, StripeButton, TextArea, TextField, Toggle, showToast} from '@tryghost/admin-x-design-system';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {ReactComponent as StripeVerified} from '../../../../assets/images/stripe-verified.svg';
import {checkStripeEnabled, getSettingValue, getSettingValues, useDeleteStripeSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {toast} from 'react-hot-toast';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

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
            <StripeButton label={<>I have a Stripe account, let&apos;s go &rarr;</>} onClick={onNext} />
        </div>
    );
};

const Connect: React.FC = () => {
    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [token, setToken] = useState('');
    const [testMode, setTestMode] = useState(false);
    const [error, setError] = useState('');

    const {refetch: fetchActiveTiers} = useBrowseTiers({
        searchParams: {filter: 'type:paid+active:true'},
        enabled: false
    });
    const {mutateAsync: editTier} = useEditTier();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const onTokenChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setToken(event.target.value);
        setSubmitEnabled(Boolean(event.target.value));
    };

    const saveTier = async () => {
        const {data} = await fetchActiveTiers();
        const tier = data?.pages[0].tiers[0];

        if (tier) {
            tier.monthly_price = 500;
            tier.yearly_price = 5000;
            tier.currency = 'USD';

            let pollTimeout = 0;
            /** To allow Stripe config to be ready in backend, we poll the save tier request */
            while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
                await new Promise((resolve) => {
                    setTimeout(resolve, RETRY_PRODUCT_SAVE_POLL_LENGTH);
                });

                try {
                    await editTier(tier);
                    break;
                } catch (e) {
                    if (e instanceof JSONError && e.data?.errors?.[0].code === 'STRIPE_NOT_CONFIGURED') {
                        pollTimeout += RETRY_PRODUCT_SAVE_POLL_LENGTH;
                        // no-op: will try saving again as stripe is not ready
                        continue;
                    } else {
                        handleError(e);
                        return;
                    }
                }
            }
        }
    };

    const onSubmit = async () => {
        setError('');

        if (token) {
            try {
                await editSettings([
                    {key: 'stripe_connect_integration_token', value: token}
                ]);

                await saveTier();

                await editSettings([
                    {key: 'portal_plans', value: JSON.stringify(['free', 'monthly', 'yearly'])}
                ]);
            } catch (e) {
                if (e instanceof JSONError && e.data?.errors) {
                    setError('Invalid secure key');
                    return;
                } else {
                    handleError(e);
                    return;
                }
            }
        } else {
            setError('Please enter a secure key');
        }
    };

    const {apiRoot} = getGhostPaths();
    const stripeConnectUrl = `${apiRoot}/members/stripe_connect?mode=${testMode ? 'test' : 'live'}`;

    return (
        <div>
            <div className='mb-6 flex items-center justify-between'>
                <Heading level={3}>Connect with Stripe</Heading>
                <Toggle
                    direction='rtl'
                    label='Test mode'
                    labelClasses={`text-sm translate-y-[1px] ${testMode ? 'text-[#EC6803]' : 'text-grey-800'}`}
                    toggleBg='stripetest'
                    onChange={e => setTestMode(e.target.checked)}
                />
            </div>
            <Heading level={6} grey>Step 1 — <span className='text-black dark:text-white'>Generate secure key</span></Heading>
            <div className='mb-4 mt-2'>
                Click on the <strong>“Connect with Stripe”</strong> button to generate a secure key that connects your Ghost site with Stripe.
            </div>
            <StripeButton href={stripeConnectUrl} tag='a' target='_blank' />
            <Heading className='mb-2 mt-8' level={6} grey>Step 2 — <span className='text-black dark:text-white'>Paste secure key</span></Heading>
            <TextArea error={Boolean(error)} hint={error || undefined} placeholder='Paste your secure key here' onChange={onTokenChange}></TextArea>
            {submitEnabled && <Button className='mt-5' color='green' label='Save Stripe settings' onClick={onSubmit} />}
        </div>
    );
};

const Connected: React.FC<{onClose?: () => void}> = ({onClose}) => {
    const {settings} = useGlobalData();
    const [stripeConnectAccountName, stripeConnectLivemode] = getSettingValues(settings, ['stripe_connect_display_name', 'stripe_connect_livemode']);

    const {refetch: fetchMembers, isFetching: isFetchingMembers} = useBrowseMembers({
        searchParams: {filter: 'status:paid', limit: '0'},
        enabled: false
    });

    const {mutateAsync: deleteStripeSettings} = useDeleteStripeSettings();
    const handleError = useHandleError();

    const openDisconnectStripeModal = async () => {
        const {data} = await fetchMembers();
        const hasActiveStripeSubscriptions = Boolean(data?.meta?.pagination.total);

        // const hasActiveStripeSubscriptions = false; //...
        // this.ghostPaths.url.api('/members/') + '?filter=status:paid&limit=0';
        NiceModal.show(ConfirmationModal, {
            title: 'Disconnect Stripe',
            prompt: (hasActiveStripeSubscriptions ? 'Cannot disconnect while there are members with active Stripe subscriptions.' : <>You&lsquo;re about to disconnect your Stripe account {stripeConnectAccountName} from this site. This will automatically turn off paid memberships on this site.</>),
            okLabel: hasActiveStripeSubscriptions ? '' : 'Disconnect',
            onOk: async (modal) => {
                try {
                    await deleteStripeSettings(null);
                    modal?.remove();
                    onClose?.();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (
        <section>
            <div className='flex items-center justify-between'>
                <Button color='red' disabled={isFetchingMembers} icon='link-broken' iconColorClass='text-red' label='Disconnect' link onClick={openDisconnectStripeModal} />
                <Button icon='close' iconColorClass='dark:text-white' label='Close' size='sm' hideLabel link onClick={onClose} />
            </div>
            <div className='my-20 flex flex-col items-center'>
                <div className='relative h-20 w-[200px]'>
                    <img alt='Ghost Logo' className='absolute left-10 h-16 w-16' src={GhostLogo} />
                    <img alt='Stripe Logo' className='absolute right-10 h-16 w-16 rounded-2xl shadow-[-1.5px_0_0_1.5px_#fff] dark:shadow-[-1.5px_0_0_1.5px_black]' src={StripeLogo} />
                </div>
                <Heading className='text-center' level={3}>You are connected with Stripe!{stripeConnectLivemode ? null : ' (Test mode)'}</Heading>
                <div className='mt-1'>Connected to <strong>{stripeConnectAccountName ? stripeConnectAccountName : 'Test mode'}</strong></div>
            </div>
            <div className='flex flex-col items-center'>
                <Heading level={6}>Read next</Heading>
                <a className='w-100 mt-5 flex flex-col items-stretch justify-between rounded-sm border border-grey-200 transition-all hover:border-grey-400 md:flex-row dark:border-grey-900' href="https://ghost.org/resources/managing-your-stripe-account/?ref=admin" rel="noopener noreferrer" target="_blank">
                    <div className='order-2 p-4 md:order-1'>
                        <div className='font-bold'>How to setup and manage your Stripe account</div>
                        <div className='mt-1 text-sm text-grey-800 dark:text-grey-500'>Learn how to configure your Stripe account to work with Ghost, from custom branding to payment receipt emails.</div>
                        <div className='mt-3 flex items-center gap-1 text-sm text-grey-800 dark:text-grey-500'>
                            <img alt='Ghost Logo' className='h-4 w-4' src={GhostLogoPink} />
                            <strong>Ghost Resources</strong>
                            <span>&middot;</span>
                            <span>by Kym Ellis</span>
                        </div>
                    </div>
                    <div className='order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:!visible md:order-2 md:!flex'>
                        <img alt="Bookmark Thumb" className='min-h-full min-w-full shrink-0' src={BookmarkThumb} />
                    </div>
                </a>
            </div>
        </section>
    );
};

const Direct: React.FC<{onClose: () => void}> = ({onClose}) => {
    const {localSettings, updateSetting, handleSave, saveState} = useSettingGroup();
    const [publishableKey, secretKey] = getSettingValues(localSettings, ['stripe_publishable_key', 'stripe_secret_key']);

    const onSubmit = async () => {
        try {
            toast.remove();
            await handleSave();
            onClose();
        } catch (e) {
            if (e instanceof JSONError) {
                showToast({
                    title: 'Failed to save settings',
                    type: 'error',
                    message: 'Check you copied both keys correctly'
                });
                return;
            }

            throw e;
        }
    };

    return (
        <div>
            <Heading level={3}>Connect Stripe</Heading>
            <Form marginBottom={false} marginTop>
                <TextField title='Publishable key' value={publishableKey?.toString()} onChange={e => updateSetting('stripe_publishable_key', e.target.value)} />
                <TextField title='Secure key' value={secretKey?.toString()} onChange={e => updateSetting('stripe_secret_key', e.target.value)} />
                <Button className='mt-5' color='green' disabled={saveState === 'saving'} label='Save Stripe settings' onClick={onSubmit} />
            </Form>
        </div>
    );
};

const StripeConnectModal: React.FC = () => {
    const {config, settings} = useGlobalData();
    const stripeConnectAccountId = getSettingValue(settings, 'stripe_connect_account_id');
    const {updateRoute} = useRouting();
    const [step, setStep] = useState<'start' | 'connect'>('start');
    const mainModal = useModal();

    const startFlow = () => {
        setStep('connect');
    };

    const close = () => {
        mainModal.remove();
        updateRoute('tiers');
    };

    let contents;

    if (config?.stripeDirect || (
        // Still show Stripe Direct to allow disabling the keys if the config was turned off but stripe direct is still set up
        checkStripeEnabled(settings || [], config || {}) && !stripeConnectAccountId
    )) {
        contents = <Direct onClose={close} />;
    } else if (stripeConnectAccountId) {
        contents = <Connected onClose={close} />;
    } else if (step === 'start') {
        contents = <Start onNext={startFlow} />;
    } else {
        contents = <Connect />;
    }

    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        cancelLabel=''
        footer={<div className='mt-8'></div>}
        testId='stripe-modal'
        title=''
        width={stripeConnectAccountId ? 740 : 520}
        hideXOnMobile
    >
        {contents}
    </Modal>;
};

export default NiceModal.create(StripeConnectModal);
