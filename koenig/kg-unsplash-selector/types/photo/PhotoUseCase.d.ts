import { InMemoryUnsplashProvider } from '../api/InMemoryUnsplashProvider';
import { Photo } from '../UnsplashTypes';
import { UnsplashProvider } from '../api/UnsplashProvider';
export declare class PhotoUseCases {
    private _provider;
    constructor(provider: UnsplashProvider | InMemoryUnsplashProvider);
    fetchPhotos(): Promise<Photo[]>;
    searchPhotos(term: string): Promise<Photo[]>;
    triggerDownload(photo: Photo): Promise<void>;
    fetchNextPage(): Promise<Photo[] | null>;
    searchIsRunning(): boolean;
}
