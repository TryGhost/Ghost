import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Form, Icon, PreviewModalContent, Select, TextArea, TextField} from '@tryghost/admin-x-design';
import {useEffect} from 'react';

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

const Sidebar: React.FC = () => {
    const typeOptions = [
        {title: 'Discount', description: 'Offer a special reduced price'},
        {title: 'Free trial', description: 'Give free access for a limited time'}
    ];

    const tierCadenceOptions = [
        {value: '1', label: 'Bronze — Monthly'},
        {value: '2', label: 'Bronze — Yearly'},
        {value: '3', label: 'Silver — Monthly'},
        {value: '4', label: 'Silver — Yearly'},
        {value: '5', label: 'Gold — Monthly'},
        {value: '6', label: 'Gold — Yearly'}
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
                    title='Name'
                />
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Offer details</h2>
                    <div className='flex flex-col gap-6'>
                        <div className='flex flex-col gap-4 rounded-md border border-grey-200 p-4'>
                            <ButtonSelect checked={true} type={typeOptions[0]} />
                            <ButtonSelect checked={false} type={typeOptions[1]} />
                        </div>
                        <Select
                            options={tierCadenceOptions}
                            selectedOption={tierCadenceOptions[0]}
                            title='Tier — Cadence'
                            onSelect={() => {}}
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
                            title='Display title'
                        />
                        <TextField
                            placeholder='black-friday'
                            title='Offer code'
                        />
                        <TextArea
                            placeholder='Take advantage of this limited-time offer.'
                            title='Display description'
                        />
                    </div>
                </section>
            </Form>
        </div>
    );
};

const AddOfferModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');

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

    const sidebar = <Sidebar />;

    return <PreviewModalContent cancelLabel='Cancel' deviceSelector={false} okLabel='Publish' sidebar={sidebar} size='full' title='Offer' onCancel={cancelAddOffer} />;
};

export default NiceModal.create(AddOfferModal);
