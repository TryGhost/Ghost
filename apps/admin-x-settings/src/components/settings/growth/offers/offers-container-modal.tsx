import AddOfferModal from './add-offer-modal';
import EditOfferModal from './edit-offer-modal';
import EditRetentionOfferModal from './edit-retention-offer-modal';
import NiceModal from '@ebay/nice-modal-react';
import OfferSuccess from './offer-success';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {OffersIndexModal} from './offers-index';
import {OffersIndexModal as OffersIndexRetentionModal} from './offers-index-retention';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type OffersRouteHandlerProps = {
    route: string;
};

const OffersRouteHandler: React.FC<OffersRouteHandlerProps> = ({route}) => {
    const retentionOffersEnabled = useFeatureFlag('retentionOffers');

    if (route === 'offers/new') {
        return <AddOfferModal />;
    } else if (retentionOffersEnabled && route.startsWith('offers/edit/retention/') && route.length > 'offers/edit/retention/'.length) {
        const retentionId = route.split('/').pop();
        return <EditRetentionOfferModal id={retentionId ? retentionId : ''} />;
    } else if (!retentionOffersEnabled && route.startsWith('offers/edit/retention')) {
        return <OffersIndexModal />;
    } else if (route.startsWith('offers/edit/') && route.length > 'offers/edit/'.length) {
        const offerId = route.split('/').pop();
        return <EditOfferModal id={offerId ? offerId : ''} />;
    } else if (route.startsWith('offers/success/') && route.length > 'offers/success/'.length) {
        const offerId = route.split('/').pop();
        return <OfferSuccess id={offerId ? offerId : ''} />;
    } else if (route === 'offers/edit') {
        return retentionOffersEnabled ? <OffersIndexRetentionModal /> : <OffersIndexModal />;
    }
};

const OffersContainerModal = () => {
    const {route} = useRouting();
    return <OffersRouteHandler route={route} />;
};

export default NiceModal.create(OffersContainerModal);
