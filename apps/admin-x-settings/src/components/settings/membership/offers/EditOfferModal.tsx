import Button from '@tryghost/admin-x-design/global/Button';
import Form from '@tryghost/admin-x-design/global/form/Form';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TextArea from '@tryghost/admin-x-design/global/form/TextArea';
import TextField from '@tryghost/admin-x-design/global/form/TextField';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {PreviewModalContent} from '@tryghost/admin-x-design/global/modal/PreviewModal';
import {useEffect} from 'react';

const Sidebar: React.FC = () => {
    return (
        <div className='pt-7'>
            <Form>
                <TextField
                    hint='Visible to members on Stripe Checkout page.'
                    placeholder='Black Friday'
                    title='Name'
                    value='Black friday'
                />
                <section className='mt-4'>
                    <h2 className='mb-4 text-lg'>Portal Settings</h2>
                    <div className='flex flex-col gap-6'>
                        <TextField
                            placeholder='Black Friday Special'
                            title='Display title'
                            value='Black friday'
                        />
                        <TextField
                            placeholder='black-friday'
                            title='Offer code'
                            value='black-friday'
                        />
                        <TextArea
                            placeholder='Take advantage of this limited-time offer.'
                            title='Display description'
                            value='Get 20% off for Black Friday'
                        />
                        <div className='flex flex-col gap-1.5'>
                            <TextField
                                placeholder='https://www.example.com'
                                title='URL'
                                type='url'
                                value='https://example.com/#/portal/offers/black-friday'
                            />
                            <Button color='green' fullWidth={true} label='Copy link' />
                        </div>
                    </div>
                </section>
            </Form>
        </div>
    );
};

const EditOfferModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);

    const sidebar = <Sidebar />;

    return <PreviewModalContent deviceSelector={false} okLabel='Update' sidebar={sidebar} size='full' title='Offer' onCancel={() => {
        modal.remove();
        updateRoute('offers/edit');
    }} />;
};

export default NiceModal.create(EditOfferModal);
