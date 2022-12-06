// API Service for Unsplash
// Reference https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/services/unsplash.js

// functions to write

// makeRequest
// loadNew
// loadNextPage
// search
// checkStatus
// extractPagination
// triggerDownload

import MasonryLayout from '../masonry';

const masonry = new MasonryLayout(3);

class UnsplashService {
    constructor({API_URL, HEADERS}) {
        this.API_URL = API_URL || 'https://api.unsplash.com';
        this.HEADERS = HEADERS;
        this.photos = [];
        this._pagination = [];
        this.page = 1;
        this.error = null;
        this.search_is_running = false;
        this.request_is_running = false;
        this.search_term = '';
        this._lastRequestUrl = '';
        this.isLoading = false;
    }

    extractPagination(response) {
        response = response || response.results;
        let pagination = {};
        let linkRegex = new RegExp('<(.*)>; rel="(.*)"');

        let links = [];
        for (let entry of response.headers.entries()) {
            if (entry[0] === 'link') {
                links.push(entry[1]);
            }
        }

        if (links) {
            links.toString().split(',').forEach((link) => {
                if (link){
                    let linkParts = linkRegex.exec(link);
                    pagination[linkParts[2]] = linkParts[1];
                }
            });
        }

        this._pagination = pagination;

        return response;
    }

    async checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
            return (response);
        }

        let errorText = '';
        let responseTextPromise;

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
            this.error = errorText;

            // throw error to prevent further processing
            let error = new Error(errorText);
            error.response = response;
            throw error;
        });
    }

    async makeRequest(url) {
        if (this.request_is_running) {
            return;
        }
        this._lastRequestUrl = url;

        const options = {
            method: 'GET',
            headers: this.HEADERS
        };
        this.request_is_running = true;
        this.isLoading = true;
        return await fetch(url, options)
            .then(response => this.checkStatus(response))
            .then(response => this.extractPagination(response))
            .then((response) => {
                this.request_is_running = false;
                return response.json();
            })
            .catch(error => this.error = error);
    }

    async loadNew() {
        this.reset();
        const url = `${this.API_URL}/photos?per_page=30`;
        const response = await this.makeRequest(url);
        await this.addPhotosFromResponse(response);
    }

    async addPhotosFromResponse(response) {
        let photos = response.results || response;
        photos.forEach((photo) => {
            this.addPhoto(photo);
        });
    }

    async addPhoto(photo) {
        photo.ratio = photo.width / photo.height;
        this.photos.push(photo);
        masonry.addPhotoToColumns(photo);
    }

    async loadNextPage() {
        if (this.request_is_running) {
            return;
        }
        if (this.search_is_running) {
            return;
        }
        if (this.photos.length === 0) {
            return;
        }
        if (this._pagination.next) {
            const url = `${this._pagination.next}`;
            const response = await this.makeRequest(url);
            this.addPhotosFromResponse(response);
        }
    }

    async updateSearch(term) {
        if (term === this.search_term) {
            return;
        }
        if (this.request_is_running) {
            return;
        }
        this.reset();
        this.search_term = term;
        if (term) {
            await this.search(term);
        } else {
            await this.loadNew();
        }
    }

    async search(term) {
        if (this.search_is_running !== true) {
            this.search_is_running = true;
            const url = `${this.API_URL}/search/photos?query=${term}&per_page=30`;
            const response = await this.makeRequest(url);
            if (response) {
                this.addPhotosFromResponse(response);
                this.search_is_running = false;
            }
        }
    }

    triggerDownload(photo) {
        if (photo.links.download_location) {
            this.makeRequest(photo.links.download_location);
        }
    }

    getPhotos() {
        return this.photos;
    }

    clearPhotos() {
        this.photos = [];
    }

    getColumns() {
        return masonry.getColumns();
    }

    reset() {
        this.clearPhotos();
        masonry.reset();
        this.pagination = [];
    }

    setSearchTerm(term) {
        this.search_term = term;
    }
}

export default UnsplashService;
