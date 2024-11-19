import {useMemo} from 'react';
import {useSuggestedProfiles as useSuggestedProfilesQuery} from '../hooks/useActivityPubQueries';

export const SUGGESTED_HANDLES = [
    '@index@activitypub.ghost.org',
    '@index@john.onolan.org',
    '@index@www.coffeeandcomplexity.com',
    '@index@ghost.codenamejimmy.com',
    '@index@www.syphoncontinuity.com',
    '@index@www.cosmico.org',
    '@index@silverhuang.com'
];

const useSuggestedProfiles = (limit = 3) => {
    const handles = useMemo(() => {
        return SUGGESTED_HANDLES
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);
    }, [limit]);

    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesQuery('index', handles);
    const {data: suggested = [], isLoading: isLoadingSuggested} = suggestedProfilesQuery;

    return {suggested, isLoadingSuggested, updateSuggestedProfile};
};

export default useSuggestedProfiles;
