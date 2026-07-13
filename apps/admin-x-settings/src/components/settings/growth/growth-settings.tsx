import EmbedSignupForm from './embed-signup/embed-signup-form';
import Explore from './explore';
import Network from './network';
import Offers from './offers';
import Paywalls from './paywalls';
import React from 'react';
import Recommendations from './recommendations';
import SearchableSection from '../../searchable-section';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    network: ['growth', 'network', 'activitypub', 'blog', 'fediverse', 'sharing'],
    explore: ['ghost explore', 'explore', 'growth', 'share', 'list', 'listing'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions'],
    paywalls: ['growth', 'paywalls', 'paywall', 'gated content', 'gating', 'call to action', 'cta', 'upgrade', 'subscribe']
};

const GrowthSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const visibleSearchKeywords = [
        searchKeywords.network,
        searchKeywords.explore,
        searchKeywords.recommendations,
        searchKeywords.embedSignupForm,
        searchKeywords.paywalls,
        ...(hasStripeEnabled ? [searchKeywords.offers] : [])
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Growth'>
            <Network keywords={searchKeywords.network} />
            <Explore keywords={searchKeywords.explore} />
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            <Paywalls keywords={searchKeywords.paywalls} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
