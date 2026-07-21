import debounce from 'lodash/debounce';
import {useRef, useState} from 'react';

const API_VERSION = 'v2';
const DEBOUNCE_MS = 600;

// Klipy exposes a Tenor-compatible v2 API, hence the v2 paths and
// Tenor-style request params used throughout this client.
const KLIPY_API_URL = 'https://api.klipy.com';

export const ERROR_TYPE = {
    COMMON: 'common',
    INVALID_API_KEY: 'invalid_key'
};

interface GifItem {
    media_formats: {tinygif: {dims: [number, number]}};
    ratio: number;
    columnIndex: number;
    columnRowIndex: number;
    index: number;
    [key: string]: unknown;
}

interface GifCardConfig {
    klipy?: {apiKey?: string; contentFilter?: string} | null;
    [key: string]: unknown;
}

interface GifProviderConfig {
    apiUrl: string;
    apiKey: string;
    contentFilter: string;
}

interface MakeRequestOptions {
    params: Record<string, string>;
    ignoreErrors?: boolean;
}

// Resolve the GIF provider config from the editor's cardConfig; returns null
// when Klipy is not configured.
export function getGifProviderConfig(cardConfig: GifCardConfig | null | undefined): GifProviderConfig | null {
    if (cardConfig?.klipy?.apiKey) {
        return {
            apiUrl: KLIPY_API_URL,
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            apiKey: cardConfig.klipy.apiKey,
            contentFilter: cardConfig.klipy.contentFilter || 'off'
        };
    }
    return null;
}

// Klipy returns {result: false, errors: {message: [...]}}.
export function extractErrorMessage(json: {errors?: {message?: string | string[]}; [key: string]: unknown}): string {
    const message = json?.errors?.message;
    return (Array.isArray(message) ? message[0] : message)
        || 'Unknown error';
}

// Detect an invalid-API-key error from the provider's message ("The provided
// API key is invalid"), matched loosely to tolerate wording changes.
export function isInvalidKeyError(message?: string): boolean {
    const text = message || '';
    return /api key/i.test(text) && /(invalid|not valid)/i.test(text);
}

export function useGif({config}: {config: GifProviderConfig}) {
    const [columns, setColumns] = useState<GifItem[][]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setLoading] = useState(false);
    const [isLazyLoading, setLazyLoading] = useState(false);
    const [gifs, setGifs] = useState<GifItem[]>([]);

    // useRef const for internal calculations
    const nextPos = useRef<string | null>(null);
    const loadedType = useRef('');
    const columnHeights = useRef<number[]>([]);
    const searchTerm = useRef('');
    const columnCount = useRef(4);
    // There are a lot of calculations for columns/gifs, and there is no need to update the state every time.
    // Use this const for computations; once everything is ready, update columns/gifs state for external usage.
    const internalStateColumns = useRef<GifItem[][]>([]);
    const internalStateGifs = useRef<GifItem[]>([]);

    function search(term: string) {
        searchTerm.current = term;
        reset();

        if (term) {
            return searchTask(term);
        } else {
            return loadTrendingGifs();
        }
    }

    const updateSearch = debounce((term = '') => search(term), DEBOUNCE_MS);

    async function searchTask(term: string) {
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
        const newColumns: GifItem[][] = [];
        const newColumnHeights: number[] = [];

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

    function addGifToColumns(gif: GifItem) {
        const min = Math.min(...columnHeights.current);
        const columnIndex = columnHeights.current.indexOf(min);

        // use a fixed width when calculating height to compensate for different overall sizes
        columnHeights.current[columnIndex] += 300 * gif.ratio;
        internalStateColumns.current[columnIndex].push(gif);

        // store the column indexes on the gif for use in keyboard nav
        gif.columnIndex = columnIndex;
        gif.columnRowIndex = internalStateColumns.current[columnIndex].length - 1;
    }

    function addGif(gif: GifItem, gifIndex: number) {
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

    async function makeRequest(path: string, options: MakeRequestOptions) {
        const versionedPath = `${API_VERSION}/${path}`.replace(/\/+/, '/');
        const url = new URL(versionedPath, config.apiUrl);

        const params = new URLSearchParams(options.params);
        params.set('key', config.apiKey);
        params.set('client_key', 'ghost-editor');
        params.set('contentfilter', getContentFilter());

        url.search = params.toString();

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

    async function checkStatus(response: Response): Promise<Response> {
        // successful request
        if (response.status >= 200 && response.status < 300) {
            return response;
        }

        let responseText: string | undefined;

        const contentType = response.headers.get('content-type');
        if (contentType?.startsWith('application/json')) {
            responseText = await response.json().then(json => extractErrorMessage(json));
        } else if (contentType === 'text/xml') {
            responseText = await response.text();
        }

        setError(responseText || null);

        const responseError = new Error(responseText) as Error & {response: Response};
        responseError.response = response;
        throw responseError;
    }

    async function extractPagination(response: {next?: string; results: GifItem[]}) {
        nextPos.current = response.next || null;
        return response;
    }

    async function addGifsFromResponse(response: {results: GifItem[]}) {
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
            const params: Record<string, string> = {
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

    function changeColumnCount(count: number) {
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
