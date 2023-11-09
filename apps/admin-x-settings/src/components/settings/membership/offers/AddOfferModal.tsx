import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalFrame from '../portal/PortalFrame';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Form, Icon, PreviewModalContent, Select, SelectOption, TextArea, TextField} from '@tryghost/admin-x-design-system';
import {getOfferPortalPreviewUrl, offerPortalPreviewUrlTypes} from '../../../../utils/getOffersPortalPreviewUrl';
import {getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {getTiersCadences} from '../../../../utils/getTiersCadences';
import {useEffect, useState} from 'react';

interface OfferType {
    title: string;
    description: string;
}

const ButtonSelect: React.FC<{type: OfferType, checked: boolean}> = ({type, checked}) => {
    const checkboxClass = checked ? 'bg-black text-white' : 'border border-grey-300';

    return (
        <button className='text-left' type='button'>
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
    handleTextInput: (e: React.ChangeEvent<HTMLInputElement>, key: string) => void;
};

const Sidebar: React.FC<SidebarProps> = ({tierOptions, handleTierChange, selectedTier, handleTextInput, overrides}) => {
    const typeOptions = [
        {title: 'Discount', description: 'Offer a special reduced price'},
        {title: 'Free trial', description: 'Give free access for a limited time'}
    ];

    const amountOptions = [
        {value: '1', label: '%'},
        {value: '2', label: 'USD'}
    ];

    const durationOptions = [
        {value: '1', label: 'First-payment'},
        {value: '2', label: 'Multiple-months'},
        {value: '3', label: 'Forever'}
    ];

    return (
        <div className='pt-7'>
            <Form>
                <TextField
                    hint='Visible to members on Stripe Checkout page.'
                    placeholder='Black Friday'
                    title={overrides.name}
                    onChange={(e) => {
                        handleTextInput(e, 'name');
                    }}
                />
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Offer details</h2>
                    <div className='flex flex-col gap-6'>
                        <div className='flex flex-col gap-4 rounded-md border border-grey-200 p-4'>
                            <ButtonSelect checked={true} type={typeOptions[0]} />
                            <ButtonSelect checked={false} type={typeOptions[1]} />
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
                        <div className='relative'>
                            <TextField title='Amount off' type='number' />
                            <div className='absolute bottom-0 right-1.5 z-10 w-10'>
                                <Select
                                    clearBg={true}
                                    controlClasses={{menu: 'w-20 right-0'}}
                                    options={amountOptions}
                                    selectedOption={amountOptions[0]}
                                    onSelect={() => {}}
                                />
                            </div>
                        </div>
                        <Select
                            options={durationOptions}
                            selectedOption={durationOptions[0]}
                            title='Duration'
                            onSelect={() => {}}
                        />
                    </div>
                </section>
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Portal Settings</h2>
                    <div className='flex flex-col gap-6'>
                        <TextField
                            placeholder='Black Friday Special'
                            title={overrides.displayTitle}
                            onChange={(e) => {
                                handleTextInput(e, 'displayTitle');
                            }}
                        />
                        <TextField
                            placeholder='black-friday'
                            title={overrides.code}
                            onChange={(e) => {
                                handleTextInput(e, 'code');
                            }}
                        />
                        <TextArea
                            placeholder='Take advantage of this limited-time offer.'
                            title={overrides.displayDescription}
                            onChange={(e) => {
                                handleTextInput(e, 'displayDescription');
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
    const [href, setHref] = useState<string>('');
    const modal = useModal();
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

    const [overrides, setOverrides] = useState({
        disableBackground: true,
        name: '',
        code: 'black-friday',
        displayTitle: 'Black Friday Special',
        displayDescription: 'Take advantage of this limited-time offer.',
        type: 'discount',
        cadence: 'monthly',
        amount: 1200,
        duration: '',
        durationInMonths: 12,
        currency: 'USD',
        status: 'active',
        tierId: selectedTier?.dataset?.id || ''
    });

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

    // const handleTextInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, key: string) => {
    //     setOverrides({
    //         ...overrides,
    //         [key]: e.target.value
    //     });
    // };

    const handleTextInput = (
        e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>,
        key: string
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement; // Type assertion here
        setOverrides(prevOverrides => ({
            ...prevOverrides,
            [key]: target.value
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
        const newHref = getOfferPortalPreviewUrl(overrides, 'http://localhost:2368');
        setHref(newHref);
    }, [overrides]);

    const sidebar = <Sidebar 
        handleTextInput={handleTextInput}
        handleTierChange={handleTierChange}
        overrides={overrides}
        selectedTier={selectedTier.tier}
        tierOptions={tierCadenceOptions}
    />;

    const iframe = <PortalFrame
        href={href}
    />;

    return <PreviewModalContent cancelLabel='Cancel' deviceSelector={false} okLabel='Publish' preview={iframe} sidebar={sidebar} size='full' title='Offer' onCancel={cancelAddOffer} />;
};

export default NiceModal.create(AddOfferModal);
