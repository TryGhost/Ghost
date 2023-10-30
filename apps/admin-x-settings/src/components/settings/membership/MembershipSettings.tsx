import Access from './Access';
import Analytics from './Analytics';
import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Portal from './Portal';
import React from 'react';
import Recommendations from './Recommendations';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Tiers from './Tiers';
import TipsOrDonations from './TipsOrDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

export const searchKeywords = {
    portal: ['portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership'],
    access: ['default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting'],
    tiers: ['tiers', 'payment', 'paid', 'stripe'],
    tips: ['tip', 'donation', 'one time', 'payment'],
    embedSignupForm: ['embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['recommendations', 'recommend', 'blogroll'],
    analytics: ['analytics', 'tracking', 'privacy', 'membership']
};

const MembershipSettings: React.FC = () => {
    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');

    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Access keywords={searchKeywords.access} />
            <Portal keywords={searchKeywords.portal} />
            <Tiers keywords={searchKeywords.tiers} />
            {hasTipsAndDonations && <TipsOrDonations keywords={searchKeywords.tips} />}
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasRecommendations && <Recommendations keywords={searchKeywords.recommendations} />}
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
