import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import {assign} from '@ember/polyfills';
import {isEmpty} from '@ember/utils';
import {or} from '@ember/object/computed';
import {reject, resolve} from 'rsvp';
import {task, taskGroup, timeout} from 'ember-concurrency';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

const ON_PAGE = 30;
const DEBOUNCE_MS = 600;

export default Service.extend({
    settings: service(),

    columnCount: 3,
    columns: null,
    error: '',
    photos: null,
    searchTerm: '',

    _columnHeights: null,
    _pagination: null,

    isLoading: or('_search.isRunning', '_loadingTasks.isRunning'),

    init() {
        this._super(...arguments);
        this._reset();
        this.loadNew();
    },

    loadNew() {
        this._reset();
        return this._loadNew.perform();
    },

    loadNextPage() {
        // protect against scroll trigger firing when the photos are reset
        if (this.get('_search.isRunning')) {
            return;
        }

        if (isEmpty(this.photos)) {
            return this._loadNew.perform();
        }

        if (this._pagination.next) {
            return this._loadNextPage.perform();
        }

        // TODO: return error?
        return reject();
    },

    updateSearch(term) {
        if (term === this.searchTerm) {
            return;
        }

        this.set('searchTerm', term);
        this._reset();

        if (term) {
            return this._search.perform(term);
        } else {
            return this._loadNew.perform();
        }
    },

    retryLastRequest() {
        return this._retryLastRequest.perform();
    },

    changeColumnCount(newColumnCount) {
        if (newColumnCount !== this.columnCount) {
            this.set('columnCount', newColumnCount);
            this._resetColumns();
        }
    },

    actions: {
        updateSearch(term) {
            return this.updateSearch(term);
        }
    },

    _loadingTasks: taskGroup().drop(),

    _loadNew: task(function* () {
        let url = ghostPaths().url.api('media-library')+'?limit='+ON_PAGE;
        yield this._makeRequest(url);
    }).group('_loadingTasks'),

    _loadNextPage: task(function* () {
        yield this._makeRequest(this._pagination.next);
    }).group('_loadingTasks'),

    _retryLastRequest: task(function* () {
        yield this._makeRequest(this._lastRequestUrl);
    }).group('_loadingTasks'),

    _search: task(function* (term) {
        yield timeout(DEBOUNCE_MS);

        let url = ghostPaths().url.api('media-library')+'?limit='+ON_PAGE+'&filter=caption:~\''+term.replace(/'/g, "\\'")+'\'';
        yield this._makeRequest(url);
    }).restartable(),

    _addPhotosFromResponse(response) {
        let photos = response.media_library || response;

        photos.forEach(photo => this._addPhoto(photo));
    },

    _addPhoto(photo) {
        // pre-calculate ratio for later use
        photo.ratio = photo.height / photo.width;

        // add to general photo list
        this.photos.pushObject(photo);

        // add to least populated column
        this._addPhotoToColumns(photo);
    },

    _addPhotoToColumns(photo) {
        let min = Math.min(...this._columnHeights);
        let columnIndex = this._columnHeights.indexOf(min);

        // use a fixed width when calculating height to compensate for different
        // overall image sizes
        this._columnHeights[columnIndex] += 300 * photo.ratio;
        this.columns[columnIndex].pushObject(photo);
    },

    _reset() {
        this.set('photos', []);
        this._pagination = {};
        this._resetColumns();
    },

    _resetColumns() {
        let columns = [];
        let columnHeights = [];

        // pre-fill column arrays based on columnCount
        for (let i = 0; i < this.columnCount; i += 1) {
            columns[i] = [];
            columnHeights[i] = 0;
        }

        this.set('columns', columns);
        this._columnHeights = columnHeights;

        if (!isEmpty(this.photos)) {
            this.photos.forEach((photo) => {
                this._addPhotoToColumns(photo);
            });
        }
    },

    _makeRequest(url, _options = {}) {
        let defaultOptions = {ignoreErrors: false};
        let headers = {};
        let options = {};

        assign(options, defaultOptions, _options);

        // clear any previous error
        this.set('error', '');

        // store the url so it can be retried if needed
        this._lastRequestUrl = url;

        headers['App-Pragma'] = 'no-cache';

        return fetch(url, {headers})
            .then(response => this._checkStatus(response))
            .then(response => response.json())
            .then(response => this._extractPagination(response))
            .then(response => this._addPhotosFromResponse(response))
            .catch(() => {
                // if the error text isn't already set then we've get a connection error from `fetch`
                if (!options.ignoreErrors && !this.error) {
                    this.set('error', 'Uh-oh! Trouble reaching the Unsplash API, please check your connection');
                }
            });
    },

    _checkStatus(response) {
        // successful request
        if (response.status >= 200 && response.status < 300) {
            return resolve(response);
        }

        let errorText = '';
        let responseTextPromise = resolve();

        if (response.headers.map['content-type'] === 'application/json') {
            responseTextPromise = response.json().then(json => json.errors[0]);
        } else if (response.headers.map['content-type'] === 'text/xml') {
            responseTextPromise = response.text();
        }

        return responseTextPromise.then((responseText) => {
            if (response.status === 403 && response.headers.map['x-ratelimit-remaining'] === '0') {
                // we've hit the ratelimit on the API
                errorText = 'API rate limit reached, please try again later.';
            }

            errorText = errorText || responseText || `Error ${response.status}: Uh-oh! Trouble reaching the Unsplash API`;

            // set error text for display in UI
            this.set('error', errorText);

            // throw error to prevent further processing
            let error = new Error(errorText);
            error.response = response;
            throw error;
        });
    },

    _extractPagination(response) {
        let next = response.meta.pagination ? response.meta.pagination.next : null;

        let pagination = {};
        
        if (next) {
            pagination.next = ghostPaths().url.api('media-library')+'?limit='+ON_PAGE+'&page='+next;
        }

        this._pagination = pagination;

        return response;
    }
});