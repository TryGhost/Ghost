import PortalFrame from '../../membership/portal/portal-frame';
import toast from 'react-hot-toast';
import {ButtonSelect, type OfferType} from './add-offer-modal';
import {type ErrorMessages, useForm} from '@tryghost/admin-x-framework/hooks';
import {Form, PreviewModalContent, Select, type SelectOption, TextArea, TextField, Toggle, showToast} from '@tryghost/admin-x-design-system';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {type Offer, useAddOffer, useBrowseOffers, useEditOffer, useInvalidateOffers} from '@tryghost/admin-x-framework/api/offers';
import {createOfferRedemptionsFilterUrl, formatOfferTimestamp} from './offer-helpers';
import {getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes} from '../../../../utils/get-offers-portal-preview-url';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useEffect, useMemo, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RetentionOfferFormState = {
    enabled: boolean;
    displayTitle: string;
    displayDescription: string;
    type: 'percent' | 'free_months';
    percentAmount: number;
    duration: string;
    durationInMonths: number;
    freeMonths: number;
};

const typeOptions: OfferType[] = [
    {title: 'Percentage discount', description: 'Offer a special reduced price'},
    {title: 'Free month(s)', description: 'Give free access for a limited time'}
];

const durationOptions: SelectOption[] = [
    {value: 'once', label: 'First-payment'},
    {value: 'repeating', label: 'Multiple-months'},
    {value: 'forever', label: 'Forever'}
];

const MAX_PERCENT_AMOUNT = 100;

type RetentionOfferTerms = {
    type: 'percent' | 'free_months';
    amount: number;
    duration: string;
    durationInMonths: number;
};

const getResolvedAmount = ({
    type,
    percentAmount,
    freeMonths,
    lastPercentAmount,
    lastFreeMonths
}: {
    type: 'percent' | 'free_months';
    percentAmount: number;
    freeMonths: number;
    lastPercentAmount: number;
    lastFreeMonths: number;
}) => {
    if (type === 'free_months') {
        return freeMonths > 0 ? freeMonths : lastFreeMonths;
    }

    return percentAmount > 0 ? percentAmount : lastPercentAmount;
};

const getDefaultState = (): RetentionOfferFormState => {
    return {
        enabled: false,
        displayTitle: '',
        displayDescription: '',
        type: 'free_months',
        percentAmount: 20,
        duration: 'once',
        durationInMonths: 1,
        freeMonths: 1
    };
};

const getRetentionOfferFormState = (offer: Offer | null): RetentionOfferFormState => {
    const defaultState = getDefaultState();

    if (!offer) {
        return defaultState;
    }

    const isPercentOffer = offer.type === 'percent';
    const isFreeMonthsOffer = offer.type === 'free_months';
    const repeatingDurationInMonths = offer.duration === 'repeating' && offer.duration_in_months ? offer.duration_in_months : defaultState.durationInMonths;

    return {
        enabled: offer.status === 'active',
        displayTitle: offer.display_title || '',
        displayDescription: offer.display_description || '',
        type: isFreeMonthsOffer ? 'free_months' : 'percent',
        percentAmount: isPercentOffer ? offer.amount : defaultState.percentAmount,
        duration: isPercentOffer ? offer.duration : defaultState.duration,
        durationInMonths: repeatingDurationInMonths,
        freeMonths: isFreeMonthsOffer ? offer.amount : defaultState.freeMonths
    };
};

const getFormOfferTerms = ({
    formState,
    lastPercentAmount,
    lastFreeMonths
}: {
    formState: RetentionOfferFormState;
    lastPercentAmount: number;
    lastFreeMonths: number;
}): RetentionOfferTerms => {
    const amount = getResolvedAmount({
        type: formState.type,
        percentAmount: formState.percentAmount,
        freeMonths: formState.freeMonths,
        lastPercentAmount,
        lastFreeMonths
    });

    if (formState.type === 'free_months') {
        return {
            type: 'free_months',
            amount,
            duration: 'free_months',
            durationInMonths: 0
        };
    }

    const duration = formState.duration;
    const durationInMonths = duration === 'repeating' ? Math.max(1, formState.durationInMonths) : 0;

    return {
        type: 'percent',
        amount,
        duration,
        durationInMonths
    };
};

const getOfferTerms = (offer: Offer | null): RetentionOfferTerms | null => {
    if (!offer) {
        return null;
    }

    const type = offer.type === 'free_months' ? 'free_months' : 'percent';
    const duration = type === 'free_months' ? 'free_months' : offer.duration;
    const durationInMonths = duration === 'repeating' ? offer.duration_in_months || 0 : 0;

    return {
        type,
        amount: offer.amount,
        duration,
        durationInMonths
    };
};

const getTermsSignature = (terms: RetentionOfferTerms | null): string => {
    if (!terms) {
        return '';
    }

    return `${terms.type}:${terms.amount}:${terms.duration}:${terms.durationInMonths}`;
};

const hasFormChangesFromDefault = (formState: RetentionOfferFormState, defaultState: RetentionOfferFormState): boolean => {
    return formState.displayTitle !== defaultState.displayTitle ||
        formState.displayDescription !== defaultState.displayDescription ||
        formState.type !== defaultState.type ||
        formState.percentAmount !== defaultState.percentAmount ||
        formState.duration !== defaultState.duration ||
        formState.durationInMonths !== defaultState.durationInMonths ||
        formState.freeMonths !== defaultState.freeMonths;
};

const RetentionOfferSidebar: React.FC<{
    formState: RetentionOfferFormState;
    updateForm: (updater: (state: RetentionOfferFormState) => RetentionOfferFormState) => void;
    clearError: (field: string) => void;
    errors: ErrorMessages;
    cadence: 'monthly' | 'yearly';
    lastRedeemed?: string | null;
    membersFilterUrl?: string | null;
    redemptions: number;
}> = ({formState, updateForm, clearError, errors, cadence, lastRedeemed, membersFilterUrl, redemptions}) => {
    const availableDurationOptions = cadence === 'yearly'
        ? durationOptions.filter(option => option.value !== 'repeating')
        : durationOptions;

    return (
        <div className='flex grow flex-col pt-2'>
            <Form className='grow'>
                <section>
                    <div className='flex flex-col gap-5 rounded-md border border-grey-300 p-4 pb-3.5 dark:border-grey-800'>
                        <div className='flex flex-col gap-1.5'>
                            <div className='flex items-end justify-between'>
                                <div className='flex flex-col gap-5'>
                                    <div className='flex flex-col gap-1.5'>
                                        <span className='text-xs font-semibold leading-none text-grey-700'>Performance</span>
                                        <span>{redemptions} {redemptions === 1 ? 'redemption' : 'redemptions'}</span>
                                    </div>
                                    {redemptions > 0 && lastRedeemed ?
                                        <div className='flex flex-col gap-1.5'>
                                            <span className='text-xs font-semibold leading-none text-grey-700'>Last redemption</span>
                                            <span>{formatOfferTimestamp(lastRedeemed)}</span>
                                        </div> :
                                        null
                                    }
                                </div>
                                {redemptions > 0 && membersFilterUrl ? <a className='font-semibold text-green' href={membersFilterUrl}>See members →</a> : null}
                            </div>
                        </div>
                    </div>
                </section>
                <section className='mt-4'>
                    <Toggle
                        key={`retention-toggle-${cadence}-${formState.enabled ? 'enabled' : 'disabled'}`}
                        checked={formState.enabled}
                        direction='rtl'
                        hint={cadence === 'monthly' ? 'Applied to monthly plans' : 'Applied to annual plans'}
                        label={`Enable ${cadence} retention`}
                        onChange={(e) => {
                            updateForm(state => ({...state, enabled: e.target.checked}));
                        }}
                    />
                </section>
                {formState.enabled && (
                    <>
                        <section className='mt-4'>
                            <h2 className='mb-4 text-lg'>General</h2>
                            <div className='flex flex-col gap-6'>
                                <TextField
                                    error={Boolean(errors.displayTitle)}
                                    hint={errors.displayTitle}
                                    placeholder='Before you go'
                                    title='Display title'
                                    value={formState.displayTitle}
                                    onChange={(e) => {
                                        updateForm(state => ({...state, displayTitle: e.target.value}));
                                    }}
                                    onKeyDown={() => clearError('displayTitle')}
                                />
                                <TextArea
                                    placeholder='We&#39;d hate to see you leave. How about a special offer to stay?'
                                    title='Display description'
                                    value={formState.displayDescription}
                                    onChange={(e) => {
                                        updateForm(state => ({...state, displayDescription: e.target.value}));
                                    }}
                                />
                            </div>
                        </section>
                        <section className='mt-4'>
                            <h2 className='mb-4 text-lg'>Details</h2>
                            <div className='flex flex-col gap-6'>
                                <div className='flex flex-col gap-4 rounded-md border border-grey-200 p-4 dark:border-grey-800'>
                                    <ButtonSelect
                                        checked={formState.type === 'percent'}
                                        type={typeOptions[0]}
                                        onClick={() => {
                                            clearError('amount');
                                            clearError('durationInMonths');
                                            updateForm((state) => {
                                                return {...state, type: 'percent', percentAmount: state.percentAmount};
                                            });
                                        }}
                                    />
                                    <ButtonSelect
                                        checked={formState.type === 'free_months'}
                                        type={typeOptions[1]}
                                        onClick={() => {
                                            clearError('amount');
                                            clearError('durationInMonths');
                                            updateForm(state => ({...state, type: 'free_months'}));
                                        }}
                                    />
                                </div>
                                {formState.type === 'percent' && (
                                    <>
                                        <TextField
                                            error={Boolean(errors.amount)}
                                            hint={errors.amount}
                                            rightPlaceholder='%'
                                            title='Amount off'
                                            type='number'
                                            value={formState.percentAmount === 0 ? '' : String(formState.percentAmount)}
                                            onChange={(e) => {
                                                const nextValue = Number(e.target.value);
                                                const safeValue = Number.isNaN(nextValue) ? 0 : nextValue;
                                                updateForm(state => ({...state, percentAmount: safeValue}));
                                            }}
                                            onKeyDown={() => clearError('amount')}
                                        />
                                        <Select
                                            options={availableDurationOptions}
                                            selectedOption={availableDurationOptions.find(option => option.value === formState.duration)}
                                            title='Duration'
                                            onSelect={(e) => {
                                                if (e) {
                                                    clearError('durationInMonths');
                                                    updateForm(state => ({...state, duration: e.value}));
                                                }
                                            }}
                                        />
                                        {formState.duration === 'repeating' && (
                                            <TextField
                                                error={Boolean(errors.durationInMonths)}
                                                hint={errors.durationInMonths}
                                                rightPlaceholder={`${formState.durationInMonths === 1 ? 'month' : 'months'}`}
                                                title='Duration in months'
                                                type='number'
                                                value={formState.durationInMonths === 0 ? '' : String(formState.durationInMonths)}
                                                onChange={(e) => {
                                                    const nextValue = Number(e.target.value);
                                                    updateForm(state => ({...state, durationInMonths: Number.isNaN(nextValue) ? 0 : nextValue}));
                                                }}
                                                onKeyDown={() => clearError('durationInMonths')}
                                            />
                                        )}
                                    </>
                                )}
                                {formState.type === 'free_months' && (
                                    <TextField
                                        error={Boolean(errors.amount)}
                                        hint={errors.amount}
                                        rightPlaceholder={`${formState.freeMonths === 1 ? 'month' : 'months'}`}
                                        title='Free months'
                                        type='number'
                                        value={formState.freeMonths === 0 ? '' : String(formState.freeMonths)}
                                        onChange={(e) => {
                                            const nextValue = Number(e.target.value);
                                            updateForm(state => ({...state, freeMonths: Number.isNaN(nextValue) ? 0 : nextValue}));
                                        }}
                                        onKeyDown={() => clearError('amount')}
                                    />
                                )}
                            </div>
                        </section>
                    </>
                )}
            </Form>
        </div>
    );
};

const EditRetentionOfferModal: React.FC<{id: string}> = ({id}) => {
    const {updateRoute} = useRouting();
    const {siteData} = useGlobalData();
    const {data: {tiers = []} = {}} = useBrowseTiers();
    const {data: {offers: allOffers = []} = {}, isFetched: hasFetchedOffers, isFetching: isFetchingOffers} = useBrowseOffers();
    const {mutateAsync: addOffer} = useAddOffer();
    const {mutateAsync: editOffer} = useEditOffer();
    const invalidateOffers = useInvalidateOffers();
    const [href, setHref] = useState<string>('');
    const cadence = id === 'monthly' ? 'monthly' : 'yearly' as const;
    const breadcrumbTitle = cadence === 'monthly' ? 'Monthly retention' : 'Yearly retention';
    const offerCadence = cadence === 'monthly' ? 'month' : 'year';
    const activePaidTiers = getPaidActiveTiers(tiers || []);
    const retentionOffersByCadence = useMemo(() => {
        return allOffers
            .filter((offer) => {
                return offer.redemption_type === 'retention' && offer.cadence === offerCadence;
            })
            .sort((left, right) => {
                const leftTimestamp = left.created_at ? new Date(left.created_at).getTime() : 0;
                const rightTimestamp = right.created_at ? new Date(right.created_at).getTime() : 0;
                return rightTimestamp - leftTimestamp;
            });
    }, [allOffers, offerCadence]);
    const activeRetentionOffer = useMemo(() => {
        return retentionOffersByCadence.find(offer => offer.status === 'active') || null;
    }, [retentionOffersByCadence]);
    const latestRetentionOffer = retentionOffersByCadence[0] || null;
    const editableRetentionOffer = activeRetentionOffer || latestRetentionOffer;
    const retentionRedemptions = useMemo(() => {
        return retentionOffersByCadence.reduce((total, offer) => {
            return total + (offer.redemption_count || 0);
        }, 0);
    }, [retentionOffersByCadence]);
    const retentionOfferIdsByCadence = useMemo(() => {
        return retentionOffersByCadence.map(offer => offer.id);
    }, [retentionOffersByCadence]);
    const latestRetentionRedemption = useMemo(() => {
        return retentionOffersByCadence
            .map(offer => offer.last_redeemed)
            .filter((lastRedeemed): lastRedeemed is string => !!lastRedeemed)
            .sort((left, right) => {
                return new Date(right).getTime() - new Date(left).getTime();
            })[0] || null;
    }, [retentionOffersByCadence]);
    const retentionMembersFilterUrl = useMemo(() => {
        if (retentionRedemptions === 0 || retentionOfferIdsByCadence.length === 0) {
            return null;
        }

        return createOfferRedemptionsFilterUrl(retentionOfferIdsByCadence);
    }, [retentionOfferIdsByCadence, retentionRedemptions]);
    const [lastPreviewPercentAmount, setLastPreviewPercentAmount] = useState(20);
    const [lastPreviewFreeMonths, setLastPreviewFreeMonths] = useState(1);
    const [initializedOfferKey, setInitializedOfferKey] = useState<string | null>(null);
    const handleSaveError = (error: unknown) => {
        let message = 'Please try again later';

        if (error instanceof JSONError && error.data && error.data.errors[0]) {
            message = error.data.errors[0].context || error.data.errors[0].message || message;
        }

        toast.remove();
        showToast({
            title: 'Failed to save offer',
            type: 'error',
            message
        });
    };

    const {formState, setFormState, updateForm, handleSave, saveState, okProps, errors, clearError} = useForm({
        initialState: getDefaultState(),
        savingDelay: 500,
        onSave: async () => {
            let didMutate = false;
            const formTerms = getFormOfferTerms({
                formState,
                lastPercentAmount: lastPreviewPercentAmount,
                lastFreeMonths: lastPreviewFreeMonths
            });
            const existingTerms = getOfferTerms(editableRetentionOffer);
            const termsChanged = getTermsSignature(existingTerms) !== getTermsSignature(formTerms);
            const nextStatus = formState.enabled ? 'active' : 'archived';
            const displayTitle = formState.displayTitle || '';
            const displayDescription = formState.displayDescription || '';
            const hasDisplayChanges = editableRetentionOffer
                ? displayTitle !== (editableRetentionOffer.display_title || '') ||
                    displayDescription !== (editableRetentionOffer.display_description || '')
                : displayTitle !== '' || displayDescription !== '';
            const defaultState = getDefaultState();
            const shouldCreateInactiveDraft = !formState.enabled && !editableRetentionOffer && hasFormChangesFromDefault(formState, defaultState);

            const createRetentionOffer = async (status: 'active' | 'archived') => {
                const hash = crypto.getRandomValues(new Uint16Array(1))[0].toString(16).padStart(4, '0');

                let offerDesc: string;
                if (formTerms.type === 'free_months') {
                    const monthText = formTerms.amount === 1 ? 'free month' : 'free months';
                    offerDesc = `${formTerms.amount} ${monthText}`;
                } else {
                    let durationText: string;
                    if (formTerms.duration === 'once') {
                        durationText = 'next payment';
                    } else if (formTerms.duration === 'repeating') {
                        durationText = `for ${formTerms.durationInMonths} ${formTerms.durationInMonths === 1 ? 'month' : 'months'}`;
                    } else {
                        durationText = 'forever';
                    }
                    offerDesc = `${formTerms.amount}% off ${durationText}`;
                }

                await addOffer({
                    name: `Retention ${offerDesc} (${hash})`,
                    code: hash,
                    display_title: displayTitle,
                    display_description: displayDescription,
                    cadence: offerCadence,
                    amount: formTerms.amount,
                    duration: formTerms.duration,
                    duration_in_months: formTerms.durationInMonths,
                    currency: null,
                    status,
                    redemption_type: 'retention',
                    tier: null,
                    type: formTerms.type,
                    currency_restriction: false
                });
                didMutate = true;
            };

            const invalidateOffersIfNeeded = async () => {
                if (didMutate) {
                    await invalidateOffers();
                }
            };

            if (!editableRetentionOffer && !formState.enabled && !shouldCreateInactiveDraft) {
                return;
            }

            if (termsChanged) {
                if (!formState.enabled && activeRetentionOffer) {
                    await editOffer({...activeRetentionOffer, status: 'archived'});
                    didMutate = true;
                }

                await createRetentionOffer(nextStatus);
                await invalidateOffersIfNeeded();
                return;
            }

            if (editableRetentionOffer) {
                const hasStatusChange = editableRetentionOffer.status !== nextStatus;
                if (hasDisplayChanges || hasStatusChange) {
                    await editOffer({
                        ...editableRetentionOffer,
                        display_title: displayTitle,
                        display_description: displayDescription,
                        status: nextStatus
                    });
                    didMutate = true;
                }
                await invalidateOffersIfNeeded();
                return;
            }

            if (formState.enabled || shouldCreateInactiveDraft) {
                await createRetentionOffer(nextStatus);
            }

            await invalidateOffersIfNeeded();
        },
        onSaveError: handleSaveError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.enabled) {
                return newErrors;
            }

            if (formState.type === 'percent') {
                if (formState.percentAmount < 1 || formState.percentAmount > MAX_PERCENT_AMOUNT) {
                    newErrors.amount = `Enter an amount between 1 and ${MAX_PERCENT_AMOUNT}%.`;
                }

                if (formState.duration === 'repeating' && formState.durationInMonths < 1) {
                    newErrors.durationInMonths = 'Enter a duration greater than 0.';
                }
            }

            if (formState.type === 'free_months') {
                if (formState.freeMonths < 1) {
                    newErrors.amount = 'Enter a number of free months greater than 0.';
                }
            }

            return newErrors;
        }
    });

    const activeRetentionOfferId = editableRetentionOffer?.id || 'none';
    const currentOfferKey = `${id}:${activeRetentionOfferId}`;

    useEffect(() => {
        if (!hasFetchedOffers || isFetchingOffers || saveState === 'unsaved' || initializedOfferKey === currentOfferKey) {
            return;
        }

        setFormState(() => getRetentionOfferFormState(editableRetentionOffer));
        setInitializedOfferKey(currentOfferKey);
    }, [currentOfferKey, editableRetentionOffer, hasFetchedOffers, initializedOfferKey, isFetchingOffers, saveState, setFormState]);

    useEffect(() => {
        if (formState.percentAmount > 0) {
            setLastPreviewPercentAmount(formState.percentAmount);
        }
    }, [formState.percentAmount]);

    useEffect(() => {
        if (formState.freeMonths > 0) {
            setLastPreviewFreeMonths(formState.freeMonths);
        }
    }, [formState.freeMonths]);

    const goBack = () => {
        updateRoute('offers/edit/retention');
    };

    const sidebar = (
        <RetentionOfferSidebar
            cadence={cadence}
            clearError={clearError}
            errors={errors}
            formState={formState}
            lastRedeemed={latestRetentionRedemption}
            membersFilterUrl={retentionMembersFilterUrl}
            redemptions={retentionRedemptions}
            updateForm={updateForm}
        />
    );

    const handleSaveClick = async () => {
        try {
            if (await handleSave({force: true})) {
                goBack();
            }
        } catch {
            // Error toast is handled in onSaveError
        }
    };

    const previewData: offerPortalPreviewUrlTypes = useMemo(() => {
        const isFreeMonthsOffer = formState.type === 'free_months';
        const previewAmount = getResolvedAmount({
            type: formState.type,
            percentAmount: formState.percentAmount,
            freeMonths: formState.freeMonths,
            lastPercentAmount: lastPreviewPercentAmount,
            lastFreeMonths: lastPreviewFreeMonths
        });
        const previewTier = activePaidTiers.find((tier) => {
            if (offerCadence === 'month') {
                return tier.monthly_price;
            }

            return tier.yearly_price;
        });

        return {
            enabled: formState.enabled,
            name: `${cadence} retention`,
            code: `${cadence}-retention`,
            displayTitle: formState.displayTitle || '',
            displayDescription: formState.displayDescription || '',
            type: isFreeMonthsOffer ? 'free_months' : 'percent',
            cadence: offerCadence,
            amount: previewAmount,
            duration: isFreeMonthsOffer ? 'free_months' : formState.duration,
            durationInMonths: formState.durationInMonths,
            currency: '',
            status: 'active',
            tierId: previewTier?.id || '',
            redemptionType: 'retention'
        };
    }, [activePaidTiers, cadence, formState, lastPreviewFreeMonths, lastPreviewPercentAmount, offerCadence]);

    useEffect(() => {
        if (!siteData.url) {
            setHref('');
            return;
        }

        const newHref = getOfferPortalPreviewUrl(previewData, siteData.url);
        setHref(newHref);
    }, [previewData, siteData.url]);

    const preview = <PortalFrame
        href={href || ''}
        portalParent='offers'
    />;

    return (
        <PreviewModalContent
            afterClose={() => updateRoute('offers')}
            backDropClick={false}
            cancelLabel='Cancel'
            deviceSelector={false}
            dirty={saveState === 'unsaved'}
            height='full'
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            preview={preview}
            previewToolbarBreadcrumbs={[
                {label: 'Offers', onClick: goBack},
                {label: breadcrumbTitle}
            ]}
            sidebar={sidebar}
            size='lg'
            testId='retention-offer-modal'
            title='Offer'
            width={1140}
            onBreadcrumbsBack={goBack}
            onCancel={goBack}
            onOk={handleSaveClick}
        />
    );
};

export default EditRetentionOfferModal;
