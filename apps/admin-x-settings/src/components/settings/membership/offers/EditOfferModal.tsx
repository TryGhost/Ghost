import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Offer} from '../../../../api/offers';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {useBrowseOffersById} from '../../../../api/offers';
import {useEffect} from 'react';

const Sidebar: React.FC<{offer: Offer}> = ({offer}) => {
    return (
        <div className='pt-7'>
            <Form>
                <TextField
                    hint='Visible to members on Stripe Checkout page.'
                    placeholder='Black Friday'
                    title='Name'
                    value={offer?.name}
                />
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Portal Settings</h2>
                    <div className='flex flex-col gap-6'>
                        <TextField
                            placeholder='Black Friday Special'
                            title='Display title'
                            value={offer?.display_title}
                        />
                        <TextField
                            placeholder='black-friday'
                            title='Offer code'
                            value={offer?.code}
                        />
                        <TextArea
                            placeholder='Take advantage of this limited-time offer.'
                            title='Display description'
                            value={offer.display_description}
                        />
                        <div className='flex flex-col gap-1.5'>
                            <TextField
                                placeholder='https://www.example.com'
                                title='URL'
                                type='url'
                                value={`http://localhost:2368//#/portal/offers/${offer?.code}`}
                            />
                            <Button color='green' fullWidth={true} label='Copy link' />
                        </div>
                    </div>
                </section>
            </Form>
        </div>
    );
};

const EditOfferModal: React.FC<RoutingModalProps> = ({params}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    let offer : Offer;

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);


    const {data: {offers: offerById = []} = {}} = useBrowseOffersById(params?.id ? params?.id : '');
    if (offerById.length === 0) {
        return null;
    }
    offer = offerById[0];
    
    const sidebar = <Sidebar 
        offer={offer}
    />;

    return <PreviewModalContent deviceSelector={false} okLabel='Update' sidebar={sidebar} size='full' title='Offer' onCancel={() => {
        modal.remove();
        updateRoute('offers/edit');
    }} />;
};

export default NiceModal.create(EditOfferModal);
