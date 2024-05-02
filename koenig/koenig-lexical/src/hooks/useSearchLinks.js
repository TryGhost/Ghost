import React from 'react';
import debounce from 'lodash/debounce';

const DEBOUNCE_MS = 200;
const IGNORE_QUERY_REGEX = /^http/;

function convertSearchResultsToListOptions(results) {
    return results.map((result) => {
        const items = result.items.map((item) => {
            return {
                label: item.title,
                value: item.url
            };
        });

        return {...result, items};
    });
}

export const useSearchLinks = (query, searchLinks) => {
    const [defaultListOptions, setDefaultListOptions] = React.useState([]);
    const [listOptions, setListOptions] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);

    const debouncedSearch = React.useMemo(() => {
        return debounce(async (term) => {
            setIsSearching(true);
            const results = await searchLinks(term);
            setListOptions(convertSearchResultsToListOptions(results));
            setIsSearching(false);
        }, DEBOUNCE_MS);
    }, [searchLinks]);

    // Fetch default search results when first rendering
    React.useEffect(() => {
        if (IGNORE_QUERY_REGEX.test(query)) {
            return;
        }

        const fetchDefaultOptions = async () => {
            setIsSearching(true);
            const results = await searchLinks();
            setDefaultListOptions(convertSearchResultsToListOptions(results));
            setIsSearching(false);
        };

        fetchDefaultOptions().catch(console.error); // eslint-disable-line no-console
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (IGNORE_QUERY_REGEX.test(query)) {
            setListOptions([]);
        } else {
            debouncedSearch(query);
        }
    }, [query, debouncedSearch]);

    const displayedListOptions = query ? listOptions : defaultListOptions;

    return {
        isSearching,
        listOptions: displayedListOptions
    };
};
