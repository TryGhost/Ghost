import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TiersList from './tiers/tiers-list';
import TopLevelGroup from '../../top-level-group';
import clsx from 'clsx';
import {Button, CurrencyField, LimitModal, Select, SettingGroupContent, StripeButton, TabView, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../hooks/use-limiter';
import {type Setting, checkStripeEnabled, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {type Tier, getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {currencySelectGroups, validateCurrencyAmount} from '../../../utils/currency';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const StripeConnectedButton: React.FC<{className?: string; onClick: () => void;}> = ({className, onClick}) => {
    className = clsx(
        'group flex shrink-0 items-center justify-center rounded border border-grey-300 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-grey-900 transition-all hover:border-grey-500 dark:border-grey-900 dark:text-white',
        className
    );
    return (
        <button className={className} data-testid='stripe-connected' type='button' onClick={onClick}>
            <span className="inline-flex size-2 rounded-full bg-green transition-all group-hover:bg-[#625BF6]"></span>
            <span className='ml-2'>Connected to Stripe</span>
        </button>
    );
};

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const {settings, config} = useGlobalData();
    const [machinePaymentsAmountError, setMachinePaymentsAmountError] = useState<string | undefined>();
    const {data: {tiers, meta, isEnd} = {}, fetchNextPage} = useBrowseTiers();
    const {mutateAsync: editSettings} = useEditSettings();
    const activeTiers = getActiveTiers(tiers || []);
    const archivedTiers = getArchivedTiers(tiers || []);
    const defaultPaidTierCurrency = activeTiers.find(tier => tier.type === 'paid' && tier.currency)?.currency || 'USD';
    const {updateRoute} = useRouting();
    const limiter = useLimiter();
    const handleError = useHandleError();
    const [
        machinePaymentsEnabledValue,
        machinePaymentsCurrencyValue,
        machinePaymentsAmountValue,
        llmsEnabledValue
    ] = getSettingValues(settings, [
        'machine_payments_enabled',
        'machine_payments_currency',
        'machine_payments_amount',
        'llms_enabled'
    ]);
    const llmsEnabled = llmsEnabledValue !== false;
    const machinePaymentsEnabled = machinePaymentsEnabledValue === true;
    const effectiveMachinePaymentsEnabled = llmsEnabled && machinePaymentsEnabled;
    const hasMachinePaymentsLab = config?.labs?.machinePayments === true;
    const machinePaymentsCurrency = (machinePaymentsCurrencyValue || defaultPaidTierCurrency) as string;
    const machinePaymentsAmount = Number(machinePaymentsAmountValue || 100);
    const machinePaymentsHint = llmsEnabled ?
        'Charge LLMs and AI agents for access to paid-members posts' :
        <><a className='text-green' href="#/settings/metadata" onClick={(event) => {
            event.preventDefault();
            updateRoute('metadata');
        }}>llms.txt</a> must be enabled to use agent payments</>;

    const openConnectModal = async () => {
        // Allow Stripe despite the limit when it's already connected, so it's
        // possible to disconnect or update the settings.
        if (limiter?.isDisabled('limitStripeConnect') && !checkStripeEnabled(settings, config)) {
            try {
                await limiter.errorIfWouldGoOverLimit('limitStripeConnect');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        prompt: error.message || `Your current plan doesn't support Stripe Connect.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                    });
                    return;
                }
            }
        }
        updateRoute('stripe-connect');
    };

    const sortTiers = (t: Tier[]) => {
        return [...t].sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
    };

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} />)
        }
    ];

    let content;
    if (checkStripeEnabled(settings, config)) {
        content = <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />;
    } else {
        content = <TiersList tab='free-tier' tiers={activeTiers.filter(tier => tier.type === 'free')} />;
    }

    const saveMachinePaymentSettings = async (updates: Setting[]) => {
        try {
            await editSettings(updates);
        } catch (error) {
            handleError(error);
        }
    };

    const handleMachinePaymentsToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        void saveMachinePaymentSettings([
            {key: 'machine_payments_enabled', value: e.target.checked}
        ]);
    };

    const handleMachinePaymentsCurrencyChange = (currency: string) => {
        setMachinePaymentsAmountError(validateCurrencyAmount(machinePaymentsAmount, currency, {allowZero: false}));
        void saveMachinePaymentSettings([
            {key: 'machine_payments_currency', value: currency}
        ]);
    };

    const handleMachinePaymentsAmountChange = (cents: number) => {
        const validationError = validateCurrencyAmount(cents, machinePaymentsCurrency, {allowZero: false});
        setMachinePaymentsAmountError(validationError);

        if (!validationError) {
            void saveMachinePaymentSettings([
                {key: 'machine_payments_amount', value: cents}
            ]);
        }
    };

    const stripeButton = checkStripeEnabled(settings, config) ?
        <StripeConnectedButton className='hidden tablet:!visible tablet:!block' onClick={openConnectModal} />
        :
        <StripeButton className='hidden tablet:!visible tablet:!block' onClick={openConnectModal}/>;

    return (
        <TopLevelGroup
            customButtons={stripeButton}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            <div className='w-full tablet:hidden'>
                {checkStripeEnabled(settings, config) ?
                    <StripeConnectedButton className='w-full' onClick={openConnectModal} />
                    :
                    <StripeButton onClick={openConnectModal}/>
                }
            </div>

            {content}
            {isEnd === false && <Button
                label={`Load more (showing ${tiers?.length || 0}/${meta?.pagination.total || 0} tiers)`}
                link
                onClick={() => fetchNextPage()}
            />}
            {hasMachinePaymentsLab && <SettingGroupContent className='border-t border-grey-200 pt-6 dark:border-grey-900' columns={1}>
                <Toggle
                    align='center'
                    checked={effectiveMachinePaymentsEnabled}
                    direction='rtl'
                    disabled={!llmsEnabled}
                    gap='gap-0'
                    hint={machinePaymentsHint}
                    label='Accept payments from AI agents'
                    onChange={handleMachinePaymentsToggleChange}
                />
                {effectiveMachinePaymentsEnabled &&
                    <div className='mt-3 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-end'>
                        <p className='max-w-[720px] text-sm text-grey-700 dark:text-grey-600'>
                            By default, AI agents can&apos;t access content for paid members. When enabled, this setting offers agents a checkout flow to purchase access to individual posts.
                        </p>
                        <CurrencyField
                            key={machinePaymentsAmount}
                            containerClassName='w-full max-w-[180px] md:justify-self-end'
                            error={!!machinePaymentsAmountError}
                            hint={machinePaymentsAmountError}
                            placeholder="1"
                            rightPlaceholder={(
                                <Select
                                    border={false}
                                    clearBg={true}
                                    containerClassName='w-14'
                                    fullWidth={false}
                                    options={currencySelectGroups()}
                                    selectedOption={currencySelectGroups().flatMap(group => group.options).find(option => option.value === machinePaymentsCurrency)}
                                    title='Currency'
                                    hideTitle
                                    isSearchable
                                    onSelect={option => handleMachinePaymentsCurrencyChange(option?.value || 'USD')}
                                />
                            )}
                            title='Price per post'
                            valueInCents={machinePaymentsAmount}
                            onChange={handleMachinePaymentsAmountChange}
                            onKeyDown={() => setMachinePaymentsAmountError(undefined)}
                        />
                    </div>
                }
            </SettingGroupContent>}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Tiers, 'Tiers');
