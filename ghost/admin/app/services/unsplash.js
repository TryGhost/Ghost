import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import {assign} from '@ember/polyfills';
import {isEmpty} from '@ember/utils';
import {or} from '@ember/object/computed';
import {reject, resolve} from 'rsvp';
import {task, taskGroup, timeout} from 'ember-concurrency';

const API_URL = 'https://api.unsplash.com';
const API_VERSION = 'v1';
const DEBOUNCE_MS = 600;

export default Service.extend({
    config: service(),
    settings: service(),

    columnCount: 3,
    columns: null,
    error: '',
    photos: null,
    searchTerm: '',

    _columnHeights: null,
    _pagination: null,

    applicationId: '8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980',
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

    // let Unsplash know that the photo was inserted
    // https://medium.com/unsplash/unsplash-api-guidelines-triggering-a-download-c39b24e99e02
    triggerDownload(photo) {
        if (photo.links.download_location) {
            this._makeRequest(photo.links.download_location, {ignoreErrors: true});
        }
    },

    actions: {
        updateSearch(term) {
            return this.updateSearch(term);
        }
    },

    _loadingTasks: taskGroup().drop(),

    _loadNew: task(function* () {
        let url = `${API_URL}/photos?per_page=30`;
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

        let url = `${API_URL}/search/photos?query=${term}&per_page=30`;
        yield this._makeRequest(url);
    }).restartable(),

    _addPhotosFromResponse(response) {
        let photos = response.results || response;

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

        headers.Authorization = `Client-ID ${this.applicationId}`;
        headers['Accept-Version'] = API_VERSION;
        headers['App-Pragma'] = 'no-cache';
        headers['X-Unsplash-Cache'] = true;

        return fetch(url, {headers})
            .then(response => this._checkStatus(response))
            .then(response => this._extractPagination(response))
            .then(response => response.json())
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
                errorText = 'Unsplash API rate limit reached, please try again later.';
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
        let pagination = {};
        let linkRegex = new RegExp('<(.*)>; rel="(.*)"');
        let {link: links} = response.headers.map;

        if (links) {
            links.split(',').forEach((link) => {
                let [, url, rel] = linkRegex.exec(link);

                pagination[rel] = url;
            });
        }

        this._pagination = pagination;

        return response;
    }
});
