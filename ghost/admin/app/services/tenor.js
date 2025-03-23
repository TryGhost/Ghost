import Service from '@ember/service';
import fetch from 'fetch';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isEmpty} from '@ember/utils';
import {task, taskGroup, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const API_URL = 'https://tenor.googleapis.com';
const API_VERSION = 'v2';
const DEBOUNCE_MS = 600;

export default class TenorService extends Service {
    @inject config;

    @tracked columnCount = 4;
    @tracked columns = null;
    @tracked error = null;
    @tracked htmlError = null;
    @tracked gifs = new TrackedArray([]);
    @tracked searchTerm = '';
    @tracked loadedType = '';

    _columnHeights = [];
    _nextPos = null;

    get apiKey() {
        return this.config.tenor.googleApiKey;
    }

    get contentfilter() {
        return this.config.tenor.contentFilter || 'off';
    }

    get isLoading() {
        return this.searchTask.isRunning || this.loadingTasks.isRunning;
    }

    constructor() {
        super(...arguments);
        this._resetColumns();
    }

    @action
    updateSearch(term) {
        if (term === this.searchTerm) {
            return;
        }

        this.searchTerm = term;
        this.reset();

        if (term) {
            return this.searchTask.perform(term);
        } else {
            return this.loadTrendingTask.perform();
        }
    }

    @action
    loadNextPage() {
        // protect against scroll trigger firing when the gifs are reset
        if (this.searchTask.isRunning) {
            return;
        }

        if (isEmpty(this.gifs)) {
            return this.loadTrendingTask.perform();
        }

        if (this._nextPos !== null) {
            this.loadNextPageTask.perform();
        }
    }

    @action
    changeColumnCount(columnCount) {
        this.columnCount = columnCount;
        this._resetColumns();
    }

    @task({restartable: true})
    *searchTask(term) {
        yield timeout(DEBOUNCE_MS);

        this.loadedType = 'search';

        yield this._makeRequest(this.loadedType, {params: {
            q: term,
            media_filter: 'minimal'
        }});
    }

    @taskGroup loadingTasks;

    @task({group: 'loadingTasks'})
    *loadTrendingTask() {
        this.loadedType = 'featured';

        yield this._makeRequest(this.loadedType, {params: {
            q: 'excited',
            media_filter: 'minimal'
        }});
    }

    @task({group: 'loadingTasks'})
    *loadNextPageTask() {
        const params = {
            pos: this._nextPos,
            media_filter: 'minimal'
        };

        if (this.loadedType === 'search') {
            params.q = this.searchTerm;
        }

        yield this._makeRequest(this.loadedType, {params});
    }

    @task({group: 'loadingTasks'})
    *retryLastRequestTask() {
        if (this._lastRequestArgs) {
            yield this._makeRequest(...this._lastRequestArgs);
        }
    }

    reset() {
        this.gifs = new TrackedArray([]);
        this._nextPos = null;
        this._resetColumns();
    }

    async _makeRequest(path, options) {
        const versionedPath = `${API_VERSION}/${path}`.replace(/\/+/, '/');
        const url = new URL(versionedPath, API_URL);

        const params = new URLSearchParams(options.params);
        params.set('key', this.apiKey);
        params.set('client_key', 'ghost-editor');
        params.set('contentfilter', this.contentfilter);

        url.search = params.toString();

        // store the url so it can be retried if needed
        this._lastRequestArgs = arguments;

        this.error = '';

        return fetch(url)
            .then(response => this._checkStatus(response))
            .then(response => response.json())
            .then(response => this._extractPagination(response))
            .then(response => this._addGifsFromResponse(response))
            .catch((e) => {
                // if the error text isn't already set then we've get a connection error from `fetch`
                if (!options.ignoreErrors && !this.error) {
                    this.error = 'Uh-oh! Trouble reaching the Tenor API, please check your connection';
                }

                if (this.error && this.error.startsWith('API key not valid')) {
                    // Added an html error field, so that we don't pass raw API errors from tenor to triple-braces in the frontend
                    this.htmlError = `This version of the Tenor API is no longer supported. Please update your API key by following our
<a href="https://ghost.org/docs/config/#tenor" target="_blank" rel="noopener noreferrer"> documentation here</a>.<br />`;
                }
                console.error(e); // eslint-disable-line
            });
    }

    async _checkStatus(response) {
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

        this.error = responseText;

        const error = new Error(responseText);
        error.response = response;
        throw error;
    }

    async _extractPagination(response) {
        this._nextPos = response.next;
        return response;
    }

    async _addGifsFromResponse(response) {
        const gifs = response.results;
        gifs.forEach(gif => this._addGif(gif));

        return response;
    }

    _addGif(gif) {
        // re-calculate ratio for later use
        const [width, height] = gif.media_formats.tinygif.dims;
        gif.ratio = height / width;

        // add to general gifs list
        this.gifs.push(gif);

        // store index for use in templates and keyboard nav
        gif.index = this.gifs.indexOf(gif);

        // add to least populated column
        this._addGifToColumns(gif);
    }

    _addGifToColumns(gif) {
        const min = Math.min(...this._columnHeights);
        const columnIndex = this._columnHeights.indexOf(min);

        // use a fixed width when calculating height to compensate for different overall sizes
        this._columnHeights[columnIndex] += 300 * gif.ratio;
        this.columns[columnIndex].push(gif);

        // store the column indexes on the gif for use in keyboard nav
        gif.columnIndex = columnIndex;
        gif.columnRowIndex = this.columns[columnIndex].length - 1;
    }

    _resetColumns() {
        let columns = new TrackedArray([]);
        let _columnHeights = [];

        // pre-fill column arrays based on columnCount
        for (let i = 0; i < this.columnCount; i += 1) {
            columns[i] = new TrackedArray([]);
            _columnHeights[i] = 0;
        }

        this.columns = columns;
        this._columnHeights = _columnHeights;

        if (!isEmpty(this.gifs)) {
            this.gifs.forEach((gif) => {
                this._addGifToColumns(gif);
            });
        }
    }
}
