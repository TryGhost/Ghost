import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Explore from './Explore';
import Network from './Network';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import TipsAndDonations from './TipsAndDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords5x = {
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions'],
    tips: ['growth', 'tips', 'donations', 'one time', 'payment']
};

export const searchKeywords = {
    network: ['growth', 'network', 'activitypub', 'blog', 'fediverse', 'sharing'],
    explore: ['ghost explore', 'explore', 'growth', 'share', 'list', 'listing'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions']
};

const GrowthSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const [hasTipsAndDonations] = getSettingValues(settings, ['donations_enabled']) as [boolean];
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const ui60 = useFeatureFlag('ui60');

    if (!ui60) {
        return (
            <SearchableSection keywords={Object.values(searchKeywords5x).flat()} title='Growth'>
                <Recommendations keywords={searchKeywords5x.recommendations} />
                <EmbedSignupForm keywords={searchKeywords5x.embedSignupForm} />
                {hasStripeEnabled && <Offers keywords={searchKeywords5x.offers} />}
                {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonations keywords={searchKeywords5x.tips} />}
            </SearchableSection>
        );
    }

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Growth'>
            <Network keywords={searchKeywords.network} />
            <Explore keywords={searchKeywords.explore} />
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
