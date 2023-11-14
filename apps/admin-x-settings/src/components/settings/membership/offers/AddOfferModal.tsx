import PortalFrame from '../portal/PortalFrame';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Form, Icon, PreviewModalContent, Select, SelectOption, TextArea, TextField} from '@tryghost/admin-x-design-system';
import {getOfferPortalPreviewUrl, offerPortalPreviewUrlTypes} from '../../../../utils/getOffersPortalPreviewUrl';
import {getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {getTiersCadences} from '../../../../utils/getTiersCadences';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

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

type AddOfferModalProps = {
    onBack: (view: 'list') => void;
};

const AddOfferModal: React.FC<AddOfferModalProps> = ({onBack}) => {
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
    // const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {data: {tiers} = {}} = useBrowseTiers();
    const activeTiers = getPaidActiveTiers(tiers || []);
    const tierCadenceOptions = getTiersCadences(activeTiers);
    const [selectedTier, setSelectedTier] = useState({
        tier: tierCadenceOptions[0] || {},
        dataset: {
            id: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).id : '',
            period: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).period : '',
            currency: tierCadenceOptions[0]?.value ? parseData(tierCadenceOptions[0]?.value).currency : ''
        }
    });

    const [overrides, setOverrides] = useState<offerPortalPreviewUrlTypes>({
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
    });

    const amountOptions = [
        {value: 'percentageOff', label: '%'},
        {value: 'currencyOff', label: overrides.currency}
    ];

    const handleTierChange = (tier: SelectOption) => {
        setSelectedTier({
            tier,
            dataset: parseData(tier.value)
        });

        setOverrides({
            ...overrides,
            tierId: parseData(tier.value).id,
            cadence: parseData(tier.value).period,
            currency: parseData(tier.value).currency
        });
    };

    const handleTypeChange = (type: string) => {
        setOverrides({
            ...overrides,
            type: type
        });
    };

    const handleAmountTypeChange = (amountType: string) => {
        setOverrides({
            ...overrides,
            amountType: amountType
        });
    };

    const handleTextInput = (
        e: React.ChangeEvent<HTMLInputElement>,
        key: keyof offerPortalPreviewUrlTypes
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        setOverrides((prevOverrides: offerPortalPreviewUrlTypes) => {
            // Extract the current value for the key
            const currentValue = prevOverrides[key];
    
            // Check if the current value is an object and has 'isDirty' and 'value' properties
            if (currentValue && typeof currentValue === 'object' && 'isDirty' in currentValue && 'value' in currentValue) {
                // Determine if the field has been modified
    
                return {
                    ...prevOverrides,
                    [key]: {
                        ...currentValue,
                        isDirty: true,
                        value: target.value
                    }
                };
            } else {
                // For simple properties, update the value directly
                return {
                    ...prevOverrides,
                    [key]: target.value
                };
            }
        });
    };

    const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
    
        setOverrides((prevOverrides) => {
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
        setOverrides({
            ...overrides,
            displayDescription: target.value
        });
    };

    const handleDurationChange = (duration: string) => {
        setOverrides({
            ...overrides,
            duration: duration
        });
    };

    // useEffect(() => {
    //     if (!hasOffers) {
    //         modal.remove();
    //         updateRoute('');
    //     }
    // }, [hasOffers, modal, updateRoute]);

    // const cancelAddOffer = () => {
    //     modal.remove();
    //     updateRoute('offers/edit');
    // };

    useEffect(() => {
        if (!hasOffers) {
            updateRoute('');
        }
    }, [updateRoute, hasOffers]);

    useEffect(() => {
        const newHref = getOfferPortalPreviewUrl(overrides, siteData.url);
        setHref(newHref);
    }, [overrides, siteData.url]);

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
        overrides={overrides}
        selectedTier={selectedTier.tier}
        tierOptions={tierCadenceOptions}
        typeOptions={typeOptions}
    />;

    const iframe = <PortalFrame
        href={href}
    />;

    return <PreviewModalContent cancelLabel='Cancel' deviceSelector={false} okLabel='Publish' preview={iframe} sidebar={sidebar} size='full' title='Offer' onCancel={() => {
        onBack('list');
    }} />;
};

export default AddOfferModal;
