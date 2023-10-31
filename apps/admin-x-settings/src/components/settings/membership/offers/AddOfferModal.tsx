import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
import {useEffect} from 'react';

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

    return <PreviewModalContent sidebar={<></>} title='Add Offer' />;
};

export default NiceModal.create(AddOfferModal);
