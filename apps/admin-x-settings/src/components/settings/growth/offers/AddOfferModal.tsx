import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalFrame from '../../membership/portal/PortalFrame';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useForm from '../../../../hooks/useForm';
import {Form, Icon, PreviewModalContent, Select, SelectOption, TextArea, TextField, showToast} from '@tryghost/admin-x-design-system';
import {getOfferPortalPreviewUrl, offerPortalPreviewUrlTypes} from '../../../../utils/getOffersPortalPreviewUrl';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {getTiersCadences} from '../../../../utils/getTiersCadences';
import {useAddOffer} from '@tryghost/admin-x-framework/api/offers';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

// we should replace this with a library
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

interface OfferType {
    title: string;
    description: string;
}

const ButtonSelect: React.FC<{type: OfferType, checked: boolean, onClick: () => void}> = ({type, checked, onClick}) => {
    const checkboxClass = checked ? 'bg-black text-white' : 'border border-grey-300';

    return (
        <button className='text-left' type='button' onClick={onClick}>
            <div className='flex gap-3'>
                <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full ${checkboxClass}`}>
                    {checked ? <Icon className='w-2 stroke-[4]' name='check' size='custom' /> : null}
                </div>
                <div className='flex flex-col'>
                    <span>{type.title}</span>
                    <span className='text-sm'>{type.description}</span>
                </div>
            </div>
        </button>
    );
};

type SidebarProps = {
    tierOptions: SelectOption[];
    handleTierChange: (tier: SelectOption) => void;
    selectedTier: SelectOption;
    overrides: offerPortalPreviewUrlTypes
    handleTextInput: (e: React.ChangeEvent<HTMLInputElement>, key: keyof offerPortalPreviewUrlTypes) => void;
    amountOptions: SelectOption[];
    typeOptions: OfferType[];
    durationOptions: SelectOption[];
    handleTypeChange: (type: string) => void;
    handleDurationChange: (duration: string) => void;
    handleAmountTypeChange: (amountType: string) => void;
    handleNameInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTextAreaInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

const Sidebar: React.FC<SidebarProps> = ({tierOptions,
    handleTierChange,
    selectedTier,
    handleTextInput,
    typeOptions,
    durationOptions,
    handleTypeChange,
    handleDurationChange,
    overrides,
    handleAmountTypeChange,
    handleNameInput,
    handleTextAreaInput,
    amountOptions}) => {
    return (
        <div className='pt-7'>
            <Form>
                <TextField
                    hint='Visible to members on Stripe Checkout page.'
                    placeholder='Black Friday'
                    title='Name'
                    onChange={(e) => {
                        handleNameInput(e);
                    }}
                />
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Offer details</h2>
                    <div className='flex flex-col gap-6'>
                        <div className='flex flex-col gap-4 rounded-md border border-grey-200 p-4'>
                            <ButtonSelect checked={overrides.type === 'percent' ? true : false} type={typeOptions[0]} onClick={() => {
                                handleTypeChange('percent');
                            }} />
                            <ButtonSelect checked={overrides.type === 'trial' ? true : false} type={typeOptions[1]} onClick={() => {
                                handleTypeChange('trial');
                            }} />
                        </div>
                        <Select
                            options={tierOptions}
                            selectedOption={selectedTier}
                            title='Tier — Cadence'
                            onSelect={(e) => {
                                if (e) {
                                    handleTierChange(e);
                                }
                            }}
                        />
                        {
                            overrides.type !== 'trial' && <> <div className='relative'>
                                <TextField title='Amount off' type='number' onChange={(e) => {
                                    handleTextInput(e, 'discountAmount');
                                }} />
                                <div className='absolute bottom-0 right-1.5 z-10 w-10'>
                                    <Select
                                        clearBg={true}
                                        controlClasses={{menu: 'w-20 right-0'}}
                                        options={amountOptions}
                                        selectedOption={overrides.amountType === 'percentageOff' ? amountOptions[0] : amountOptions[1]}
                                        onSelect={(e) => {
                                            handleAmountTypeChange(e?.value || '');
                                        }}
                                    />
                                </div>
                            </div>
                            <Select
                                options={durationOptions}
                                selectedOption={overrides.duration === 'once' ? durationOptions[0] : overrides.duration === 'repeating' ? durationOptions[1] : durationOptions[2]}
                                title='Duration'
                                onSelect={e => handleDurationChange(e?.value || '')}
                            />

                            {
                                overrides.duration === 'repeating' && <TextField title='Duration in months' type='number' onChange={(e) => {
                                    handleTextInput(e, 'durationInMonths');
                                }} />
                            }
                            </>
                        }

                        {
                            overrides.type === 'trial' && <TextField title='Trial duration' type='number' value={overrides.trialAmount?.toString()} onChange={(e) => {
                                handleTextInput(e, 'trialAmount');
                            }} />
                        }

                    </div>
                </section>
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Portal Settings</h2>
                    <div className='flex flex-col gap-6'>
                        <TextField
                            placeholder='Black Friday Special'
                            title='Display title'
                            value={overrides.displayTitle.value}
                            onChange={(e) => {
                                handleTextInput(e, 'displayTitle');
                            }}
                        />
                        <TextField
                            placeholder='black-friday'
                            title='Offer code'
                            value={overrides.code.value}
                            onChange={(e) => {
                                handleTextInput(e, 'code');
                            }}
                        />
                        <TextArea
                            placeholder='Take advantage of this limited-time offer.'
                            title='Display description'
                            value={overrides.displayDescription}
                            onChange={(e) => {
                                handleTextAreaInput(e);
                            }}
                        />
                    </div>
                </section>
            </Form>
        </div>
    );
};

const parseData = (input: string): { id: string; period: string; currency: string } => {
    const [id, period, currency] = input.split('-');
    if (!id || !period || !currency) {
        throw new Error('Invalid input format. Expected format is: id-period-currency');
    }
    return {id, period, currency};
};

const AddOfferModal = () => {
    const {siteData} = useGlobalData();
    const typeOptions = [
        {title: 'Discount', description: 'Offer a special reduced price', value: 'percent'},
        {title: 'Free trial', description: 'Give free access for a limited time', value: 'trial'}
    ];

    const durationOptions = [
        {value: 'once', label: 'First-payment'},
        {value: 'repeating', label: 'Multiple-months'},
        {value: 'forever', label: 'Forever'}
    ];

    const [href, setHref] = useState<string>('');
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {data: {tiers} = {}} = useBrowseTiers();
    const activeTiers = getPaidActiveTiers(tiers || []);
    const tierCadenceOptions = getTiersCadences(activeTiers);
    const {mutateAsync: addOffer} = useAddOffer();
    const [selectedTier, setSelectedTier] = useState({
        tier: tierCadenceOptions[0] || {},
        dataset: {
            id: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).id : '',
            period: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).period : '',
            currency: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).currency : ''
        }
    });

    const getDiscountAmount = (discount: number, dctype: string) => {
        if (dctype === 'percentageOff') {
            return discount.toString();
        }
        if (dctype === 'currencyOff') {
            let calcDiscount = discount * 100;
            return calcDiscount.toString();
        }
    };

    const {formState, updateForm, handleSave, saveState, okProps} = useForm({
        initialState: {
            disableBackground: true,
            name: '',
            code: {
                isDirty: false,
                value: ''
            },
            displayTitle: {
                isDirty: false,
                value: ''
            },
            displayDescription: '',
            type: 'percent',
            cadence: selectedTier?.dataset?.period || '',
            trialAmount: 7,
            discountAmount: 0,
            duration: 'once',
            durationInMonths: 0,
            currency: selectedTier?.dataset?.currency || '',
            status: 'active',
            tierId: selectedTier?.dataset?.id || '',
            amountType: 'percentageOff'
        },
        onSave: async () => {
            const dataset = {
                name: formState.name,
                code: formState.code.value,
                display_title: formState.displayTitle.value,
                display_description: formState.displayDescription,
                cadence: formState.cadence,
                amount: formState.type === 'trial' ? Number(getDiscountAmount(formState.trialAmount, formState.amountType)) : Number(getDiscountAmount(formState.discountAmount, formState.amountType)),
                duration: formState.type === 'trial' ? 'trial' : formState.duration,
                duration_in_months: formState.durationInMonths,
                currency: formState.currency,
                status: formState.status,
                tier: {
                    id: formState.tierId
                },
                type: formState.type,
                currency_restriction: false
            };

            const response = await addOffer(dataset);

            if (response && response.offers && response.offers.length > 0) {
                modal.remove();
                updateRoute(`offers/${response.offers[0].id}`);
            }
        },
        onSaveError: () => {},
        onValidate: () => {
            return {};
        },
        savingDelay: 500
    });

    const amountOptions = [
        {value: 'percentageOff', label: '%'},
        {value: 'currencyOff', label: formState.currency}
    ];

    const handleTierChange = (tier: SelectOption) => {
        setSelectedTier({
            tier,
            dataset: parseData(tier.value)
        });

        updateForm(state => ({
            ...state,
            cadence: parseData(tier.value).period,
            currency: parseData(tier.value).currency,
            tierId: parseData(tier.value).id
        }));
    };

    const handleTypeChange = (type: string) => {
        updateForm(state => ({
            ...state,
            type: type
        }));
    };

    const handleAmountTypeChange = (amountType: string) => {
        updateForm(state => ({
            ...state,
            amountType: amountType
        }));
    };

    const handleTextInput = (
        e: React.ChangeEvent<HTMLInputElement>,
        key: keyof offerPortalPreviewUrlTypes
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        updateForm((state) => {
            // Extract the current value for the key

            const currentValue = (state as offerPortalPreviewUrlTypes)[key];
    
            // Check if the current value is an object and has 'isDirty' and 'value' properties
            if (currentValue && typeof currentValue === 'object' && 'isDirty' in currentValue && 'value' in currentValue) {
                // Determine if the field has been modified

                return {
                    ...state,
                    [key]: {
                        ...currentValue,
                        isDirty: true,
                        value: target.value
                    }
                };
            } else {
                // For simple properties, update the value directly
                return {
                    ...state,
                    [key]: target.value
                };
            }
        });
    };

    const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
    
        updateForm((prevOverrides) => {
            let newOverrides = {...prevOverrides};
            newOverrides.name = newValue;
            if (!prevOverrides.code.isDirty) {
                newOverrides.code = {
                    ...prevOverrides.code,
                    value: slugify(newValue)
                };
            }
            if (!prevOverrides.displayTitle.isDirty) {
                newOverrides.displayTitle = {
                    ...prevOverrides.displayTitle,
                    value: newValue
                };
            }
            return newOverrides;
        });
    };

    const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        updateForm(state => ({
            ...state,
            displayDescription: target.value
        }));
    };

    const handleDurationChange = (duration: string) => {
        updateForm(state => ({
            ...state,
            duration: duration
        }));
    };

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);

    const cancelAddOffer = () => {
        modal.remove();
        updateRoute('offers/edit');
    };

    useEffect(() => {
        const newHref = getOfferPortalPreviewUrl(formState, siteData.url);
        setHref(newHref);
    }, [formState, siteData.url]);

    const sidebar = <Sidebar
        amountOptions={amountOptions as SelectOption[]}
        durationOptions={durationOptions}
        handleAmountTypeChange={handleAmountTypeChange}
        handleDurationChange={handleDurationChange}
        handleNameInput={handleNameInput}
        handleTextAreaInput={handleTextAreaInput}
        handleTextInput={handleTextInput}
        handleTierChange={handleTierChange}
        handleTypeChange={handleTypeChange}
        overrides={formState}
        selectedTier={selectedTier.tier}
        tierOptions={tierCadenceOptions}
        typeOptions={typeOptions}
    />;

    const iframe = <PortalFrame
        href={href}
    />;

    return <PreviewModalContent
        cancelLabel='Cancel'
        deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel='Publish'
        preview={iframe}
        sidebar={sidebar} 
        size='full'
        title='Offer'
        onCancel={cancelAddOffer}
        onOk={async () => {
            if (!(await handleSave({fakeWhenUnchanged: true}))) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save offer, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }} />;
};

export default NiceModal.create(AddOfferModal);
