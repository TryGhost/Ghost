import { DefaultHeaderTypes, Photo } from '../UnsplashTypes';
import { IUnsplashProvider } from './IUnsplashProvider';
export declare class UnsplashProvider implements IUnsplashProvider {
    API_URL: string;
    HEADERS: DefaultHeaderTypes;
    ERROR: string | null;
    PAGINATION: {
        [key: string]: string;
    };
    REQUEST_IS_RUNNING: boolean;
    SEARCH_IS_RUNNING: boolean;
    LAST_REQUEST_URL: string;
    IS_LOADING: boolean;
    constructor(HEADERS: DefaultHeaderTypes);
    private makeRequest;
    private extractPagination;
    fetchPhotos(): Promise<Photo[]>;
    fetchNextPage(): Promise<Photo[] | null>;
    searchPhotos(term: string): Promise<Photo[]>;
    triggerDownload(photo: Photo): Promise<void>;
    private checkStatus;
    searchIsRunning(): boolean;
}
