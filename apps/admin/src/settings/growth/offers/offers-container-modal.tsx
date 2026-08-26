import AddOfferModal from './add-offer-modal';
import EditOfferModal from './edit-offer-modal';
import EditRetentionOfferModal from './edit-retention-offer-modal';
import OfferSuccess from './offer-success';
import { OffersIndexModal } from './offers-index';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

type OffersRouteHandlerProps = {
  route: string;
};

type RetentionCadence = 'monthly' | 'yearly';

const RETENTION_ROUTE_PREFIX = 'offers/edit/retention/';

const getRetentionCadence = (route: string): RetentionCadence | null => {
  const suffix = route.slice(RETENTION_ROUTE_PREFIX.length).replace(/\/+$/, '');
  return suffix === 'monthly' || suffix === 'yearly' ? suffix : null;
};

const OffersRouteHandler: React.FC<OffersRouteHandlerProps> = ({ route }) => {
  if (route === 'offers/new') {
    return <AddOfferModal />;
  } else if (route === 'offers/edit/retention' || route.startsWith(RETENTION_ROUTE_PREFIX)) {
    const retentionCadence = route.startsWith(RETENTION_ROUTE_PREFIX)
      ? getRetentionCadence(route)
      : null;
    if (retentionCadence) {
      return <EditRetentionOfferModal cadence={retentionCadence} />;
    }

    return <OffersIndexModal />;
  } else if (route.startsWith('offers/edit/') && route.length > 'offers/edit/'.length) {
    const offerId = route.split('/').pop();
    return <EditOfferModal id={offerId ? offerId : ''} />;
  } else if (route.startsWith('offers/success/') && route.length > 'offers/success/'.length) {
    const offerId = route.split('/').pop();
    return <OfferSuccess id={offerId ? offerId : ''} />;
  } else if (route === 'offers/edit' || route === 'offers/edit/') {
    return <OffersIndexModal />;
  }
};

const OffersContainerModal = () => {
  const { route } = useSettingsNavigation();
  return <OffersRouteHandler route={route} />;
};

export default OffersContainerModal;
