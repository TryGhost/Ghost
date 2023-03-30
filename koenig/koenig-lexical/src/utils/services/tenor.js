import {debounce} from 'lodash';
import {useRef, useState} from 'react';

const API_URL = 'https://tenor.googleapis.com';
const API_VERSION = 'v2';
const DEBOUNCE_MS = 600;

export const ERROR_TYPE = {
    COMMON: 'common',
    INVALID_API_KEY: 'invalid_key'
};

export function useTenor({config}) {
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
            media_filter: 'minimal'
        }});
    }

    async function loadTrendingGifs() {
        loadedType.current = 'featured';

        await makeRequest(loadedType.current, {params: {
            q: 'excited',
            media_filter: 'minimal'
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
        const url = new URL(versionedPath, API_URL);

        const params = new URLSearchParams(options.params);
        params.set('key', config.googleApiKey);
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
                // if the error text isn't already set then we've get a connection error from `fetch`
                if (!options.ignoreErrors && !error) {
                    setError(ERROR_TYPE.COMMON);
                }

                if (error && error.startsWith('API key not valid')) {
                    setError(ERROR_TYPE.INVALID_API_KEY);
                }
                console.error(e); // eslint-disable-line
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
            responseText = await response.json().then(json => json.error.message || json.error);
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
                media_filter: 'minimal'
            };

            if (loadedType.current === 'search') {
                params.q = searchTerm;
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
