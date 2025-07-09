import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import TipsAndDonations from './TipsAndDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords5x = {
    network: ['network', 'social web', 'social', 'web', 'activitypub', 'activity pub', 'fediverse', 'federated'],
    tips: ['growth', 'tips', 'donations', 'one time', 'payment'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions']
};

export const searchKeywords = {
    network: ['network', 'social web', 'social', 'web', 'activitypub', 'activity pub', 'fediverse', 'federated'],
    explore: ['explore', 'web', 'social', 'web', 'growth', 'list'],
    tips: ['growth', 'tips', 'donations', 'one time', 'payment'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
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
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
