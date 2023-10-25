import Button, {ButtonProps} from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import CurrencyField from '../../../../admin-x-ds/global/form/CurrencyField';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Icon from '../../../../admin-x-ds/global/Icon';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import SortableList from '../../../../admin-x-ds/global/SortableList';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import TierDetailPreview from './TierDetailPreview';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import useSortableIndexedList from '../../../../hooks/useSortableIndexedList';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {Tier, useAddTier, useBrowseTiers, useEditTier} from '../../../../api/tiers';
import {currencies, currencySelectGroups, validateCurrencyAmount} from '../../../../utils/currency';
import {getSettingValues} from '../../../../api/settings';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

export type TierFormState = Partial<Omit<Tier, 'trial_days'>> & {
    trial_days: string;
};

const TierDetailModalContent: React.FC<{tier?: Tier}> = ({tier}) => {
    const isFreeTier = tier?.type === 'free';

    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: updateTier} = useEditTier();
    const {mutateAsync: createTier} = useAddTier();
    const [hasFreeTrial, setHasFreeTrial] = React.useState(!!tier?.trial_days);
    const handleError = useHandleError();
    const {localSettings, siteData} = useSettingGroup();
    const siteTitle = getSettingValues(localSettings, ['title']) as string[];

    const [errors, setErrors] = useState<{ [key in keyof Tier]?: string }>({}); // eslint-disable-line no-unused-vars

    const setError = (field: keyof Tier, error: string | undefined) => {
        setErrors(errs => ({...errs, [field]: error}));
        return error;
    };

    const {formState, saveState, updateForm, handleSave} = useForm<TierFormState>({
        initialState: {
            ...(tier || {}),
            trial_days: tier?.trial_days?.toString() || '',
            currency: tier?.currency || currencies[0].isoCode,
            visibility: tier?.visibility || 'none',
            welcome_page_url: tier?.welcome_page_url || null
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

            modal.remove();
        },
        onSaveError: handleError
    });

    const validators = {
        name: () => setError('name', formState.name ? undefined : 'You must specify a name'),
        monthly_price: () => formState.type !== 'free' && setError('monthly_price', validateCurrencyAmount(formState.monthly_price || 0, formState.currency, {allowZero: false})),
        yearly_price: () => formState.type !== 'free' && setError('yearly_price', validateCurrencyAmount(formState.yearly_price || 0, formState.currency, {allowZero: false}))
    };

    const benefits = useSortableIndexedList({
        items: formState.benefits || [],
        setItems: newBenefits => updateForm(state => ({...state, benefits: newBenefits})),
        blank: '',
        canAddNewItem: item => !!item
    });

    const toggleFreeTrial = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
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
            validators.monthly_price();
            validators.yearly_price();
        }

        didInitialRender.current = true;
    }, [formState.currency]); // eslint-disable-line react-hooks/exhaustive-deps

    const confirmTierStatusChange = () => {
        if (tier) {
            const promptTitle = tier.active ? 'Archive tier' : 'Reactivate tier';
            const prompt = tier.active ? <>
                <div className='mb-6'>Members will no longer be able to subscribe to <strong>{tier.name}</strong> and it will be removed from the list of available tiers in portal.</div>
                <div>Existing members on this tier will remain unchanged.</div>
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
                        message: `Tier ${tier.active ? 'archived' : 'reactivated'} successfully`
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
        dirty={saveState === 'unsaved'}
        leftButtonProps={leftButtonProps}
        okLabel='Save & close'
        size='lg'
        testId='tier-detail-modal'
        title={(tier ? (tier.active ? 'Edit tier' : 'Edit archived tier') : 'New tier')}
        stickyFooter
        onOk={async () => {
            toast.remove();

            if (Object.values(validators).filter(validator => validator()).length) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save tier, please double check that you\'ve filled all mandatory fields.'
                });
                return;
            }

            if (saveState !== 'unsaved') {
                updateRoute('tiers');
                modal.remove();
            }

            if (await handleSave()) {
                updateRoute('tiers');
            }
        }}
    >
        <div className='-mb-8 mt-8 flex items-start gap-8'>
            <div className='flex grow flex-col gap-8'>
                <Form marginBottom={false} title='Basic' grouped>
                    {!isFreeTier && <TextField
                        autoComplete='off'
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        placeholder='Bronze'
                        title='Name'
                        value={formState.name || ''}
                        autoFocus
                        onBlur={() => validators.name()}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    />}
                    <TextField
                        autoComplete='off'
                        autoFocus={isFreeTier}
                        placeholder={isFreeTier ? `Free preview of ${siteTitle}` : 'Full access to premium content'}
                        title='Description'
                        value={formState.description || ''}
                        onChange={e => updateForm(state => ({...state, description: e.target.value}))}
                    />
                    {!isFreeTier &&
                    (<>
                        <div className='flex flex-col gap-10 md:flex-row'>
                            <div className='basis-1/2'>
                                <div className='mb-1 flex h-6 items-center justify-between'>
                                    <Heading level={6}>Prices</Heading>
                                    <div className='-mr-2 w-[50px]'>
                                        <Select
                                            border={false}
                                            containerClassName='font-medium'
                                            controlClasses={{menu: 'w-18'}}
                                            options={currencySelectGroups()}
                                            selectedOption={currencySelectGroups().flatMap(group => group.options).find(option => option.value === formState.currency)}
                                            size='xs'
                                            clearBg
                                            isSearchable
                                            onSelect={option => updateForm(state => ({...state, currency: option?.value}))}
                                        />
                                    </div>
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <CurrencyField
                                        error={Boolean(errors.monthly_price)}
                                        hint={errors.monthly_price}
                                        placeholder='1'
                                        rightPlaceholder={`${formState.currency}/month`}
                                        title='Monthly price'
                                        valueInCents={formState.monthly_price || ''}
                                        hideTitle
                                        onBlur={() => validators.monthly_price()}
                                        onChange={price => updateForm(state => ({...state, monthly_price: price}))}
                                    />
                                    <CurrencyField
                                        error={Boolean(errors.yearly_price)}
                                        hint={errors.yearly_price}
                                        placeholder='10'
                                        rightPlaceholder={`${formState.currency}/year`}
                                        title='Yearly price'
                                        valueInCents={formState.yearly_price || ''}
                                        hideTitle
                                        onBlur={() => validators.yearly_price()}
                                        onChange={price => updateForm(state => ({...state, yearly_price: price}))}
                                    />
                                </div>
                            </div>
                            <div className='basis-1/2'>
                                <div className='mb-1 flex h-6 flex-col justify-center'>
                                    <Toggle checked={hasFreeTrial} label='Add a free trial' labelStyle='heading' onChange={toggleFreeTrial} />
                                </div>
                                <TextField
                                    disabled={!hasFreeTrial}
                                    hint={<div className='mt-1'>
                                    Members will be subscribed at full price once the trial ends. <a className='text-green' href="https://ghost.org/" rel="noreferrer" target="_blank">Learn more</a>
                                    </div>}
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
                    <URLTextField
                        baseUrl={siteData?.url}
                        hint='Redirect to this URL after signup for premium membership'
                        placeholder={siteData?.url}
                        title='Welcome page'
                        value={formState.welcome_page_url || null}
                        nullable
                        transformPathWithoutSlash
                        onChange={value => updateForm(state => ({...state, welcome_page_url: value || null}))}
                    />
                </Form>

                <Form gap='none' title='Benefits' grouped>
                    <div className='-mt-3'>
                        <SortableList
                            items={benefits.items}
                            itemSeparator={false}
                            renderItem={({id, item}) => <div className='relative flex w-full items-center gap-5'>
                                <div className='absolute left-[-32px] top-[7px] flex h-6 w-6 items-center justify-center bg-white group-hover:hidden'><Icon name='check' size='sm' /></div>
                                <TextField
                                    // className='grow border-b border-grey-500 py-2 focus:border-grey-800 group-hover:border-grey-600'
                                    value={item}
                                    onChange={e => benefits.updateItem(id, e.target.value)}
                                />
                                <Button className='absolute right-1 top-1 z-10' icon='trash' iconColorClass='opacity-0 group-hover:opacity-100' size='sm' onClick={() => benefits.removeItem(id)} />
                            </div>}
                            onMove={benefits.moveItem}
                        />
                    </div>
                    <div className="relative mt-1 flex items-center gap-3">
                        <Icon className='dark:text-white' name='check' size='sm' />
                        <TextField
                            className='grow'
                            containerClassName='w-100'
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
                            className='absolute right-1 top-1 z-10'
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
