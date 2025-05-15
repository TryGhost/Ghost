import React from 'react';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import type {NiceModalHocProps} from '@ebay/nice-modal-react';
import type {RoutingModalProps} from '@tryghost/admin-x-framework/routing';

import AboutModal from '../../settings/general/About';
import AddIntegrationModal from '../../settings/advanced/integrations/AddIntegrationModal';
import AddNewsletterModal from '../../settings/email/newsletters/AddNewsletterModal';
// import AddOfferModal from '../../settings/growth/offers/AddOfferModal';
import AddRecommendationModal from '../../settings/growth/recommendations/AddRecommendationModal';
import AnnouncementBarModal from '../../settings/site/AnnouncementBarModal';
import CustomIntegrationModal from '../../settings/advanced/integrations/CustomIntegrationModal';
import DesignAndThemeModal from '../../settings/site/DesignAndThemeModal';
// import EditOfferModal from '../../settings/growth/offers/EditOfferModal';
import EditRecommendationModal from '../../settings/growth/recommendations/EditRecommendationModal';
import EmbedSignupFormModal from '../../settings/growth/embedSignup/EmbedSignupFormModal';
import FirstpromoterModal from '../../settings/advanced/integrations/FirstPromoterModal';
import HistoryModal from '../../settings/advanced/HistoryModal';
import InviteUserModal from '../../settings/general/InviteUserModal';
import NavigationModal from '../../settings/site/NavigationModal';
import NewsletterDetailModal from '../../settings/email/newsletters/NewsletterDetailModal';
import NewsletterDetailModalAlpha from '../../settings/email/newsletters/NewsletterDetailModalAlpha';
import NewsletterDetailModalPrototype from '../../settings/email/newsletters/NewsletterDetailModalPrototype';
import OfferSuccess from '../../settings/growth/offers/OfferSuccess';
// import OffersModal from '../../settings/growth/offers/OffersIndex';
import OffersContainerModal from '../../settings/growth/offers/OffersContainerModal';
import PinturaModal from '../../settings/advanced/integrations/PinturaModal';
import PortalModal from '../../settings/membership/portal/PortalModal';
import SlackModal from '../../settings/advanced/integrations/SlackModal';
import StripeConnectModal from '../../settings/membership/stripe/StripeConnectModal';
import TierDetailModal from '../../settings/membership/tiers/TierDetailModal';
import UnsplashModal from '../../settings/advanced/integrations/UnsplashModal';
import UserDetailModal from '../../settings/general/UserDetailModal';
import ZapierModal from '../../settings/advanced/integrations/ZapierModal';

// Wrapper component to conditionally render based on feature flag
const ConditionalNewsletterDetailModal: ModalComponent = (props) => {
    const showPrototypeSettings = useFeatureFlag('emailCustomization');
    const showAlphaSettings = useFeatureFlag('emailCustomizationAlpha');

    if (showPrototypeSettings) {
        return <NewsletterDetailModalPrototype {...props} />;
    } else if (showAlphaSettings) {
        return <NewsletterDetailModalAlpha {...props} />;
    } else {
        return <NewsletterDetailModal {...props} />;
    }
};

const modals = {
    AddIntegrationModal,
    AddNewsletterModal,
    AddRecommendationModal,
    CustomIntegrationModal,
    DesignAndThemeModal,
    EditRecommendationModal,
    FirstpromoterModal,
    HistoryModal,
    InviteUserModal,
    NavigationModal,
    NewsletterDetailModal: ConditionalNewsletterDetailModal,
    PinturaModal,
    PortalModal,
    SlackModal,
    StripeConnectModal,
    TierDetailModal,
    UnsplashModal,
    UserDetailModal,
    ZapierModal,
    AnnouncementBarModal,
    EmbedSignupFormModal,
    OffersContainerModal,
    // OffersModal,
    // AddOfferModal,
    // EditOfferModal,
    AboutModal,
    OfferSuccess
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies {[key: string]: ModalComponent<any>};

export default modals;

export type ModalName = keyof typeof modals;
export type ModalComponent<Props = object> = React.FC<NiceModalHocProps & RoutingModalProps & Props>;
