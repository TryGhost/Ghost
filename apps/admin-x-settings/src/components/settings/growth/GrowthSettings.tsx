import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import TipsOrDonations from './TipsOrDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import {searchKeywords} from '../membership/MembershipSettings';

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
