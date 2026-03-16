import debounce from 'lodash/debounce';
import {useRef, useState} from 'react';

const API_VERSION = 'v2';
const DEBOUNCE_MS = 600;

// Both Tenor and Klipy expose a Tenor-compatible v2 API; only the base URL and
// API key differ, so one client serves either provider.
const PROVIDER_API_URLS = {
    klipy: 'https://api.klipy.com',
    tenor: 'https://tenor.googleapis.com'
};

export const ERROR_TYPE = {
    COMMON: 'common',
    INVALID_API_KEY: 'invalid_key'
};

// Resolve which GIF provider to use from the editor's cardConfig. Klipy takes
// precedence when both are configured; returns null when neither is set.
export function getGifProviderConfig(cardConfig) {
    if (cardConfig?.klipy?.apiKey) {
        return {
            provider: 'klipy',
            apiUrl: PROVIDER_API_URLS.klipy,
            apiKey: cardConfig.klipy.apiKey,
            contentFilter: cardConfig.klipy.contentFilter || 'off'
        };
    }
    if (cardConfig?.tenor?.googleApiKey) {
        return {
            provider: 'tenor',
            apiUrl: PROVIDER_API_URLS.tenor,
            apiKey: cardConfig.tenor.googleApiKey,
            contentFilter: cardConfig.tenor.contentFilter || 'off'
        };
    }
    return null;
}

// Tenor returns {error: {message}}; Klipy returns {result: false, errors: {message: [...]}}.
export function extractErrorMessage(json) {
    const klipyMessage = json?.errors?.message;
    return json?.error?.message
        || json?.error
        || (Array.isArray(klipyMessage) ? klipyMessage[0] : klipyMessage)
        || 'Unknown error';
}

// Detect an invalid-API-key error from the provider's message. Tenor and Klipy
// word these differently (Tenor: "API key not valid"; Klipy: "The provided API
// key is invalid"), so match the phrasing they share.
export function isInvalidKeyError(message) {
    const text = message || '';
    return /api key/i.test(text) && /(invalid|not valid)/i.test(text);
}

export function useGif({config}) {
    const [columns, setColumns] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setLoading] = useState(false);
    const [isLazyLoading, setLazyLoading] = useState(false);
    const [gifs, setGifs] = useState([]);

    // useRef const for internal calculations
    const nextPos = useRef(null);
    const loadedType = useRef('');
    const columnHeights = useRef([]);
    const lastRequestArgs = useRef(null);
    const searchTerm = useRef('');
    const columnCount = useRef(4);
    // There are a lot of calculations for columns/gifs, and there is no need to update the state every time.
    // Use this const for computations; once everything is ready, update columns/gifs state for external usage.
    const internalStateColumns = useRef([]);
    const internalStateGifs = useRef([]);

    function search(term) {
        searchTerm.current = term;
        reset();

        if (term) {
            return searchTask(term);
        } else {
            return loadTrendingGifs(term);
        }
    }

    const updateSearch = debounce((term = '') => search(term), DEBOUNCE_MS);

    async function searchTask(term) {
        loadedType.current = 'search';

        await makeRequest(loadedType.current, {params: {
            q: term,
            media_filter: 'tinygif,gif'
        }});
    }

    async function loadTrendingGifs() {
        loadedType.current = 'featured';

        await makeRequest(loadedType.current, {params: {
            q: 'excited',
            media_filter: 'tinygif,gif'
        }});
    }

    function reset() {
        internalStateGifs.current = [];
        nextPos.current = null;
        resetColumns();
    }

    function resetColumns() {
        let newColumns = [];
        let newColumnHeights = [];

        // pre-fill column arrays based on columnCount
        for (let i = 0; i < columnCount.current; i += 1) {
            newColumns[i] = [];
            newColumnHeights[i] = 0;
        }

        internalStateColumns.current = newColumns;
        columnHeights.current = newColumnHeights;

        if (internalStateGifs.current.length) {
            adjustToNewColumnCount();
        }
    }

    function adjustToNewColumnCount() {
        internalStateGifs.current.forEach((gif) => {
            addGifToColumns(gif);
        });
    }

    function addGifToColumns(gif) {
        const min = Math.min(...columnHeights.current);
        const columnIndex = columnHeights.current.indexOf(min);

        // use a fixed width when calculating height to compensate for different overall sizes
        columnHeights.current[columnIndex] += 300 * gif.ratio;
        internalStateColumns.current[columnIndex].push(gif);

        // store the column indexes on the gif for use in keyboard nav
        gif.columnIndex = columnIndex;
        gif.columnRowIndex = internalStateColumns.current[columnIndex].length - 1;
    }

    function addGif(gif, gifIndex) {
        // re-calculate ratio for later use
        const [width, height] = gif.media_formats.tinygif.dims;
        gif.ratio = height / width;

        // add to general gifs list
        internalStateGifs.current.push(gif);

        // store index for use in templates and keyboard nav
        gif.index = gifIndex;

        // add to least populated column
        addGifToColumns(gif);
    }

    async function makeRequest(path, options) {
        const versionedPath = `${API_VERSION}/${path}`.replace(/\/+/, '/');
        const url = new URL(versionedPath, config.apiUrl);

        const params = new URLSearchParams(options.params);
        params.set('key', config.apiKey);
        params.set('client_key', 'ghost-editor');
        params.set('contentfilter', getContentFilter());

        url.search = params.toString();

        // store the url so it can be retried if needed
        lastRequestArgs.current = arguments;

        setError(null);
        setLoading(true);

        return fetch(url)
            .then(response => checkStatus(response))
            .then(response => response.json())
            .then(response => extractPagination(response))
            .then(response => addGifsFromResponse(response))
            .then(() => {
                setColumns(internalStateColumns.current);
                setGifs(internalStateGifs.current);
            })
            .catch((e) => {
                // e.message is the provider's error text (from checkStatus) or a
                // fetch connection error.
                if (!options.ignoreErrors) {
                    setError(isInvalidKeyError(e?.message) ? ERROR_TYPE.INVALID_API_KEY : ERROR_TYPE.COMMON);
                }
                console.error(e);
            })
            .finally(() => {
                setLoading(false);
                setLazyLoading(false);
            });
    }

    async function checkStatus(response) {
        // successful request
        if (response.status >= 200 && response.status < 300) {
            return response;
        }

        let responseText;

        if (response.headers.map['content-type'].startsWith('application/json')) {
            responseText = await response.json().then(json => extractErrorMessage(json));
        } else if (response.headers.map['content-type'] === 'text/xml') {
            responseText = await response.text();
        }

        setError(responseText);

        const responseError = new Error(responseText);
        responseError.response = response;
        throw responseError;
    }

    async function extractPagination(response) {
        nextPos.current = response.next;
        return response;
    }

    async function addGifsFromResponse(response) {
        const newGifs = response.results;
        newGifs.forEach((gif, index) => addGif(gif, index));

        return response;
    }

    function loadNextPage() {
        // protect against scroll trigger firing when the gifs are reset
        if (isLoading) {
            return;
        }

        if (!internalStateGifs.current.length) {
            return loadTrendingGifs();
        }

        if (nextPos.current !== null) {
            const params = {
                pos: nextPos.current,
                media_filter: 'tinygif,gif'
            };

            if (loadedType.current === 'search') {
                params.q = searchTerm.current;
            }

            setLazyLoading(true);

            return makeRequest(loadedType.current, {params});
        }
    }

    function getContentFilter() {
        return config.contentFilter || 'off';
    }

    function changeColumnCount(count) {
        columnCount.current = count;
        resetColumns();
        setColumns(internalStateColumns.current);
    }

    return {
        updateSearch,
        isLoading,
        isLazyLoading,
        error,
        loadNextPage,
        columns,
        changeColumnCount,
        gifs
    };
}
