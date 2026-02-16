import PortalFrame from '../../membership/portal/portal-frame';
import {ButtonSelect, type OfferType} from './add-offer-modal';
import {Form, PreviewModalContent, Select, type SelectOption, TextArea, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type Offer, useAddOffer, useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes} from '../../../../utils/get-offers-portal-preview-url';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useEffect, useMemo, useState} from 'react';
import {useForm} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RetentionOfferFormState = {
    enabled: boolean;
    displayTitle: string;
    displayDescription: string;
    type: string;
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
const MAX_FREE_MONTHS = 12;

const getResolvedAmount = ({
    type,
    percentAmount,
    freeMonths,
    lastPercentAmount,
    lastFreeMonths
}: {
    type: RetentionOfferFormState['type'];
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

const getDefaultState = (id: string): RetentionOfferFormState => {
    if (id === 'monthly') {
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
    }
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

const getRetentionOfferFormState = (id: string, offer: Offer | null): RetentionOfferFormState => {
    const defaultState = getDefaultState(id);

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
        type: offer.type,
        percentAmount: isPercentOffer ? offer.amount : defaultState.percentAmount,
        duration: isPercentOffer ? offer.duration : defaultState.duration,
        durationInMonths: repeatingDurationInMonths,
        freeMonths: isFreeMonthsOffer ? offer.amount : defaultState.freeMonths
    };
};

const normalizeRetentionCadence = (cadence: string): 'month' | 'year' | null => {
    if (cadence === 'month' || cadence === 'monthly') {
        return 'month';
    }

    if (cadence === 'year' || cadence === 'yearly') {
        return 'year';
    }

    return null;
};

const RetentionOfferSidebar: React.FC<{
    formState: RetentionOfferFormState;
    updateForm: (updater: (state: RetentionOfferFormState) => RetentionOfferFormState) => void;
    cadence: 'monthly' | 'yearly';
    redemptions: number;
}> = ({formState, updateForm, cadence, redemptions}) => {
    return (
        <div className='flex grow flex-col pt-2'>
            <Form className='grow'>
                <section>
                    <div className='flex flex-col gap-5 rounded-md border border-grey-300 p-4 pb-3.5 dark:border-grey-800'>
                        <div className='flex flex-col gap-1.5'>
                            <span className='text-xs font-semibold leading-none text-grey-700'>Performance</span>
                            <span>{redemptions} redemptions</span>
                        </div>
                    </div>
                </section>
                <section className='mt-4'>
                    <Toggle
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
                                    placeholder='Before you go...'
                                    title='Display title'
                                    value={formState.displayTitle}
                                    onChange={(e) => {
                                        updateForm(state => ({...state, displayTitle: e.target.value}));
                                    }}
                                />
                                <TextArea
                                    placeholder='We&#39;d hate to see you go! How about a special offer to stay?'
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
                                            updateForm((state) => {
                                                const nextPercentAmount = state.percentAmount > 0 ? state.percentAmount : 20;

                                                return {...state, type: 'percent', percentAmount: nextPercentAmount};
                                            });
                                        }}
                                    />
                                    <ButtonSelect
                                        checked={formState.type === 'free_months'}
                                        type={typeOptions[1]}
                                        onClick={() => {
                                            updateForm(state => ({...state, type: 'free_months'}));
                                        }}
                                    />
                                </div>
                                {formState.type === 'percent' && (
                                    <>
                                        <TextField
                                            rightPlaceholder='%'
                                            title='Amount off'
                                            type='number'
                                            value={formState.percentAmount === 0 ? '' : String(formState.percentAmount)}
                                            onChange={(e) => {
                                                const nextValue = Number(e.target.value);

                                                if (nextValue < 0) {
                                                    return;
                                                }

                                                updateForm(state => ({...state, percentAmount: Math.min(nextValue, MAX_PERCENT_AMOUNT)}));
                                            }}
                                        />
                                        <Select
                                            options={durationOptions}
                                            selectedOption={durationOptions.find(option => option.value === formState.duration)}
                                            title='Duration'
                                            onSelect={(e) => {
                                                if (e) {
                                                    updateForm(state => ({...state, duration: e.value}));
                                                }
                                            }}
                                        />
                                        {formState.duration === 'repeating' && (
                                            <TextField
                                                rightPlaceholder={`${formState.durationInMonths === 1 ? 'month' : 'months'}`}
                                                title='Duration in months'
                                                type='number'
                                                value={formState.durationInMonths === 0 ? '' : String(formState.durationInMonths)}
                                                onChange={(e) => {
                                                    if (Number(e.target.value) < 0) {
                                                        return;
                                                    }

                                                    updateForm(state => ({...state, durationInMonths: Number(e.target.value)}));
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                                {formState.type === 'free_months' && (
                                    <TextField
                                        rightPlaceholder={`${formState.freeMonths === 1 ? 'month' : 'months'}`}
                                        title='Free months'
                                        type='number'
                                        value={formState.freeMonths === 0 ? '' : String(formState.freeMonths)}
                                        onChange={(e) => {
                                            const nextValue = Number(e.target.value);

                                            if (nextValue < 0) {
                                                return;
                                            }

                                            updateForm(state => ({...state, freeMonths: Math.min(nextValue, MAX_FREE_MONTHS)}));
                                        }}
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
    const [href, setHref] = useState<string>('');
    const cadence = id === 'monthly' ? 'monthly' : 'yearly' as const;
    const breadcrumbTitle = cadence === 'monthly' ? 'Monthly retention' : 'Yearly retention';
    const offerCadence = cadence === 'monthly' ? 'month' : 'year';
    const activePaidTiers = getPaidActiveTiers(tiers || []);
    const activeRetentionOffer = useMemo(() => {
        return allOffers.find((offer) => {
            return offer.redemption_type === 'retention' &&
                normalizeRetentionCadence(offer.cadence) === offerCadence &&
                offer.status === 'active';
        }) || null;
    }, [allOffers, offerCadence]);
    const retentionRedemptions = useMemo(() => {
        return allOffers.reduce((total, offer) => {
            if (offer.redemption_type !== 'retention' || normalizeRetentionCadence(offer.cadence) !== offerCadence) {
                return total;
            }

            return total + (offer.redemption_count || 0);
        }, 0);
    }, [allOffers, offerCadence]);
    const [lastPreviewPercentAmount, setLastPreviewPercentAmount] = useState(20);
    const [lastPreviewFreeMonths, setLastPreviewFreeMonths] = useState(1);
    const [initializedOfferKey, setInitializedOfferKey] = useState<string | null>(null);

    const {formState, setFormState, updateForm, handleSave, saveState, okProps} = useForm({
        initialState: getDefaultState(id),
        savingDelay: 500,
        onSave: async () => {
            const amount = getResolvedAmount({
                type: formState.type,
                percentAmount: formState.percentAmount,
                freeMonths: formState.freeMonths,
                lastPercentAmount: lastPreviewPercentAmount,
                lastFreeMonths: lastPreviewFreeMonths
            });

            const offerName = cadence === 'monthly' ? 'Monthly retention' : 'Yearly retention';
            const offerCode = cadence === 'monthly' ? 'monthly-retention' : 'yearly-retention';

            await addOffer({
                name: offerName,
                code: offerCode,
                display_title: formState.displayTitle || '',
                display_description: formState.displayDescription || '',
                cadence: offerCadence,
                amount,
                duration: formState.type === 'free_months' ? 'free_months' : formState.duration,
                duration_in_months: formState.type === 'percent' && formState.duration === 'repeating' ? formState.durationInMonths : 0,
                currency: null,
                status: formState.enabled ? 'active' : 'archived',
                redemption_type: 'retention',
                tier: null,
                type: formState.type,
                currency_restriction: false
            });
        },
        onSaveError: () => {},
        onValidate: () => {
            return {};
        }
    });

    const activeRetentionOfferId = activeRetentionOffer?.id || 'none';
    const currentOfferKey = `${id}:${activeRetentionOfferId}`;

    useEffect(() => {
        if (!hasFetchedOffers || isFetchingOffers || saveState === 'unsaved' || initializedOfferKey === currentOfferKey) {
            return;
        }

        setFormState(() => getRetentionOfferFormState(id, activeRetentionOffer));
        setInitializedOfferKey(currentOfferKey);
    }, [activeRetentionOffer, currentOfferKey, hasFetchedOffers, id, initializedOfferKey, isFetchingOffers, saveState, setFormState]);

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
            formState={formState}
            redemptions={retentionRedemptions}
            updateForm={updateForm}
        />
    );

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
            onOk={async () => {
                if (await handleSave({force: true})) {
                    goBack();
                }
            }}
        />
    );
};

export default EditRetentionOfferModal;
