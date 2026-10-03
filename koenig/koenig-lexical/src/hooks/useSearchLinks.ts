import EarthIcon from '../assets/icons/kg-earth.svg?react';
import React from 'react';
import debounce from 'lodash/debounce';

const DEBOUNCE_MS = 100;
const URL_QUERY_REGEX = /^http|^#|^\/|^mailto:|^tel:/;

function urlQueryOptions(query) {
    return [{
        label: 'Link to web page',
        items: [{
            label: query,
            value: query,
            Icon: EarthIcon,
            highlight: false,
            type: 'url'
        }]
    }];
}

function defaultNoResultOptions(query) {
    return [{
        label: 'Link to web page',
        items: [{
            label: `Enter URL to create link`,
            value: null,
            Icon: EarthIcon,
            highlight: false,
            type: 'no-results'
        }]
    }];
}

function convertSearchResultsToListOptions(results, {noResultOptions, type} = {}) {
    if (!results || !results.length) {
        return (noResultOptions || defaultNoResultOptions)();
    }

    return results.map((result) => {
        const items = result.items.map((item) => {
            return {
                label: item.title,
                value: item.url,
                Icon: item.Icon,
                metaText: item.metaText,
                MetaIcon: item.MetaIcon,
                metaIconTitle: item.metaIconTitle,
                type: type || 'internal'
            };
        });

        return {...result, items};
    });
}

export const useSearchLinks = (query, searchLinks, {noResultOptions} = {}) => {
    const [defaultListOptions, setDefaultListOptions] = React.useState([]);
    const [listOptions, setListOptions] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const searchGeneration = React.useRef(0);

    const search = React.useMemo(() => {
        return async function _search(term) {
            const generation = ++searchGeneration.current;
            if (URL_QUERY_REGEX.test(term)) {
                setListOptions(urlQueryOptions(term));
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            const results = await searchLinks(term);

            // can return undefined if the search was cancelled, avoid updating
            // in that scenario because we can end up in a race condition where
            // we overwrite the results with an empty array whilst still waiting
            // for a later search to complete. Avoids flashing of "no results".
            if (results === undefined || generation !== searchGeneration.current) {
                return;
            }

            setListOptions(convertSearchResultsToListOptions(results, {noResultOptions}));
            setIsSearching(false);
        };
    }, [searchLinks, noResultOptions]);

    const debouncedSearch = React.useMemo(() => {
        return debounce(search, DEBOUNCE_MS);
    }, [search]);

    // Fetch default search results when first rendering
    React.useEffect(() => {
        const fetchDefaultOptions = async () => {
            // if we have a query we don't want to show the searching state but
            // we still want to load the default options in the background so
            // they're available when the query is cleared
            !query && setIsSearching(true);
            const results = await searchLinks();
            setDefaultListOptions(convertSearchResultsToListOptions(results, {type: 'default'}));
            !query && setIsSearching(false);
        };

        fetchDefaultOptions().catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        // perform a non-debounced search if the query is a URL so the
        // "Link to web page" option updates more responsively
        if (URL_QUERY_REGEX.test(query)) {
            debouncedSearch.cancel();
            search(query);
        } else {
            debouncedSearch(query);
        }

        return () => {
            debouncedSearch.cancel();
            searchGeneration.current += 1;
        };
    }, [query, search, debouncedSearch]);

    // URL options must follow the input in the same render: the keyboard
    // selection listener can consume Enter before the search effect runs.
    const isUrlQuery = URL_QUERY_REGEX.test(query);
    const displayedListOptions = isUrlQuery ? urlQueryOptions(query) : (query ? listOptions : defaultListOptions);

    return {
        isSearching: isUrlQuery ? false : isSearching,
        listOptions: displayedListOptions
    };
};
