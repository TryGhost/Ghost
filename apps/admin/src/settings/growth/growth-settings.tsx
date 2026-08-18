import EmbedSignupForm from './embed-signup/embed-signup-form';
import Explore from './explore';
import Network from './network';
import Offers from './offers';
import React from 'react';
import Recommendations from './recommendations';
import SearchableSection from '@/settings/app/components/searchable-section';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {searchKeywords} from './search-keywords';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';

const GrowthSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const visibleSearchKeywords = [
        searchKeywords.network,
        searchKeywords.explore,
        searchKeywords.recommendations,
        searchKeywords.embedSignupForm,
        ...(hasStripeEnabled ? [searchKeywords.offers] : [])
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Growth'>
            <Network keywords={searchKeywords.network} />
            <Explore keywords={searchKeywords.explore} />
            <Recommendations keywords={searchKeywords.recommendations} />
            <EmbedSignupForm keywords={searchKeywords.embedSignupForm} />
            {hasStripeEnabled && <Offers keywords={searchKeywords.offers} />}
        </SearchableSection>
    );
};

export default GrowthSettings;
