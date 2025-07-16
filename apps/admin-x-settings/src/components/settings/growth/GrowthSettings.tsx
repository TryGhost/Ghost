import EmbedSignupForm from './embedSignup/EmbedSignupForm';
import Explore from './Explore';
import Network from './Network';
import Offers from './Offers';
import React from 'react';
import Recommendations from './Recommendations';
import SearchableSection from '../../SearchableSection';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords = {
    network: ['growth', 'network', 'activitypub', 'blog', 'fediverse', 'sharing'],
    explore: ['ghost explore', 'explore', 'growth', 'share', 'list', 'listing'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions']
};

const GrowthSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

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
