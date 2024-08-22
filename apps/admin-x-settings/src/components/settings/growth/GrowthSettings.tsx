import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import TipsAndDonations from './TipsAndDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords = {
    tips: ['growth', 'tips', 'donations', 'one time', 'payment'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions']
};

const GrowthSettings: React.FC = () => {
    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Growth'>
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
            {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonations keywords={searchKeywords.tips} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
