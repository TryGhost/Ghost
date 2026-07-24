import BookmarkThumb from '../../../../assets/images/stripe-thumb.jpg';
import ConfirmationModal from '../../../confirmation-modal';
import GhostLogo from '../../../../assets/images/orb-squircle.png';
import GhostLogoPink from '../../../../assets/images/orb-pink.png';
import LimitModal from '../../../limit-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import StripeButton from '../../../stripe-button';
import StripeLogo from '../../../../assets/images/stripe-emblem.svg';
import StripeVerifiedBadge from '../../../../assets/images/stripe-verified.svg';
import useSettingGroup from '../../../../hooks/use-setting-group';
import {Button, Field, FieldError, FieldGroup, FieldLabel, Input, Switch, Textarea} from '@tryghost/shade/components';
import {HostLimitError, useLimiter} from '../../../../hooks/use-limiter';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Text} from '@tryghost/shade/primitives';
import {checkStripeEnabled, getSettingValue, getSettingValues, useDeleteStripeSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {toast} from 'sonner';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

const Start: React.FC<{onNext?: () => void}> = ({onNext}) => {
    return (
        <div>
            <div className='flex items-center justify-between'>
                <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>Getting paid</Text>
                <img alt='Stripe Verified Partner Badge' src={StripeVerifiedBadge} />
            </div>
            <div className='mt-6 mb-7'>
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
                <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>Connect with Stripe</Text>
                <Field className='w-auto' orientation='horizontal'>
                    <FieldLabel className={testMode ? 'text-orange' : 'text-muted-foreground'} htmlFor='stripe-test-mode'>Test mode</FieldLabel>
                    <Switch checked={testMode} className='data-[state=checked]:bg-orange!' id='stripe-test-mode' onCheckedChange={setTestMode} />
                </Field>
            </div>
            <Text as='h6' className='text-base' tone='secondary' weight='semibold'>Step 1 — <span className='text-foreground'>Generate secure key</span></Text>
            <div className='mt-2 mb-4'>
                Click on the <strong>“Connect with Stripe”</strong> button to generate a secure key that connects your Ghost site with Stripe.
            </div>
            <StripeButton href={stripeConnectUrl} target='_blank' />
            <Text as='h6' className='mt-8 mb-2 text-base' tone='secondary' weight='semibold'>Step 2 — <span className='text-foreground'>Paste secure key</span></Text>
            <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel className='sr-only' htmlFor='stripe-secure-key'>Secure key</FieldLabel>
                <Textarea aria-invalid={Boolean(error) || undefined} className='border-transparent bg-muted' id='stripe-secure-key' placeholder='Paste your secure key here' onChange={onTokenChange} />
                {error && <FieldError>{error}</FieldError>}
            </Field>
            {submitEnabled && <Button className='mt-5' type='button' onClick={onSubmit}>Save Stripe settings</Button>}
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
                <Button className='text-destructive hover:text-destructive' disabled={isFetchingMembers} type='button' variant='ghost' onClick={openDisconnectStripeModal}>
                    <LucideIcon.Unlink />
                    Disconnect
                </Button>
                <Button aria-label='Close' size='icon' type='button' variant='ghost' onClick={onClose}>
                    <LucideIcon.X />
                </Button>
            </div>
            <div className='my-20 flex flex-col items-center'>
                <div className='relative h-20 w-[200px]'>
                    <img alt='Ghost Logo' className='absolute left-10 size-16' src={GhostLogo} />
                    <img alt='Stripe Logo' className='absolute right-10 size-16 rounded-2xl shadow-[-1.5px_0_0_1.5px_#fff] dark:shadow-[-1.5px_0_0_1.5px_black]' src={StripeLogo} />
                </div>
                <Text as='h3' className='text-center md:text-2xl' leading='heading' size='xl' weight='bold'>You are connected with Stripe!{stripeConnectLivemode ? null : ' (Test mode)'}</Text>
                <div className='mt-1'>Connected to <strong>{stripeConnectAccountName ? stripeConnectAccountName : 'Test mode'}</strong></div>
            </div>
            <div className='flex flex-col items-center'>
                <Text as='h6' className='text-base' weight='semibold'>Read next</Text>
                <a className='mt-5 flex w-100 flex-col items-stretch justify-between overflow-hidden rounded-md border border-grey-200 transition-all hover:border-grey-400 md:flex-row dark:border-grey-900' href="https://ghost.org/resources/managing-your-stripe-account/?ref=admin" rel="noopener noreferrer" target="_blank">
                    <div className='order-2 p-4 md:order-1'>
                        <div className='text-md font-semibold'>How to setup and manage your Stripe account</div>
                        <div className='mt-2 text-grey-800 dark:text-grey-500'>Learn how to configure your Stripe account to work with Ghost, from custom branding to payment receipt emails.</div>
                        <div className='mt-3 flex items-center gap-1 text-grey-800 dark:text-grey-500'>
                            <img alt='Ghost Logo' className='size-4' src={GhostLogoPink} />
                            <span className='font-semibold'>Ghost Resources</span>
                        </div>
                    </div>
                    <div className='order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:visible! md:order-2 md:flex!'>
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
            toast.dismiss();
            await handleSave();
            onClose();
        } catch (e) {
            if (e instanceof JSONError) {
                toast.error('Failed to save settings', {description: 'Check you copied both keys correctly'});
                return;
            }

            throw e;
        }
    };

    return (
        <div>
            <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>Connect Stripe</Text>
            <FieldGroup className='mt-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <Field><FieldLabel htmlFor='stripe-publishable-key'>Publishable key</FieldLabel><Input id='stripe-publishable-key' value={publishableKey?.toString() ?? ''} onChange={e => updateSetting('stripe_publishable_key', e.target.value)} /></Field>
                <Field><FieldLabel htmlFor='stripe-secure-key'>Secure key</FieldLabel><Input id='stripe-secure-key' value={secretKey?.toString() ?? ''} onChange={e => updateSetting('stripe_secret_key', e.target.value)} /></Field>
                <Button className='mt-5' disabled={saveState === 'saving'} type='button' onClick={onSubmit}>Save Stripe settings</Button>
            </FieldGroup>
        </div>
    );
};

const StripeConnectModal: React.FC = () => {
    const {config, settings} = useGlobalData();
    const stripeConnectAccountId = getSettingValue(settings, 'stripe_connect_account_id');
    const {updateRoute} = useRouting();
    const [step, setStep] = useState<'start' | 'connect'>('start');
    const mainModal = useModal();
    const limiter = useLimiter();

    // Extract specific values needed for checkStripeEnabled, so not to
    // cause unnecessary re-renders by passing the whole settings object
    const stripeEnabled = checkStripeEnabled(settings, config);
    const hasStripeConnectLimit = limiter?.isDisabled('limitStripeConnect');

    useEffect(() => {
        const checkLimit = async () => {
            // Allow Stripe despite the limit when it's already connected, so it's
            // possible to disconnect or update the settings.
            if (hasStripeConnectLimit && !stripeEnabled) {
                try {
                    await limiter?.errorIfWouldGoOverLimit('limitStripeConnect');
                } catch (error) {
                    if (error instanceof HostLimitError) {
                        mainModal.remove();
                        NiceModal.show(LimitModal, {
                            prompt: error.message || `Your current plan doesn't support Stripe Connect.`,
                            onOk: () => updateRoute({route: '/pro', isExternal: true})
                        });
                    }
                }
            }
        };

        checkLimit();
    }, [limiter, mainModal, updateRoute, stripeEnabled, hasStripeConnectLimit]);

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

    return <SettingsModal
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
    </SettingsModal>;
};

export default NiceModal.create(StripeConnectModal);
