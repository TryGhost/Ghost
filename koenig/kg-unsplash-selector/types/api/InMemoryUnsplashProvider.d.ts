import { IUnsplashProvider } from './IUnsplashProvider';
import { Photo } from '../UnsplashTypes';
export declare class InMemoryUnsplashProvider implements IUnsplashProvider {
    photos: Photo[];
    PAGINATION: {
        [key: string]: string;
    };
    REQUEST_IS_RUNNING: boolean;
    SEARCH_IS_RUNNING: boolean;
    LAST_REQUEST_URL: string;
    ERROR: string | null;
    IS_LOADING: boolean;
    currentPage: number;
    fetchPhotos(): Promise<Photo[]>;
    fetchNextPage(): Promise<Photo[] | null>;
    searchPhotos(term: string): Promise<Photo[]>;
    searchIsRunning(): boolean;
    triggerDownload(photo: Photo): void;
}
