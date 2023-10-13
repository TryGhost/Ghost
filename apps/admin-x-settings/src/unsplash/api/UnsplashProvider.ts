import {DefaultHeaderTypes, Photo} from '../UnsplashTypes';

export class UnsplashProvider {
    API_URL: string = 'https://api.unsplash.com';
    HEADERS: DefaultHeaderTypes;
    ERROR: string | null = null;
    PAGINATION: { [key: string]: string } = {};
    REQUEST_IS_RUNNING: boolean = false;
    SEARCH_IS_RUNNING: boolean = false;
    LAST_REQUEST_URL: string = '';
    IS_LOADING: boolean = false;

    constructor(HEADERS: DefaultHeaderTypes) {
        this.HEADERS = HEADERS;
    }

    private async makeRequest(url: string): Promise<Photo[] | {results: Photo[]} | null> {
        if (this.REQUEST_IS_RUNNING) {
            return null;
        }
    
        this.LAST_REQUEST_URL = url;
        const options = {
            method: 'GET',
            headers: this.HEADERS as unknown as HeadersInit
        };
    
        try {
            this.REQUEST_IS_RUNNING = true;
            this.IS_LOADING = true;
    
            const response = await fetch(url, options);
            const checkedResponse = await this.checkStatus(response);
            this.extractPagination(checkedResponse);
    
            const jsonResponse = await checkedResponse.json();
            
            if ('results' in jsonResponse) {
                return jsonResponse.results;
            } else {
                return jsonResponse;
            }
        } catch (error) {
            this.ERROR = error as string;
            return null;
        } finally {
            this.REQUEST_IS_RUNNING = false;
            this.IS_LOADING = false;
        }
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

        this.PAGINATION = pagination;

        return response;
    }

    public async fetchPhotos(): Promise<Photo[]> {
        const url = `${this.API_URL}/photos?per_page=30`;
        const request = await this.makeRequest(url);
        return request as Photo[];
    }

    public async fetchNextPage(): Promise<Photo[] | null> {
        if (this.REQUEST_IS_RUNNING) {
            return null;
        }

        if (this.SEARCH_IS_RUNNING) {
            return null;
        }

        if (this.PAGINATION.next) {
            const url = `${this.PAGINATION.next}`;
            const response = await this.makeRequest(url);
            if (response) {
                return response as Photo[];
            }
        }

        return null;
    }

    public async searchPhotos(term: string): Promise<Photo[]> {
        const url = `${this.API_URL}/search/photos?query=${term}&per_page=30`;

        const request = await this.makeRequest(url);
        if (request) {
            return request as Photo[];
        }

        return [];
    }

    public async triggerDownload(photo: Photo): Promise<void> {
        if (photo.links.download_location) {
            await this.makeRequest(photo.links.download_location);
        }
    }

    private async checkStatus(response: Response): Promise<Response> {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
    
        let errorText = '';
        let responseTextPromise: Promise<string>; // or Promise<string> if you know the type
    
        const contentType = response.headers.get('content-type');
        if (contentType === 'application/json') {
            responseTextPromise = response.json().then(json => (json).errors[0]); // or cast to a specific type if you know it
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
            this.ERROR = errorText;
    
            // throw error to prevent further processing
            let error = new Error(errorText) as Error; // or create a custom Error class
            throw error;
        });
    }

    searchIsRunning(): boolean {
        return this.SEARCH_IS_RUNNING;
    }
}
