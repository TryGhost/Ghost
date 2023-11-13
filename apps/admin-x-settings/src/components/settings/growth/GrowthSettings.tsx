import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import TipsOrDonations from './TipsOrDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

export const searchKeywords = {
    tips: ['membership', 'tip', 'donation', 'one time', 'payment'],
    embedSignupForm: ['membership', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['membership', 'recommendations', 'recommend', 'blogroll'],
    offers: ['membership', 'offers', 'discounts', 'coupons', 'promotions']
};

const GrowthSettings: React.FC = () => {
    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');
    const hasOffers = useFeatureFlag('adminXOffers');

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Growth'>
            {hasRecommendations && <Recommendations keywords={searchKeywords.recommendations} />}
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasOffers && <Offers keywords={searchKeywords.offers} />}
            {hasTipsAndDonations && <TipsOrDonations keywords={searchKeywords.tips} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
