import EmbedSignupForm from './embed-signup/embed-signup-form';
import Explore from './explore';
import Network from './network';
import Offers from './offers';
import Paywalls from './paywalls';
import React from 'react';
import Recommendations from './recommendations';
import SearchableSection from '../../searchable-section';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    network: ['growth', 'network', 'activitypub', 'blog', 'fediverse', 'sharing'],
    explore: ['ghost explore', 'explore', 'growth', 'share', 'list', 'listing'],
    recommendations: ['growth', 'recommendations', 'recommend', 'blogroll'],
    embedSignupForm: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up'],
    offers: ['growth', 'offers', 'discounts', 'coupons', 'promotions'],
    paywalls: ['growth', 'paywalls', 'paywall', 'upgrade', 'gate', 'free preview', 'subscribers only']
};

const GrowthSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const hasPaywallV2 = useFeatureFlag('paywallV2');
    const visibleSearchKeywords = [
        searchKeywords.network,
        searchKeywords.explore,
        searchKeywords.recommendations,
        searchKeywords.embedSignupForm,
        ...(hasStripeEnabled ? [searchKeywords.offers] : []),
        ...(hasPaywallV2 ? [searchKeywords.paywalls] : [])
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Growth'>
            <Network keywords={searchKeywords.network} />
            <Explore keywords={searchKeywords.explore} />
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
            {hasPaywallV2 && <Paywalls keywords={searchKeywords.paywalls} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
