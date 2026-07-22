import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import TierDetailPreview from './tier-detail-preview';
import useCurrencyInput from '../../../../hooks/use-currency-input';
import useSettingGroup from '../../../../hooks/use-setting-group';
import useSortableIndexedList from '../../../../hooks/use-sortable-indexed-list';
import useUrlInput from '../../../../hooks/use-url-input';
import {Button, type ButtonProps, ConfirmationModal, Form, Icon, Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldError, FieldLabel, Input, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, MultiSelectCombobox, SortableList, Switch} from '@tryghost/shade/components';
import {type ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {Text} from '@tryghost/shade/primitives';
import {type Tier, useAddTier, useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {currencies, currencySelectGroups, validateCurrencyAmount} from '../../../../utils/currency';
import {getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';

export type TierFormState = Partial<Omit<Tier, 'trial_days'>> & {
    trial_days: string;
};

const TierDetailModalContent: React.FC<{tier?: Tier}> = ({tier}) => {
    const isFreeTier = tier?.type === 'free';
    const [currencyOpen, setCurrencyOpen] = React.useState(false);

    const {updateRoute} = useRouting();
    const {mutateAsync: updateTier} = useEditTier();
    const {mutateAsync: createTier} = useAddTier();
    const {mutateAsync: editSettings} = useEditSettings();
    const [hasFreeTrial, setHasFreeTrial] = React.useState(!!tier?.trial_days);
    const handleError = useHandleError();
    const {localSettings, siteData} = useSettingGroup();
    const [portalPlansJson] = getSettingValues(localSettings, ['portal_plans']) as string[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];
    const currencyOptions = currencySelectGroups().flatMap(group => group.options.map(option => ({...option, metadata: {groupKey: group.key, groupLabel: group.label}})));

    const validators: {[key in keyof Tier]?: () => string | undefined} = {
        name: () => (formState.name ? undefined : 'Enter a name for the tier'),
        monthly_price: () => (formState.type !== 'free' ? validateCurrencyAmount(formState.monthly_price || 0, formState.currency, {allowZero: false}) : undefined),
        yearly_price: () => (formState.type !== 'free' ? validateCurrencyAmount(formState.yearly_price || 0, formState.currency, {allowZero: false}) : undefined)
    };

    const {formState, saveState, updateForm, handleSave, errors, clearError, okProps} = useForm<TierFormState>({
        initialState: {
            ...(tier || {}),
            trial_days: tier?.trial_days?.toString() || '',
            currency: tier?.currency || currencies[0].isoCode,
            visibility: tier?.visibility || 'none',
            welcome_page_url: tier?.welcome_page_url || null
        },
        savingDelay: 500,
        savedDelay: 500,
        onValidate: () => {
            const newErrors: ErrorMessages = {};

            Object.entries(validators).forEach(([key, validator]) => {
                newErrors[key as keyof Tier] = validator?.();
            });

            return newErrors;
        },
        onSave: async () => {
            const {trial_days: trialDays, currency, ...rest} = formState;
            const values: Partial<Tier> = rest;

            values.benefits = values.benefits?.filter(benefit => benefit);

            if (!isFreeTier) {
                values.currency = currency;
                values.trial_days = parseInt(trialDays);
            }

            if (tier?.id) {
                await updateTier({...tier, ...values});
            } else {
                await createTier(values);
            }
            if (isFreeTier) {
                // If we changed the visibility, we also need to update Portal settings in some situations
                // Like the free tier is a special case, and should also be present/absent in portal_plans
                const visible = formState.visibility === 'public';
                let save = false;

                if (portalPlans.includes('free') && !visible) {
                    portalPlans.splice(portalPlans.indexOf('free'), 1);
                    save = true;
                }

                if (!portalPlans.includes('free') && visible) {
                    portalPlans.push('free');
                    save = true;
                }

                if (save) {
                    await editSettings([
                        {
                            key: 'portal_plans',
                            value: JSON.stringify(portalPlans)
                        }
                    ]);
                }
            }
        },
        onSaveError: handleError
    });

    const monthlyPriceInput = useCurrencyInput(formState.monthly_price || '', price => updateForm(state => ({...state, monthly_price: price})));
    const yearlyPriceInput = useCurrencyInput(formState.yearly_price || '', price => updateForm(state => ({...state, yearly_price: price})));
    const welcomePageUrlInput = useUrlInput({
        baseUrl: siteData?.url,
        nullable: true,
        transformPathWithoutSlash: true,
        value: formState.welcome_page_url || null,
        onChange: value => updateForm(state => ({...state, welcome_page_url: value || null}))
    });

    const benefits = useSortableIndexedList({
        items: formState.benefits || [],
        setItems: newBenefits => updateForm(state => ({...state, benefits: newBenefits})),
        blank: '',
        canAddNewItem: item => !!item
    });

    const toggleFreeTrial = (checked: boolean) => {
        if (checked) {
            setHasFreeTrial(true);
            updateForm(state => ({...state, trial_days: tier?.trial_days ? tier?.trial_days.toString() : '7'}));
        } else {
            setHasFreeTrial(false);
            updateForm(state => ({...state, trial_days: '0'}));
        }
    };

    // Only validate amounts when the user changes currency, don't show errors on initial render
    const didInitialRender = useRef(false);
    useEffect(() => {
        if (didInitialRender.current) {
            validators.monthly_price?.();
            validators.yearly_price?.();
        }

        didInitialRender.current = true;
    }, [formState.currency]);  

    const confirmTierStatusChange = () => {
        if (tier) {
            const promptTitle = tier.active ? 'Archive tier' : 'Reactivate tier';
            const prompt = tier.active ? <>
                <div className='mb-6'>Members will no longer be able to subscribe to <strong>{tier.name}</strong> and it will be removed from the list of available tiers in portal.</div>
                <div>Existing members on this tier will remain unchanged. Offers using this tier will be disabled.</div>
            </> : <>
                <div className='mb-6'>Reactivating <strong>{tier.name}</strong> will re-enable it as an option in portal and allow new members to subscribe to this tier.</div>
                <div>Existing members will remain unchanged.</div>
            </>;
            const okLabel = tier.active ? 'Archive' : 'Reactivate';
            NiceModal.show(ConfirmationModal, {
                title: promptTitle,
                prompt: prompt,
                okLabel: okLabel,
                cancelLabel: 'Cancel',
                okColor: tier.active ? 'red' : 'black',
                onOk: (confirmModal) => {
                    updateTier({...tier, active: !tier.active});
                    confirmModal?.remove();
                    showToast({
                        type: 'success',
                        title: `Tier ${tier.active ? 'archived' : 'reactivated'}`
                    });
                }
            });
        }
    };

    let leftButtonProps: ButtonProps = {};
    if (tier) {
        if (tier.active && tier.type !== 'free') {
            leftButtonProps = {
                label: 'Archive tier',
                color: 'red',
                link: true,
                onClick: confirmTierStatusChange
            };
        } else if (!tier.active) {
            leftButtonProps = {
                label: 'Reactivate tier',
                color: 'green',
                link: true,
                onClick: confirmTierStatusChange
            };
        }
    }

    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        dirty={saveState === 'unsaved'}
        leftButtonProps={leftButtonProps}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        size='lg'
        testId='tier-detail-modal'
        title={(tier ? (tier.active ? 'Edit tier' : 'Edit archived tier') : 'New tier')}
        stickyFooter
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
        }}
    >
        <div className='mt-8 -mb-8 flex items-start gap-8'>
            <div className='flex grow flex-col gap-8'>
                <Form marginBottom={false} title='Basic' grouped>
                    <TextField
                        autoComplete='off'
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        maxLength={191}
                        placeholder={isFreeTier ? 'Free' : 'Bronze'}
                        title='Name'
                        value={formState.name || ''}
                        autoFocus
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextField
                        autoComplete='off'
                        autoFocus={isFreeTier}
                        maxLength={191}
                        placeholder={isFreeTier ? `Free preview` : 'Full access to premium content'}
                        title='Description'
                        value={formState.description || ''}
                        onChange={e => updateForm(state => ({...state, description: e.target.value}))}
                    />
                    {!isFreeTier &&
                    (<>
                        <div className='flex flex-col gap-10 md:flex-row'>
                            <div className='basis-1/2'>
                                <div className='mb-1 flex h-6 items-center justify-between'>
                                    <Text as='h6' className='text-base' tone='secondary' weight='semibold'>Prices</Text>
                                    <div className='-mr-2 w-20'>
                                        <Field>
                                            <FieldLabel className='sr-only'>Currency</FieldLabel>
                                            <Combobox open={currencyOpen} onOpenChange={setCurrencyOpen}>
                                                <ComboboxTrigger aria-label='Currency' className='border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus-visible:ring-0'><ComboboxValue>{formState.currency}</ComboboxValue></ComboboxTrigger>
                                                <ComboboxContent align='end' className='w-64'>
                                                    <MultiSelectCombobox
                                                        groupBy={option => ({
                                                            key: option.metadata?.groupKey as string,
                                                            label: option.metadata?.groupLabel as string
                                                        })}
                                                        i18n={{searchPlaceholder: 'Search currencies...'}}
                                                        isMultiSelect={false}
                                                        options={currencyOptions}
                                                        values={formState.currency ? [formState.currency] : []}
                                                        autoCloseOnSelect
                                                        onChange={(values) => {
                                                            if (values[0]) {
                                                                updateForm(state => ({...state, currency: values[0]}));
                                                            }
                                                        }}
                                                        onClose={() => setCurrencyOpen(false)}
                                                    />
                                                </ComboboxContent>
                                            </Combobox>
                                        </Field>
                                    </div>
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <Field data-invalid={Boolean(errors.monthly_price) || undefined}>
                                        <FieldLabel className='sr-only' htmlFor='tier-monthly-price'>Monthly price</FieldLabel>
                                        <InputGroup className='border-transparent bg-muted' data-invalid={Boolean(errors.monthly_price) || undefined}>
                                            <InputGroupInput
                                                aria-invalid={Boolean(errors.monthly_price) || undefined}
                                                id='tier-monthly-price'
                                                inputMode='decimal'
                                                placeholder='5'
                                                value={monthlyPriceInput.value}
                                                onBlur={(event) => {
                                                    monthlyPriceInput.onBlur();
                                                    if (event.target.value === '') {
                                                        updateForm(state => ({...state, monthly_price: 0}));
                                                    }
                                                }}
                                                onChange={event => monthlyPriceInput.onChange(event.target.value)}
                                                onKeyDown={() => clearError('monthly_price')}
                                            />
                                            <InputGroupAddon align='inline-end'><InputGroupText>{formState.currency}/month</InputGroupText></InputGroupAddon>
                                        </InputGroup>
                                        {errors.monthly_price && <FieldError>{errors.monthly_price}</FieldError>}
                                    </Field>
                                    <Field data-invalid={Boolean(errors.yearly_price) || undefined}>
                                        <FieldLabel className='sr-only' htmlFor='tier-yearly-price'>Yearly price</FieldLabel>
                                        <InputGroup className='border-transparent bg-muted' data-invalid={Boolean(errors.yearly_price) || undefined}>
                                            <InputGroupInput
                                                aria-invalid={Boolean(errors.yearly_price) || undefined}
                                                id='tier-yearly-price'
                                                inputMode='decimal'
                                                placeholder='50'
                                                value={yearlyPriceInput.value}
                                                onBlur={(event) => {
                                                    yearlyPriceInput.onBlur();
                                                    if (event.target.value === '') {
                                                        updateForm(state => ({...state, yearly_price: 0}));
                                                    }
                                                }}
                                                onChange={event => yearlyPriceInput.onChange(event.target.value)}
                                                onKeyDown={() => clearError('yearly_price')}
                                            />
                                            <InputGroupAddon align='inline-end'><InputGroupText>{formState.currency}/year</InputGroupText></InputGroupAddon>
                                        </InputGroup>
                                        {errors.yearly_price && <FieldError>{errors.yearly_price}</FieldError>}
                                    </Field>
                                </div>
                            </div>
                            <div className='basis-1/2'>
                                <div className='mb-1 flex h-6 flex-col justify-center'>
                                    <Field orientation='horizontal'>
                                        <FieldLabel htmlFor='tier-free-trial'>Add a free trial</FieldLabel>
                                        <Switch checked={hasFreeTrial} id='tier-free-trial' onCheckedChange={toggleFreeTrial} />
                                    </Field>
                                </div>
                                <TextField
                                    disabled={!hasFreeTrial}
                                    hint={<span className='mt-1'>
                                    Members will be subscribed at full price once the trial ends. <a className='text-green' href="https://ghost.org/help/free-trials/" rel="noreferrer" target="_blank">Learn more</a>
                                    </span>}
                                    placeholder='0'
                                    rightPlaceholder='days'
                                    title='Trial days'
                                    value={formState.trial_days}
                                    hideTitle
                                    onChange={e => updateForm(state => ({...state, trial_days: e.target.value.replace(/[^\d]/, '')}))}
                                />
                            </div>
                        </div>
                    </>)}
                    <Field>
                        <FieldLabel htmlFor='tier-welcome-page'>Welcome page</FieldLabel>
                        <Input
                            className='border-transparent bg-muted'
                            id='tier-welcome-page'
                            maxLength={2000}
                            placeholder={siteData?.url}
                            value={welcomePageUrlInput.displayValue}
                            onBlur={welcomePageUrlInput.commitValue}
                            onChange={event => welcomePageUrlInput.setDisplayValue(event.target.value)}
                            onFocus={welcomePageUrlInput.handleFocus}
                            onKeyDown={welcomePageUrlInput.handleKeyDown}
                        />
                        <FieldDescription>Redirect to this URL after signup{isFreeTier ? '' : ' for premium membership'}</FieldDescription>
                    </Field>
                </Form>

                <Form gap='none' title='Benefits' grouped>
                    <div className='-mt-3'>
                        <SortableList
                            getDragHandleLabel={({item}) => `Reorder benefit${item ? `: ${item}` : ''}`}
                            items={benefits.items}
                            itemSeparator={false}
                            renderItem={({id, item}) => <div className='relative flex w-full items-center gap-5'>
                                <div className='absolute top-[7px] left-[-32px] flex size-6 items-center justify-center bg-white group-hover:hidden dark:bg-black'><Icon name='check' size='sm' /></div>
                                <TextField
                                    // className='grow border-b border-grey-500 py-2 focus:border-grey-800 group-hover:border-grey-600'
                                    maxLength={191}
                                    value={item}
                                    onChange={e => benefits.updateItem(id, e.target.value)}
                                />
                                <Button className='absolute top-1/2 right-1 z-10 size-5! -translate-y-1/2 p-0! opacity-0 group-hover:opacity-100' color='grey' icon='trash' size='sm' onClick={() => benefits.removeItem(id)} />
                            </div>}
                            onMove={benefits.moveItem}
                        />
                    </div>
                    <div className="relative mt-1 flex items-center gap-3">
                        <Icon className='dark:text-white' name='check' size='sm' />
                        <TextField
                            className='grow'
                            containerClassName='w-100'
                            maxLength={191}
                            placeholder='Expert analysis'
                            title='New benefit'
                            value={benefits.newItem}
                            hideTitle
                            onChange={e => benefits.setNewItem(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    benefits.addItem();
                                }
                            }}
                        />
                        <Button
                            className='absolute top-1/2 right-1 z-10 size-[22px]! -translate-y-1/2 p-0!'
                            color='green'
                            icon='add'
                            iconColorClass='text-white'
                            label='Add'
                            size='sm'
                            hideLabel
                            onClick={() => benefits.addItem()}
                        />
                    </div>
                </Form>
            </div>
            <div className='sticky top-[96px] hidden shrink-0 basis-[380px] min-[920px]:!visible min-[920px]:!block'>
                <TierDetailPreview isFreeTier={isFreeTier} tier={formState} />
            </div>
        </div>
    </Modal>;
};

const TierDetailModal: React.FC<RoutingModalProps> = ({params}) => {
    const {data: {tiers, isEnd} = {}, fetchNextPage} = useBrowseTiers();

    let tier: Tier | undefined;

    useEffect(() => {
        if (params?.id && !tier && !isEnd) {
            fetchNextPage();
        }
    }, [fetchNextPage, isEnd, params?.id, tier]);

    if (params?.id) {
        tier = tiers?.find(({id}) => id === params?.id);

        if (!tier) {
            return null;
        }
    }

    return <TierDetailModalContent tier={tier} />;
};

export default NiceModal.create(TierDetailModal);
