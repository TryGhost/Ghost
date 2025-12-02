import React from 'react';
import type {NiceModalHocProps} from '@ebay/nice-modal-react';
import type {RoutingModalProps} from '@tryghost/admin-x-framework/routing';

import AboutModal from '../../settings/general/about';
import AddIntegrationModal from '../../settings/advanced/integrations/add-integration-modal';
import AddNewsletterModal from '../../settings/email/newsletters/add-newsletter-modal';
// import AddOfferModal from '../../settings/growth/offers/AddOfferModal';
import AddRecommendationModal from '../../settings/growth/recommendations/add-recommendation-modal';
import AnnouncementBarModal from '../../settings/site/announcement-bar-modal';
import CustomIntegrationModal from '../../settings/advanced/integrations/custom-integration-modal';
import DesignAndThemeModal from '../../settings/site/design-and-theme-modal';
// import EditOfferModal from '../../settings/growth/offers/EditOfferModal';
import EditRecommendationModal from '../../settings/growth/recommendations/edit-recommendation-modal';
import EmbedSignupFormModal from '../../settings/growth/embed-signup/embed-signup-form-modal';
import FirstPromoterModal from '../../settings/advanced/integrations/first-promoter-modal';
import HistoryModal from '../../settings/advanced/history-modal';
import InviteUserModal from '../../settings/general/invite-user-modal';
import NavigationModal from '../../settings/site/navigation-modal';
import NewsletterDetailModal from '../../settings/email/newsletters/newsletter-detail-modal';
import OfferSuccess from '../../settings/growth/offers/offer-success';
// import OffersModal from '../../settings/growth/offers/OffersIndex';
import OffersContainerModal from '../../settings/growth/offers/offers-container-modal';
import PinturaModal from '../../settings/advanced/integrations/pintura-modal';
import PortalModal from '../../settings/membership/portal/portal-modal';
import SlackModal from '../../settings/advanced/integrations/slack-modal';
import StripeConnectModal from '../../settings/membership/stripe/stripe-connect-modal';
import TestimonialsModal from '../../settings/growth/explore/testimonials-modal';
import TierDetailModal from '../../settings/membership/tiers/tier-detail-modal';
import UnsplashModal from '../../settings/advanced/integrations/unsplash-modal';
import UserDetailModal from '../../settings/general/user-detail-modal';
import ZapierModal from '../../settings/advanced/integrations/zapier-modal';

const modals = {
    AddIntegrationModal,
    AddNewsletterModal,
    AddRecommendationModal,
    CustomIntegrationModal,
    DesignAndThemeModal,
    EditRecommendationModal,
    FirstPromoterModal,
    HistoryModal,
    InviteUserModal,
    NavigationModal,
    NewsletterDetailModal,
    PinturaModal,
    PortalModal,
    SlackModal,
    StripeConnectModal,
    TestimonialsModal,
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
