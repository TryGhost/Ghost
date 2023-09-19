import MasonryLayout from './MasonryService';
import {DefaultHeaderTypes, Photo, UnsplashAPIOutput} from './UnsplashTypes'; // Import types

const masonry = new MasonryLayout(3);

class UnsplashService {
    API_URL: string;
    HEADERS: DefaultHeaderTypes;
    photos: Photo[];
    _pagination: { [key: string]: string } = {};
    page: number;
    error: string | null;
    search_is_running: boolean;
    request_is_running: boolean;
    search_term: string;
    _lastRequestUrl: string;
    isLoading: boolean;

    constructor({API_URL, HEADERS}: {API_URL?: string, HEADERS: DefaultHeaderTypes}) {
        this.API_URL = API_URL || 'https://api.unsplash.com';
        this.HEADERS = HEADERS;
        this.photos = [];
        this._pagination = {};
        this.page = 1;
        this.error = null;
        this.search_is_running = false;
        this.request_is_running = false;
        this.search_term = '';
        this._lastRequestUrl = '';
        this.isLoading = false;
    }

    private extractPagination(response: Response): Response {
        let linkRegex = new RegExp('<(.*)>; rel="(.*)"');

        let links = [];

        let pagination : { [key: string]: string } = {};

        for (let entry of response.headers.entries()) {
            if (entry[0] === 'link') {
                links.push(entry[1]);
            }
        }

        if (links) {
            links.toString().split(',').forEach((link) => {
                if (link){
                    let linkParts = linkRegex.exec(link);
                    if (linkParts) {
                        pagination[linkParts[2]] = linkParts[1];
                    }
                }
            });
        }

        this._pagination = pagination;

        return response;
    }

    private async checkStatus(response: Response): Promise<Response> {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
    
        let errorText = '';
        let responseTextPromise: Promise<any>; // or Promise<string> if you know the type
    
        const contentType = response.headers.get('content-type');
        if (contentType === 'application/json') {
            responseTextPromise = response.json().then(json => (json as any).errors[0]); // or cast to a specific type if you know it
        } else if (contentType === 'text/xml') {
            responseTextPromise = response.text();
        } else {
            throw new Error('Unsupported content type');
        }
    
        return responseTextPromise.then((responseText: string) => { // you can type responseText based on what you expect
            if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
                // we've hit the rate limit on the API
                errorText = 'Unsplash API rate limit reached, please try again later.';
            }
    
            errorText = errorText || responseText || `Error ${response.status}: Uh-oh! Trouble reaching the Unsplash API`;
    
            // set error text for display in UI
            this.error = errorText;
    
            // throw error to prevent further processing
            let error = new Error(errorText) as any; // or create a custom Error class
            error.response = response;
            throw error;
        });
    }

    private async makeRequest(url: string): Promise<UnsplashAPIOutput | null > {
        if (this.request_is_running) {
            return null;
        }
        this._lastRequestUrl = url;

        const options = {
            method: 'GET',
            headers: this.HEADERS as unknown as HeadersInit
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

    public async loadNew(): Promise<void> {
        this.reset();
        const url = `${this.API_URL}/photos?per_page=30`;
        const response = await this.makeRequest(url);
        if (response) {
            await this.addPhotosFromResponse(response);
        }
    }

    private async addPhotosFromResponse(response: UnsplashAPIOutput): Promise<void> {
        let photos = response.results || response;
        photos.forEach((photo) => {
            this.addPhoto(photo);
        });
    }

    private async addPhoto(photo: Photo): Promise<void> {
        photo.ratio = photo.width / photo.height;
        this.photos.push(photo);
        masonry.addPhotoToColumns(photo);
    }

    public async loadNextPage(): Promise<void> {
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
            if (response) {
                this.addPhotosFromResponse(response);
            }
        }
    }

    public async updateSearch(term: string): Promise<void> {
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

    public async search(term: string): Promise<void> {
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

    public triggerDownload(photo: Photo): void {
        if (photo.links.download_location) {
            this.makeRequest(photo.links.download_location);
        }
    }

    public getPhotos(): Photo[] {
        return this.photos;
    }

    public clearPhotos(): void {
        this.photos = [];
    }

    public getColumns(): Photo[][] | [] {
        let columns = masonry.getColumns();

        if (columns) {
            return columns;
        } else {
            return [];
        }
    }

    public reset(): void {
        this.clearPhotos();
        masonry.reset();
        this._pagination = {};
    }

    public setSearchTerm(term: string): void {
        this.search_term = term;
    }

    public searchIsRunning(): boolean {
        return this.search_is_running;
    }
}

export default UnsplashService;
