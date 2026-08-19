import React, {useEffect, useRef, useState} from 'react';
import StripeButton from '@/settings/app/components/stripe-button';
import TiersList from './tiers/tiers-list';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import clsx from 'clsx';
import useCurrencyInput from '@/settings/app/hooks/use-currency-input';
import {Button, Field, FieldDescription, FieldError, FieldLabel, Indicator, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger, Switch, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {ChevronDown} from 'lucide-react';
import {HostLimitError, useLimiter} from '@/settings/app/hooks/use-limiter';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {type Setting, checkStripeEnabled, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {type Tier, getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {currencySelectGroups, validateCurrencyAmount} from '@/settings/app/utils/currency';
import {formatNumber} from '@tryghost/shade/utils';
import {useConfirmation} from '@/settings/app/components/providers/confirmation-provider';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';
import {useUpgradeRoute} from '@/settings/app/hooks/use-upgrade-route';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';

const StripeConnectedButton: React.FC<{className?: string; onClick: () => void;}> = ({className, onClick}) => {
    className = clsx(
        'h-[34px] shrink-0 gap-2 px-3 font-semibold',
        className
    );
    return (
        <Button className={className} data-testid='stripe-connected' type='button' variant='outline' onClick={onClick}>
            <Indicator variant='success' />
            <span>Connected to Stripe</span>
        </Button>
    );
};

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const [machinePaymentsAmountError, setMachinePaymentsAmountError] = useState<string | undefined>();
    const {settings, config} = useGlobalData();
    const {data: {tiers, meta, isEnd} = {}, fetchNextPage} = useBrowseTiers();
    const {mutateAsync: editSettings} = useEditSettings();
    const machinePaymentSaveQueue = useRef(Promise.resolve());
    const activeTiers = getActiveTiers(tiers || []);
    const archivedTiers = getArchivedTiers(tiers || []);
    const defaultPaidTierCurrency = activeTiers.find(tier => tier.type === 'paid' && tier.currency)?.currency || 'USD';
    const {updateRoute} = useSettingsNavigation();
    const upgradeRoute = useUpgradeRoute();
    const limiter = useLimiter();
    const {showLimit} = useConfirmation();
    const handleError = useHandleError();
    const stripeEnabled = checkStripeEnabled(settings, config);

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
    const hasMachinePaymentsLab = config?.labs?.machinePayments === true;
    // Admin and core deploy independently — only render controls once the
    // settings key exists in the browse payload (labs alone is not enough).
    const backendSupportsMachinePayments = settings?.some(s => s.key === 'machine_payments_enabled');
    const canEnableMachinePayments = llmsEnabled && stripeEnabled;
    const machinePaymentsCurrency = (machinePaymentsCurrencyValue || defaultPaidTierCurrency) as string;
    const machinePaymentsAmount = Number(machinePaymentsAmountValue || 100);
    const amountInput = useCurrencyInput(machinePaymentsAmount, (cents) => {
        const validationError = validateCurrencyAmount(cents, machinePaymentsCurrency, {allowZero: false});
        setMachinePaymentsAmountError(validationError);
        if (!validationError) {
            saveMachinePaymentSettings([{key: 'machine_payments_amount', value: cents}]);
        }
    });
    const currencyOptions = currencySelectGroups().flatMap(group => group.options.map(option => ({
        ...option,
        metadata: {groupKey: group.key, groupLabel: group.label}
    })));

    const machinePaymentsHint = !llmsEnabled
        ? 'llms.txt must be enabled to use agent payments'
        : !stripeEnabled
            ? 'Connect Stripe to accept payments from AI agents'
            : 'Charge AI agents for access to paid-members markdown posts';

    // Clear stored enablement when prerequisites drop so re-enabling llms/Stripe
    // does not silently reactivate charges.
    useEffect(() => {
        if (backendSupportsMachinePayments && machinePaymentsEnabled && !canEnableMachinePayments) {
            saveMachinePaymentSettings([{key: 'machine_payments_enabled', value: false}]);
        }
    }, [backendSupportsMachinePayments, machinePaymentsEnabled, canEnableMachinePayments]);

    const openConnectModal = async () => {
        // Allow Stripe despite the limit when it's already connected, so it's
        // possible to disconnect or update the settings.
        if (limiter?.isDisabled('limitStripeConnect') && !stripeEnabled) {
            try {
                await limiter.errorIfWouldGoOverLimit('limitStripeConnect');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    showLimit({
                        prompt: error.message || `Your current plan doesn't support Stripe Connect.`,
                        onOk: () => updateRoute({route: upgradeRoute, isExternal: true})
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

    const saveMachinePaymentSettings = (updates: Setting[]) => {
        machinePaymentSaveQueue.current = machinePaymentSaveQueue.current
            .then(async () => {
                await editSettings(updates);
            })
            .catch((error) => {
                handleError(error);
            });
    };

    let content;
    if (stripeEnabled) {
        content = (
            <Tabs value={selectedTab} variant='underline' onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value='active-tiers'>Active</TabsTrigger>
                    <TabsTrigger value='archived-tiers'>Archived</TabsTrigger>
                </TabsList>
                <TabsContent value='active-tiers'><TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} /></TabsContent>
                <TabsContent value='archived-tiers'><TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} /></TabsContent>
            </Tabs>
        );
    } else {
        content = <TiersList tab='free-tier' tiers={activeTiers.filter(tier => tier.type === 'free')} />;
    }

    const stripeButton = stripeEnabled ?
        <StripeConnectedButton className='hidden tablet:!visible tablet:!inline-flex' onClick={() => void openConnectModal()} />
        :
        <StripeButton className='hidden tablet:!visible tablet:!block' onClick={() => void openConnectModal()}/>;

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
                {stripeEnabled ?
                    <StripeConnectedButton className='w-full' onClick={() => void openConnectModal()} />
                    :
                    <StripeButton onClick={() => void openConnectModal()}/>
                }
            </div>

            {content}
            {isEnd === false && <Button
                type='button'
                variant='link'
                onClick={() => void fetchNextPage()}
            >
                {`Load more (showing ${formatNumber(tiers?.length || 0)}/${formatNumber(meta?.pagination.total || 0)} tiers)`}
            </Button>}

            {hasMachinePaymentsLab && backendSupportsMachinePayments && (
                <SettingGroupContent className='border-t border-border pt-6' columns={1}>
                    <div className='flex items-start justify-between gap-4'>
                        <div className='space-y-1'>
                            <p className='text-sm font-medium text-foreground'>Accept payments from AI agents</p>
                            <p className='text-sm text-muted-foreground'>{machinePaymentsHint}</p>
                        </div>
                        <Switch
                            checked={machinePaymentsEnabled && canEnableMachinePayments}
                            data-testid='machine-payments-toggle'
                            disabled={!canEnableMachinePayments}
                            onCheckedChange={(checked) => {
                                saveMachinePaymentSettings([
                                    {key: 'machine_payments_enabled', value: checked}
                                ]);
                            }}
                        />
                    </div>

                    {machinePaymentsEnabled && canEnableMachinePayments && (
                        <Field className='mt-3 max-w-[220px]' data-invalid={Boolean(machinePaymentsAmountError) || undefined}>
                            <FieldLabel htmlFor='machine-payments-amount'>Price per post</FieldLabel>
                            <FieldDescription>
                                SPT/card charges use this currency. Tempo crypto charges the same minor units as USDC.
                            </FieldDescription>
                            <InputGroup data-invalid={Boolean(machinePaymentsAmountError) || undefined}>
                                <InputGroupInput
                                    aria-invalid={Boolean(machinePaymentsAmountError) || undefined}
                                    id='machine-payments-amount'
                                    inputMode='decimal'
                                    placeholder='1'
                                    value={amountInput.value}
                                    onBlur={() => amountInput.onBlur()}
                                    onChange={event => amountInput.onChange(event.target.value)}
                                    onKeyDown={() => setMachinePaymentsAmountError(undefined)}
                                />
                                <InputGroupAddon align='inline-end' className='pr-1.75'>
                                    <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                                        <PopoverTrigger asChild>
                                            <InputGroupButton aria-expanded={currencyOpen} aria-label='Currency' role='combobox'>
                                                {machinePaymentsCurrency}
                                                <ChevronDown className='size-3.5 opacity-50' />
                                            </InputGroupButton>
                                        </PopoverTrigger>
                                    <PopoverContent align='end' className='z-[9999] w-64 p-0'>
                                        <MultiSelectCombobox
                                            groupBy={option => ({
                                                key: option.metadata?.groupKey as string,
                                                label: option.metadata?.groupLabel as string
                                            })}
                                            i18n={{searchPlaceholder: 'Search currencies...'}}
                                            isMultiSelect={false}
                                            options={currencyOptions}
                                            values={[machinePaymentsCurrency]}
                                            autoCloseOnSelect
                                            onChange={(values) => {
                                                const next = values[0] || 'USD';
                                                setMachinePaymentsAmountError(
                                                    validateCurrencyAmount(machinePaymentsAmount, next, {allowZero: false})
                                                );
                                                saveMachinePaymentSettings([
                                                    {key: 'machine_payments_currency', value: next}
                                                ]);
                                            }}
                                            onClose={() => setCurrencyOpen(false)}
                                        />
                                    </PopoverContent>
                                    </Popover>
                                </InputGroupAddon>
                            </InputGroup>
                            {machinePaymentsAmountError && <FieldError>{machinePaymentsAmountError}</FieldError>}
                        </Field>
                    )}
                </SettingGroupContent>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Tiers, 'Tiers');
