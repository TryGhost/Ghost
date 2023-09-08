import Access from './Access';
import Analytics from './Analytics';
import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Portal from './Portal';
import React from 'react';
import Recommendations from '../site/Recommendations';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Tiers from './Tiers';
import TipsOrDonations from './TipsOrDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

const searchKeywords = {
    portal: ['portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership'],
    access: ['default', 'access', 'subscription', 'post', 'membership'],
    tiers: ['tiers', 'payment', 'paid'],
    tips: ['tip', 'donation', 'one time', 'payment'],
    embedSignupForm: ['signup', 'form', 'embed'],
    recommendations: ['recommendation', 'recommend', 'blogroll'],
    analytics: ['analytics', 'tracking', 'privacy', 'membership']
};

const MembershipSettings: React.FC = () => {
    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');

    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Portal keywords={searchKeywords.portal} />
            <Access keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            {hasTipsAndDonations && <TipsOrDonations keywords={searchKeywords.tips} />}
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasRecommendations && <Recommendations keywords={searchKeywords.recommendations} />}
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
