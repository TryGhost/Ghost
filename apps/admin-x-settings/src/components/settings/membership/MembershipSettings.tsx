import Access from './Access';
import Analytics from './Analytics';
import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Offers from './Offers';
import Portal from './Portal';
import React from 'react';
import Recommendations from './Recommendations';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Tiers from './Tiers';
import TipsOrDonations from './TipsOrDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

export const searchKeywords = {
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership'],
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    tips: ['membership', 'tip', 'donation', 'one time', 'payment'],
    embedSignupForm: ['membership', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['membership', 'recommendations', 'recommend', 'blogroll'],
    analytics: ['membership', 'analytics', 'tracking', 'privacy', 'membership'],
    offers: ['membership', 'offers', 'discounts', 'coupons', 'promotions']
};

const MembershipSettings: React.FC = () => {
    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');
    const hasOffers = useFeatureFlag('adminXOffers');

    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Access keywords={searchKeywords.access} />
            <Portal keywords={searchKeywords.portal} />
            <Tiers keywords={searchKeywords.tiers} />
            {hasTipsAndDonations && <TipsOrDonations keywords={searchKeywords.tips} />}
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasRecommendations && <Recommendations keywords={searchKeywords.recommendations} />}
            <Analytics keywords={searchKeywords.analytics} />
            {hasOffers && <Offers keywords={searchKeywords.offers} />}
        </SettingSection>
    );
};

export default MembershipSettings;
